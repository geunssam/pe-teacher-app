// AI 응답 카드 — 스트리밍 텍스트 표시 + 접기/펼치기 | 스타일→css/components/ai.css
import { useState } from 'react'

/**
 * AI 응답 표시 카드
 *
 * @param {string} text - 응답 텍스트
 * @param {boolean} loading - 로딩/스트리밍 중
 * @param {string} error - 에러 메시지
 * @param {boolean} collapsible - 접기/펼치기 가능 여부
 * @param {function} onClose - 닫기 콜백
 * @param {string} className - 추가 CSS
 */
export default function AIResponseCard({
  text = '',
  loading = false,
  error = null,
  collapsible = true,
  onClose,
  className = '',
}) {
  const [collapsed, setCollapsed] = useState(false)

  if (!text && !loading && !error) return null

  return (
    <div
      className={`ai-response-card rounded-xl border p-3 mt-3 ${className}`}
      style={{
        backgroundColor: 'rgba(167, 139, 250, 0.05)',
        borderColor: 'rgba(167, 139, 250, 0.15)',
      }}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">&#10024;</span>
          <span className="text-[11px] font-semibold" style={{ color: '#7C3AED' }}>
            AI 응답
          </span>
          {loading && (
            <span className="ai-sparkle-pulse ml-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#A78BFA] animate-pulse" />
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {collapsible && text && (
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              className="text-[10px] px-2 py-0.5 rounded-md text-gray-500 hover:bg-white/60 transition-all"
            >
              {collapsed ? '펼치기' : '접기'}
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors w-5 h-5 flex items-center justify-center"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 에러 */}
      {error && (
        <p className="text-[11px] text-red-500 leading-relaxed">{error}</p>
      )}

      {/* 콘텐츠 */}
      {!error && !collapsed && (
        <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
          {text}
          {loading && !text && (
            <span className="text-gray-400">생성 중...</span>
          )}
        </div>
      )}

      {/* 접힌 상태 */}
      {!error && collapsed && (
        <p className="text-[11px] text-gray-400 truncate">
          {text.slice(0, 60)}...
        </p>
      )}
    </div>
  )
}
