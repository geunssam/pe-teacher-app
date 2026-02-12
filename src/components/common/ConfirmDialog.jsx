import { useState, useEffect } from 'react'

let confirmResolve = null

export function useConfirm() {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [confirmText, setConfirmText] = useState('확인')
  const [cancelText, setCancelText] = useState('취소')

  useEffect(() => {
    // 전역 confirm 함수 등록
    window.showConfirm = ({ message, confirmText = '확인', cancelText = '취소' }) => {
      setMessage(message)
      setConfirmText(confirmText)
      setCancelText(cancelText)
      setIsOpen(true)

      return new Promise((resolve) => {
        confirmResolve = resolve
      })
    }
  }, [])

  const handleConfirm = () => {
    setIsOpen(false)
    if (confirmResolve) {
      confirmResolve(true)
      confirmResolve = null
    }
  }

  const handleCancel = () => {
    setIsOpen(false)
    if (confirmResolve) {
      confirmResolve(false)
      confirmResolve = null
    }
  }

  const ConfirmDialog = () => {
    if (!isOpen) return null

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in">
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-glass-strong max-w-sm w-full p-6 border border-white/60 animate-fade-in">
          <p className="text-text text-center mb-6 whitespace-pre-line leading-relaxed">
            {message}
          </p>

          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="flex-1 py-3 px-4 bg-white/60 text-text rounded-xl font-medium hover:bg-white/80 transition-all border border-white/80"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-3 px-4 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-all shadow-sm"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return { ConfirmDialog }
}

// 헬퍼 함수
export async function confirm(message, confirmText = '확인', cancelText = '취소') {
  if (window.showConfirm) {
    return await window.showConfirm({ message, confirmText, cancelText })
  }
  // fallback
  return window.confirm(message)
}
