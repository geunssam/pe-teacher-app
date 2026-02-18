// AI 추천 결과 카드 — 활동명, 추천 이유, 운영 팁, modifier, confidence 표시 | 훅→useRecommend
import { useState } from 'react'

const CONFIDENCE_LABELS = [
  { min: 0.8, label: '매우 적합', color: '#059669' },
  { min: 0.6, label: '적합', color: '#7C9EF5' },
  { min: 0.4, label: '보통', color: '#F5A67C' },
  { min: 0, label: '참고', color: '#9CA3AF' },
]

function getConfidenceInfo(confidence) {
  return CONFIDENCE_LABELS.find((c) => confidence >= c.min) || CONFIDENCE_LABELS[3]
}

/**
 * AI 추천 결과 카드 목록
 *
 * @param {object} result - { recommendations: [...], summary: '' }
 * @param {boolean} loading - AI 요청 중
 * @param {string} error - 에러 메시지
 * @param {function} onClose - 닫기 콜백
 * @param {function} onSelectActivity - 활동 선택 시 콜백 (activityId)
 */
export default function AiRecommendCard({
  result = null,
  loading = false,
  error = null,
  onClose,
  onSelectActivity,
}) {
  const [collapsed, setCollapsed] = useState(false)

  if (!result && !loading && !error) return null

  const recommendations = result?.recommendations || []
  const summary = result?.summary || ''

  return (
    <div
      className="rounded-2xl border p-4 mt-3"
      style={{
        backgroundColor: 'rgba(124, 158, 245, 0.04)',
        borderColor: 'rgba(124, 158, 245, 0.15)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">&#10024;</span>
          <span className="text-xs font-semibold" style={{ color: '#4F46E5' }}>
            AI 수업 추천
          </span>
          {loading && (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#7C9EF5] animate-pulse ml-1" />
          )}
        </div>
        <div className="flex items-center gap-1">
          {recommendations.length > 0 && (
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

      {/* Error */}
      {error && (
        <p className="text-[11px] text-red-500 leading-relaxed">{error}</p>
      )}

      {/* Loading */}
      {loading && !error && (
        <div className="flex items-center gap-2 py-4 justify-center">
          <div className="w-4 h-4 border-2 border-[#7C9EF5]/30 border-t-[#7C9EF5] rounded-full animate-spin" />
          <span className="text-xs text-gray-500">AI가 수업을 분석하고 있습니다...</span>
        </div>
      )}

      {/* Collapsed summary */}
      {!error && !loading && collapsed && summary && (
        <p className="text-[11px] text-gray-400 truncate">{summary}</p>
      )}

      {/* Recommendations list */}
      {!error && !loading && !collapsed && recommendations.length > 0 && (
        <div className="space-y-3">
          {/* Summary */}
          {summary && (
            <p className="text-[11px] text-gray-500 leading-relaxed mb-2">{summary}</p>
          )}

          {recommendations.map((rec, i) => {
            const conf = getConfidenceInfo(rec.confidence)
            return (
              <div
                key={rec.activityId || i}
                className="rounded-xl border p-3 bg-white/60 hover:bg-white/80 transition-colors cursor-pointer"
                style={{ borderColor: 'rgba(124, 158, 245, 0.12)' }}
                onClick={() => onSelectActivity?.(rec.activityId)}
              >
                {/* Activity name + confidence */}
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-sm font-semibold text-gray-900">
                    {rec.activityName || rec.activityId}
                  </h4>
                  <span
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                    style={{
                      color: conf.color,
                      backgroundColor: `${conf.color}15`,
                    }}
                  >
                    {conf.label} {Math.round(rec.confidence * 100)}%
                  </span>
                </div>

                {/* Reason */}
                <p className="text-[11px] text-gray-600 leading-relaxed mb-1">
                  {rec.reason}
                </p>

                {/* Teaching advice */}
                {rec.teachingAdvice && (
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    <span className="font-medium text-gray-600">&#128161; </span>
                    {rec.teachingAdvice}
                  </p>
                )}

                {/* Modifiers */}
                {rec.modifiers?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {rec.modifiers.map((mod, j) => (
                      <span
                        key={j}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500"
                      >
                        {mod}
                      </span>
                    ))}
                  </div>
                )}

              </div>
            )
          })}
        </div>
      )}

      {/* No results */}
      {!error && !loading && !collapsed && result && recommendations.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-3">
          추천 결과를 생성하지 못했습니다. 다시 시도해주세요.
        </p>
      )}
    </div>
  )
}
