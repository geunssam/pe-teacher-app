// AI 학습 자료 관리 훅 — 교사 업로드 문서 CRUD (Firestore 목록 + Genkit 인덱싱)
import { useState, useEffect, useCallback } from 'react'
import { auth } from '../services/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import {
  getCollection,
  setDocument,
  deleteDocument,
} from '../services/firestore'
import { uploadTextDocument, uploadPdfDocument } from '../services/genkit'

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

  // Load document list from Firestore
  const loadDocuments = useCallback(async () => {
    if (!uid) return
    setLoading(true)
    try {
      const docs = await getCollection(`users/${uid}/knowledgeDocs`)
      setDocuments(docs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)))
    } catch (err) {
      console.error('[knowledge] Failed to load documents:', err)
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
        const result = await uploadTextDocument({ title, content })

        // Save metadata to Firestore
        await setDocument(`users/${uid}/knowledgeDocs/${result.docId}`, {
          docId: result.docId,
          title: result.title,
          sourceType: 'text',
          chunksCreated: result.chunksCreated,
          createdAt: Date.now(),
        })

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

        const result = await uploadPdfDocument({ title, base64 })

        if (result.chunksCreated === 0) {
          throw new Error(
            '텍스트를 추출할 수 없는 PDF입니다.\n스캔 PDF는 "텍스트 입력"을 이용해주세요.'
          )
        }

        // Save metadata to Firestore
        await setDocument(`users/${uid}/knowledgeDocs/${result.docId}`, {
          docId: result.docId,
          title: result.title,
          sourceType: 'pdf',
          chunksCreated: result.chunksCreated,
          extractedLength: result.extractedLength,
          createdAt: Date.now(),
        })

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
