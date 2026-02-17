// 오늘의 AI 한줄 제안 — 날씨+시간표+최근기록 종합 제안 카드 | 훅→hooks/useAI.js, 프롬프트→services/aiPrompts.js
import { useState, useEffect } from 'react'
import { useAI } from '../../hooks/useAI'
import { buildDailySuggestionPrompt } from '../../services/aiPrompts'
import { isAIAvailable } from '../../services/ai'
import AIButton from '../common/AIButton'

/**
 * 홈 탭 상단 AI 한줄 제안 카드
 *
 * @param {object} weather - 날씨 데이터 { temperature, condition, pm10Grade }
 * @param {array} schedule - 오늘 시간표 [{ period, className }]
 * @param {array} recentRecords - 최근 수업 기록 [{ className, activity }]
 */
export default function AIDailySuggestion({ weather, schedule, recentRecords }) {
  const { loading, error, result, generate, reset } = useAI()
  const [dismissed, setDismissed] = useState(false)

  const handleGenerate = () => {
    generate(buildDailySuggestionPrompt({ weather, schedule, recentRecords }))
  }

  if (dismissed) return null

  return (
    <div
      className="rounded-xl p-3 mb-0"
      style={{
        background: 'linear-gradient(135deg, rgba(124, 158, 245, 0.08), rgba(167, 139, 250, 0.08))',
        border: '1px solid rgba(167, 139, 250, 0.15)',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-sm">&#10024;</span>
          <span className="text-[11px] font-bold" style={{ color: '#7C3AED' }}>
            AI 오늘의 제안
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-gray-300 hover:text-gray-500 transition-colors shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {result ? (
        <p className="text-xs text-gray-700 leading-relaxed">{result}</p>
      ) : error ? (
        <p className="text-[11px] text-red-400">{error}</p>
      ) : (
        <div className="flex items-center gap-2">
          <AIButton
            label="AI 제안 받기"
            loading={loading}
            disabled={!isAIAvailable()}
            onClick={handleGenerate}
          />
          {!isAIAvailable() && (
            <span className="text-[10px] text-gray-400">인터넷 연결 필요</span>
          )}
        </div>
      )}
    </div>
  )
}
