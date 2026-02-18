// AI 트리거 버튼 — 재사용 가능한 AI 기능 호출 버튼 | 스타일→css/components/ai.css
/**
 * AI 기능 트리거 버튼
 *
 * @param {string} label - 버튼 텍스트
 * @param {boolean} loading - 로딩 상태
 * @param {boolean} disabled - 비활성화
 * @param {function} onClick - 클릭 핸들러
 * @param {'sm'|'md'} size - 크기
 * @param {string} className - 추가 CSS
 */
export default function AIButton({
  label = 'AI 생성',
  loading = false,
  disabled = false,
  onClick,
  size = 'sm',
  className = '',
}) {
  const isDisabled = loading || disabled

  const sizeClass = size === 'md'
    ? 'px-4 py-2 text-sm'
    : 'px-3 py-1.5 text-[11px]'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      className={`
        ai-button inline-flex items-center gap-1.5 rounded-lg font-medium
        transition-all duration-200
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90 active:scale-[0.97]'}
        ${sizeClass} ${className}
      `}
      style={{
        backgroundColor: 'rgba(167, 139, 250, 0.1)',
        color: '#7C3AED',
        border: '1px solid rgba(167, 139, 250, 0.2)',
      }}
    >
      {loading ? (
        <span className="ai-sparkle-pulse">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3v1m0 16v1m-8-9H3m18 0h-1m-2.636-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707" />
          </svg>
        </span>
      ) : (
        <img src="/ai-sparkle-sm.png" alt="" width="14" height="14" className="pointer-events-none" />
      )}
      <span>{loading ? 'AI가 생각하고 있어요...' : label}</span>
    </button>
  )
}
