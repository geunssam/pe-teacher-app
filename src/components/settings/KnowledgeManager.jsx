// AI 학습 자료 관리 — PDF/텍스트 업로드 UI | 훅→hooks/useKnowledgeManager.js, 설정→pages/SettingsPage.jsx
import { useState, useRef } from 'react'
import { useKnowledgeManager } from '../../hooks/useKnowledgeManager'
import GlassCard from '../common/GlassCard'
import Modal from '../common/Modal'
import toast from 'react-hot-toast'
import { confirm } from '../common/ConfirmDialog'

export default function KnowledgeManager() {
  const {
    documents,
    loading,
    uploading,
    uploadText,
    uploadPdf,
    removeDocument,
    isAuthenticated,
  } = useKnowledgeManager()

  const [showTextModal, setShowTextModal] = useState(false)
  const [textTitle, setTextTitle] = useState('')
  const [textContent, setTextContent] = useState('')
  const fileInputRef = useRef(null)

  if (!isAuthenticated) {
    return (
      <GlassCard>
        <h2 className="text-card-title mb-md">AI 학습 자료 관리</h2>
        <p className="text-body text-textMuted">
          로그인 후 이용할 수 있습니다.
        </p>
      </GlassCard>
    )
  }

  const handlePdfSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset input
    e.target.value = ''

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('PDF 파일만 업로드할 수 있습니다.')
      return
    }

    const title = file.name.replace(/\.pdf$/i, '')

    try {
      const result = await uploadPdf(title, file)
      toast.success(
        `"${result.title}" 업로드 완료 (${result.chunksCreated}개 청크)`
      )
    } catch (err) {
      toast.error(err.message || 'PDF 업로드에 실패했습니다.')
    }
  }

  const handleTextSubmit = async () => {
    if (!textTitle.trim() || !textContent.trim()) {
      toast.error('제목과 내용을 모두 입력해주세요.')
      return
    }

    try {
      const result = await uploadText(textTitle.trim(), textContent.trim())
      toast.success(
        `"${result.title}" 저장 완료 (${result.chunksCreated}개 청크)`
      )
      setShowTextModal(false)
      setTextTitle('')
      setTextContent('')
    } catch (err) {
      toast.error(err.message || '텍스트 저장에 실패했습니다.')
    }
  }

  const handleDelete = async (doc) => {
    const confirmed = await confirm(
      `"${doc.title}" 자료를 삭제하시겠습니까?`,
      '삭제',
      '취소'
    )
    if (!confirmed) return

    try {
      await removeDocument(doc.docId)
      toast.success('자료가 삭제되었습니다.')
    } catch {
      toast.error('삭제에 실패했습니다.')
    }
  }

  const formatDate = (ts) => {
    if (!ts) return ''
    const d = new Date(ts)
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  }

  return (
    <>
      <GlassCard>
        <h2 className="text-card-title mb-xs">AI 학습 자료 관리</h2>
        <p className="text-caption text-textMuted mb-md">
          업로드한 자료를 AI가 수업 추천과 챗봇 답변에 참고합니다.
        </p>

        {/* Upload buttons */}
        <div className="flex gap-2 mb-md">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all border text-white disabled:opacity-60"
            style={{ backgroundColor: '#7C9EF5', borderColor: '#7C9EF5' }}
          >
            {uploading ? '업로드 중...' : 'PDF 업로드'}
          </button>
          <button
            onClick={() => setShowTextModal(true)}
            disabled={uploading}
            className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all border border-primary/30 text-primary bg-primary/10 hover:bg-primary/20 disabled:opacity-60"
          >
            텍스트 입력
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handlePdfSelect}
            className="hidden"
          />
        </div>

        {/* Document list */}
        {loading ? (
          <p className="text-caption text-textMuted text-center py-4">
            불러오는 중...
          </p>
        ) : documents.length === 0 ? (
          <p className="text-caption text-textMuted text-center py-4">
            아직 업로드한 자료가 없습니다.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-caption text-textMuted mb-1">
              업로드된 자료 ({documents.length}건)
            </p>
            {documents.map((doc) => (
              <div
                key={doc.docId}
                className="flex items-center justify-between p-3 bg-white/40 rounded-xl border border-white/60"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">
                      {doc.sourceType === 'pdf' ? '\uD83D\uDCC4' : '\u270F\uFE0F'}
                    </span>
                    <span className="text-body font-medium text-text truncate">
                      {doc.title}
                    </span>
                  </div>
                  <div className="text-caption text-textMuted mt-0.5">
                    {formatDate(doc.createdAt)}
                    {doc.chunksCreated ? ` · ${doc.chunksCreated} 청크` : ''}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(doc)}
                  className="shrink-0 ml-2 py-1.5 px-3 text-xs text-danger bg-danger/10 rounded-lg font-medium hover:bg-danger/20 transition-all"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Text input modal */}
      {showTextModal && (
        <Modal onClose={() => setShowTextModal(false)}>
          <h3 className="text-lg font-bold mb-4">텍스트 자료 입력</h3>

          <div className="space-y-3">
            <div>
              <label className="text-caption font-semibold text-text block mb-1">
                제목
              </label>
              <input
                type="text"
                value={textTitle}
                onChange={(e) => setTextTitle(e.target.value)}
                placeholder="예: 2학기 수업 계획 메모"
                className="w-full py-2.5 px-3 rounded-xl border border-gray-200 text-body focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="text-caption font-semibold text-text block mb-1">
                내용
              </label>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="AI가 참고할 수업 자료, 메모, 아이디어 등을 입력해주세요..."
                rows={8}
                className="w-full py-2.5 px-3 rounded-xl border border-gray-200 text-body resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <p className="text-caption text-textMuted mt-1 text-right">
                {textContent.length}자
              </p>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setShowTextModal(false)}
              className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
            >
              취소
            </button>
            <button
              onClick={handleTextSubmit}
              disabled={uploading || !textTitle.trim() || !textContent.trim()}
              className="flex-1 py-2.5 px-4 text-white rounded-xl font-semibold transition-all disabled:opacity-60"
              style={{ backgroundColor: '#7C9EF5' }}
            >
              {uploading ? '저장 중...' : '저장'}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
