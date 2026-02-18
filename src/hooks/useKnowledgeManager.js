// AI 학습 자료 관리 훅 — 교사 업로드 문서 CRUD (Firestore 목록 + Genkit 인덱싱)
import { useState, useEffect, useCallback } from 'react'
import { auth } from '../services/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import {
  getCollection,
  setDocument,
  deleteDocument,
} from '../services/firestore'
import { uploadTextDocument, uploadPdfDocument, sendChatMessage } from '../services/genkit'

// Firestore 쓰기에 타임아웃을 적용 (오프라인 시 무한 대기 방지)
function withTimeout(promise, ms = 10000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('네트워크 연결이 불안정합니다. 잠시 후 다시 시도해주세요.')), ms)
    ),
  ])
}

// AI 요약 생성 (Genkit chatFlow 활용, 실패 시 앞 100자 fallback)
async function generateSummary(content) {
  try {
    const result = await sendChatMessage({
      message: `다음 체육 수업 자료를 2-3문장으로 요약해주세요:\n\n${content.slice(0, 2000)}`,
      history: [],
      lessonContext: null,
    })
    return (result?.reply || result?.message || '').slice(0, 500)
  } catch {
    return content.slice(0, 100) + (content.length > 100 ? '...' : '')
  }
}

/**
 * useKnowledgeManager — 교사가 업로드한 AI 학습 자료를 관리
 *
 * Firestore 경로: /users/{uid}/knowledgeDocs/{docId}
 * Genkit flow: ingestDocumentFlow, uploadPdfFlow
 */
export function useKnowledgeManager() {
  const [uid, setUid] = useState(auth.currentUser?.uid || null)
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Auth state tracking
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid || null)
      if (!user) setDocuments([])
    })
    return () => unsubscribe()
  }, [])

  // Load document list from Firestore (8s timeout for offline resilience)
  const loadDocuments = useCallback(async () => {
    if (!uid) return
    setLoading(true)
    try {
      const docs = await withTimeout(getCollection(`users/${uid}/knowledgeDocs`), 8000)
      setDocuments(docs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)))
    } catch (err) {
      console.warn('[knowledge] Failed to load documents:', err.message)
    } finally {
      setLoading(false)
    }
  }, [uid])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  // Upload text document
  const uploadText = useCallback(
    async (title, content) => {
      if (!uid) throw new Error('로그인이 필요합니다')
      setUploading(true)
      try {
        // 1. Genkit 서버로 텍스트 인덱싱
        let result
        try {
          result = await uploadTextDocument({ title, content })
        } catch (genkitErr) {
          // Genkit 서버 미실행 시 명확한 에러 메시지
          if (genkitErr.message?.includes('Genkit 서버가 설정되지 않았습니다')) throw genkitErr
          throw new Error('AI 서버에 연결할 수 없습니다. Genkit 서버(server/)가 실행 중인지 확인해주세요.')
        }

        // 2. AI 요약 생성 (best-effort)
        const summary = await generateSummary(content)

        // 3. Firestore에 메타데이터 저장 (10s timeout)
        try {
          await withTimeout(
            setDocument(`users/${uid}/knowledgeDocs/${result.docId}`, {
              docId: result.docId,
              title: result.title,
              sourceType: 'text',
              chunksCreated: result.chunksCreated,
              content: content.slice(0, 500_000),
              summary,
              createdAt: Date.now(),
            })
          )
        } catch (fsErr) {
          console.warn('[knowledge] Firestore save failed, data indexed in AI only:', fsErr.message)
          // Genkit 인덱싱은 성공했으므로 결과는 반환 (Firestore 메타데이터만 누락)
        }

        await loadDocuments()
        return result
      } finally {
        setUploading(false)
      }
    },
    [uid, loadDocuments]
  )

  // Upload PDF document
  const uploadPdf = useCallback(
    async (title, file) => {
      if (!uid) throw new Error('로그인이 필요합니다')
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('파일 크기는 5MB 이하만 가능합니다')
      }

      setUploading(true)
      try {
        // File → base64
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => {
            const dataUrl = reader.result
            resolve(dataUrl.split(',')[1]) // Remove data:...;base64, prefix
          }
          reader.onerror = reject
          reader.readAsDataURL(file)
        })

        let result
        try {
          result = await uploadPdfDocument({ title, base64 })
        } catch (genkitErr) {
          if (genkitErr.message?.includes('Genkit 서버가 설정되지 않았습니다')) throw genkitErr
          throw new Error('AI 서버에 연결할 수 없습니다. Genkit 서버(server/)가 실행 중인지 확인해주세요.')
        }

        if (result.chunksCreated === 0) {
          throw new Error(
            '텍스트를 추출할 수 없는 PDF입니다.\n스캔 PDF는 "텍스트 입력"을 이용해주세요.'
          )
        }

        // Extract text from server response + generate AI summary
        const extractedText = result.extractedText || ''
        const contentToSave = extractedText.slice(0, 500_000)
        const summary = await generateSummary(extractedText)

        // Save metadata + content + summary to Firestore (10s timeout)
        try {
          await withTimeout(
            setDocument(`users/${uid}/knowledgeDocs/${result.docId}`, {
              docId: result.docId,
              title: result.title,
              sourceType: 'pdf',
              chunksCreated: result.chunksCreated,
              extractedLength: result.extractedLength,
              content: contentToSave,
              summary,
              createdAt: Date.now(),
            })
          )
        } catch (fsErr) {
          console.warn('[knowledge] Firestore save failed, data indexed in AI only:', fsErr.message)
        }

        await loadDocuments()
        return result
      } finally {
        setUploading(false)
      }
    },
    [uid, loadDocuments]
  )

  // Delete document (Firestore metadata only; vector index remains until server restart)
  const removeDocument = useCallback(
    async (docId) => {
      if (!uid) return
      try {
        await deleteDocument(`users/${uid}/knowledgeDocs/${docId}`)
        setDocuments((prev) => prev.filter((d) => d.docId !== docId))
      } catch (err) {
        console.error('[knowledge] Failed to delete document:', err)
        throw err
      }
    },
    [uid]
  )

  return {
    documents,
    loading,
    uploading,
    uploadText,
    uploadPdf,
    removeDocument,
    isAuthenticated: !!uid,
  }
}
