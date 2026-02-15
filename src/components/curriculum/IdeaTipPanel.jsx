// 아이디어 팁 패널 — 비슷한 활동 + scaffolding 종합 + 다음 차시 | Wave 4
// ActivityDetailModal 하단에 삽입, 데이터 없는 섹션은 숨김 처리

/**
 * aceLesson의 acquire/challenge/engage에서 scaffolding tip을 추출한다.
 * @returns {{ ups: string[], downs: string[] }}
 */
function extractScaffolding(aceLesson) {
  if (!aceLesson) return { ups: [], downs: [] }

  const ups = []
  const downs = []

  const collect = (items) => {
    if (!items) return
    for (const item of items) {
      if (item.scaffolding?.up) ups.push(item.scaffolding.up)
      if (item.scaffolding?.down) downs.push(item.scaffolding.down)
    }
  }

  collect(aceLesson.acquire?.drills)
  collect(aceLesson.challenge?.missions)

  if (aceLesson.engage?.scaffolding) {
    if (aceLesson.engage.scaffolding.up) ups.push(aceLesson.engage.scaffolding.up)
    if (aceLesson.engage.scaffolding.down) downs.push(aceLesson.engage.scaffolding.down)
  }
  if (aceLesson.engage?.game?.scaffolding) {
    if (aceLesson.engage.game.scaffolding.up) ups.push(aceLesson.engage.game.scaffolding.up)
    if (aceLesson.engage.game.scaffolding.down) downs.push(aceLesson.engage.game.scaffolding.down)
  }

  return { ups, downs }
}

export default function IdeaTipPanel({ activity, relatedActivities, onActivitySwitch }) {
  if (!activity) return null

  const aceLesson = activity.aceLesson
  const { ups, downs } = extractScaffolding(aceLesson)
  const nextPreview = aceLesson?.wrapup?.nextPreview
  const hasRelated = relatedActivities?.length > 0
  const hasUps = ups.length > 0
  const hasDowns = downs.length > 0
  const hasNext = !!nextPreview

  // 아무 데이터도 없으면 패널 숨김
  if (!hasRelated && !hasUps && !hasDowns && !hasNext) return null

  return (
    <div className="mt-5 pt-4 border-t border-gray-100">
      <h4 className="text-xs font-bold text-gray-700 mb-3 flex items-center gap-1.5">
        <span className="text-sm">💡</span>
        이런 활동도 생각해보세요!
      </h4>

      {/* 비슷한 활동 */}
      {hasRelated && (
        <div className="mb-3">
          <p className="text-[11px] font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
            <span className="text-[10px]">📌</span> 비슷한 활동
          </p>
          <div className="flex flex-wrap gap-1.5">
            {relatedActivities.map((ra) => (
              <button
                key={ra.id}
                onClick={() => onActivitySwitch?.(ra)}
                className="text-[11px] bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg px-2.5 py-1.5 font-medium transition-colors text-left"
                title={ra.source || ra.name}
              >
                {ra.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 난이도 올리기 */}
      {hasUps && (
        <div className="mb-3">
          <p className="text-[11px] font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
            <span className="flex-shrink-0 w-4 h-4 rounded bg-rose-100 text-rose-500 text-[10px] font-bold flex items-center justify-center">&#8593;</span>
            난이도 올리기
          </p>
          <ul className="space-y-1 pl-5">
            {ups.map((tip, i) => (
              <li key={i} className="text-[11px] text-rose-600 leading-relaxed list-disc">{tip}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 난이도 내리기 */}
      {hasDowns && (
        <div className="mb-3">
          <p className="text-[11px] font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
            <span className="flex-shrink-0 w-4 h-4 rounded bg-sky-100 text-sky-500 text-[10px] font-bold flex items-center justify-center">&#8595;</span>
            난이도 내리기
          </p>
          <ul className="space-y-1 pl-5">
            {downs.map((tip, i) => (
              <li key={i} className="text-[11px] text-sky-600 leading-relaxed list-disc">{tip}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 다음 차시 연결 */}
      {hasNext && (
        <div className="mb-1">
          <p className="text-[11px] font-semibold text-gray-500 mb-1 flex items-center gap-1">
            <span className="text-[10px]">➡️</span> 다음 차시 연결
          </p>
          <p className="text-[11px] text-blue-600 leading-relaxed pl-5">{nextPreview}</p>
        </div>
      )}
    </div>
  )
}
