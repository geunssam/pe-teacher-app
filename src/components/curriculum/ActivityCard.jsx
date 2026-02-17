// 활동 카드 — 읽기 전용 GlassCard 기반 (학년별 뷰용) | Props: activity, onClick
import GlassCard from '../common/GlassCard'
import AceBadge from './AceBadge'

const DIFFICULTY_LABEL = { 1: '쉬움', 2: '보통', 3: '어려움' }
const DIFFICULTY_COLOR = {
  1: 'bg-emerald-50 text-emerald-600',
  2: 'bg-amber-50 text-amber-600',
  3: 'bg-red-50 text-red-600',
}

export default function ActivityCard({ activity, onClick }) {
  if (!activity) return null

  return (
    <GlassCard
      clickable
      onClick={() => onClick?.(activity)}
      className="p-3.5 transition-transform duration-150 hover:-translate-y-0.5 cursor-pointer"
    >
      {/* 활동명 */}
      <h3 className="text-sm font-bold text-gray-900 mb-1 truncate">
        {activity.name}
      </h3>

      {/* 출처 */}
      {activity.source && (
        <p className="text-[11px] text-gray-400 mb-2 truncate">{activity.source}</p>
      )}

      {/* 배지 행 */}
      <div className="flex flex-wrap gap-1">
        {activity.acePhase && <AceBadge phase={activity.acePhase} size="sm" />}

        {activity.difficulty && (
          <span className={`text-[10px] rounded-full px-2 py-0.5 font-medium ${DIFFICULTY_COLOR[activity.difficulty] || ''}`}>
            {DIFFICULTY_LABEL[activity.difficulty] || ''}
          </span>
        )}

        {/* 성취기준 코드 칩 (최대 2개) */}
        {(activity.standardCodes || []).slice(0, 2).map((code) => (
          <span
            key={code}
            className="text-[10px] bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 font-mono"
          >
            {code}
          </span>
        ))}
        {(activity.standardCodes || []).length > 2 && (
          <span className="text-[10px] text-gray-400">
            +{activity.standardCodes.length - 2}
          </span>
        )}

        {/* aceLesson 유무 표시 */}
        {activity.aceLesson && (
          <span className="text-[10px] bg-emerald-50 text-emerald-600 rounded-full px-2 py-0.5 font-medium">
            ACE 수업안
          </span>
        )}
      </div>
    </GlassCard>
  )
}
