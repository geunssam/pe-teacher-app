// 주간 추천 그리드 — 월~금 요일별 미니 추천 카드 | 사용처→RecommendPage
import GlassCard from '../common/GlassCard'

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri']
const WEEKDAY_LABELS = { mon: '월', tue: '화', wed: '수', thu: '목', fri: '금' }

const DOMAIN_COLORS = {
  '운동': '#F57C7C',
  '스포츠': '#7C9EF5',
  '표현': '#A78BFA',
}

/**
 * 주간 뷰: 요일별 미니 추천 카드 그리드
 *
 * @param {{ weekRecommendations: Object, currentDay: string|null }} props
 */
export default function WeeklyRecommendGrid({ weekRecommendations, currentDay }) {
  if (!weekRecommendations) return null

  const hasAnyData = WEEKDAYS.some((day) => weekRecommendations[day]?.length > 0)
  if (!hasAnyData) {
    return (
      <GlassCard className="text-center py-8">
        <p className="text-sm text-textMuted">이번 주 체육 수업이 없습니다</p>
        <p className="text-xs text-textMuted mt-1">시간표에 체육 수업을 등록해주세요</p>
      </GlassCard>
    )
  }

  return (
    <div className="space-y-3">
      {WEEKDAYS.map((day) => {
        const recs = weekRecommendations[day] || []
        const isToday = day === currentDay
        const dayLabel = WEEKDAY_LABELS[day]

        return (
          <div key={day}>
            {/* 요일 헤더 */}
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                  isToday
                    ? 'text-white'
                    : 'text-textMuted bg-white/40'
                }`}
                style={isToday ? { backgroundColor: '#4DD0E1' } : {}}
              >
                {dayLabel}
              </span>
              {isToday && (
                <span className="text-[10px] text-textMuted font-medium">오늘</span>
              )}
            </div>

            {/* 해당 요일 수업들 */}
            {recs.length === 0 ? (
              <div className="text-[10px] text-textMuted ml-1 mb-2">체육 수업 없음</div>
            ) : (
              <div className="space-y-1.5 mb-2">
                {recs.map((rec, idx) => {
                  if (rec.isSkipped) {
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-warning/5 border border-warning/20 text-xs"
                      >
                        <span className="text-[10px]">📢</span>
                        <span className="text-textMuted">
                          {rec.period}교시 {rec.classInfo.grade} {rec.classInfo.classNum}반 — {rec.skipReason}
                        </span>
                      </div>
                    )
                  }

                  const domainColor = rec.recommendation
                    ? DOMAIN_COLORS[rec.recommendation.domain] || '#7C9EF5'
                    : '#ccc'

                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/40 border border-white/60 transition-all hover:bg-white/60"
                    >
                      {/* 학급 색상 핀 */}
                      <span
                        className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                        style={{ backgroundColor: rec.classInfo.color || '#7C9EF5' }}
                      >
                        {rec.classInfo.classNum}
                      </span>

                      {/* 교시 + 학급 */}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-text truncate">
                          {rec.period}교시 · {rec.classInfo.grade} {rec.classInfo.classNum}반
                        </div>
                        {rec.recommendation && (
                          <div className="text-[10px] text-textMuted truncate">
                            {rec.recommendation.activity}
                          </div>
                        )}
                      </div>

                      {/* 영역 태그 */}
                      {rec.recommendation && (
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] font-semibold text-white shrink-0"
                          style={{ backgroundColor: domainColor }}
                        >
                          {rec.recommendation.domain}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
