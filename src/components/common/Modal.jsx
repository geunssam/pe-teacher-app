/**
 * 공통 모달 래퍼 컴포넌트
 * classpet 글래스모피즘 디자인 시스템 기반
 */
export default function Modal({ children, onClose, maxWidth = 'max-w-md', zIndex = 'z-50' }) {
  return (
    <div className={`fixed inset-0 ${zIndex} flex items-center justify-center p-4`}>
      {/* 백드롭 */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* 모달 콘텐츠 */}
      <div className={`relative bg-white/95 backdrop-blur-xl rounded-2xl shadow-glass-strong ${maxWidth} w-full p-6 border border-white/60`}>
        {children}
      </div>
    </div>
  )
}
