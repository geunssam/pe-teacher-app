// 내 활동 목록 — GlassCard 기반 목록 + 빈 상태 + 삭제 | Wave 2 기본 → Wave 3에서 확장 예정
import GlassCard from '../common/GlassCard'

const DIFFICULTY_LABEL = { 1: '쉬움', 2: '보통', 3: '어려움' }
const DIFFICULTY_COLOR = {
  1: 'bg-emerald-50 text-emerald-600',
  2: 'bg-amber-50 text-amber-600',
  3: 'bg-red-50 text-red-600',
}

export default function MyActivityList({ activities, onActivityClick, onDelete, onAddClick }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3">📝</div>
        <p className="text-sm text-gray-500 mb-1">아직 저장한 활동이 없어요</p>
        <p className="text-xs text-gray-400 mb-5">직접 만든 활동을 여기에 보관할 수 있습니다</p>
        <button
          onClick={onAddClick}
          className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium bg-[#F5A67C] text-white hover:bg-[#e89568] transition-colors"
        >
          + 첫 활동 추가하기
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <GlassCard
          key={activity.id}
          clickable
          onClick={() => onActivityClick(activity)}
          className="p-4 transition-transform duration-150 hover:-translate-y-0.5 cursor-pointer"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {/* 활동명 */}
              <h3 className="text-sm font-bold text-gray-900 mb-1 truncate">
                {activity.name}
              </h3>

              {/* 출처/메모 */}
              {activity.source && (
                <p className="text-[11px] text-gray-400 mb-2 truncate">{activity.source}</p>
              )}

              {/* 태그 칩 */}
              <div className="flex flex-wrap gap-1">
                {activity.acePhase && (
                  <span className="text-[10px] bg-[#7C9EF5]/10 text-[#7C9EF5] rounded-full px-2 py-0.5 font-medium">
                    {activity.acePhase}
                  </span>
                )}
                {activity.difficulty && (
                  <span className={`text-[10px] rounded-full px-2 py-0.5 font-medium ${DIFFICULTY_COLOR[activity.difficulty] || ''}`}>
                    {DIFFICULTY_LABEL[activity.difficulty] || ''}
                  </span>
                )}
                {(activity.tags || []).slice(0, 3).map((tag) => (
                  <span key={tag} className="text-[10px] bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">
                    {tag}
                  </span>
                ))}
                {activity.aceLesson && (
                  <span className="text-[10px] bg-emerald-50 text-emerald-600 rounded-full px-2 py-0.5 font-medium">
                    ACE 수업안
                  </span>
                )}
              </div>
            </div>

            {/* 삭제 버튼 */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (window.confirm(`"${activity.name}" 활동을 삭제할까요?`)) {
                  onDelete(activity.id)
                }
              }}
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
              title="삭제"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </button>
          </div>
        </GlassCard>
      ))}
    </div>
  )
}
