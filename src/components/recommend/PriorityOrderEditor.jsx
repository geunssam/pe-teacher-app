// 추천 우선순위 편집기 — 드래그 대신 ↑↓ 버튼으로 순서 변경 | 사용처→SettingsPage
const PRIORITY_LABELS = {
  weather: { label: '날씨', desc: '야외/실내 판단', emoji: '🌤️' },
  continuity: { label: '진도 연속성', desc: '이전 수업 이어가기', emoji: '📝' },
  space: { label: '사용 가능 공간', desc: '장소 매칭', emoji: '🏟️' },
  domainBalance: { label: '영역 균형', desc: '부족한 영역 보충', emoji: '⚖️' },
}

/**
 * 추천 우선순위 순서를 변경하는 편집기
 *
 * @param {{ order: string[], onChange: (newOrder: string[]) => void }} props
 */
export default function PriorityOrderEditor({ order, onChange }) {
  const moveUp = (index) => {
    if (index <= 0) return
    const next = [...order]
    ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
    onChange(next)
  }

  const moveDown = (index) => {
    if (index >= order.length - 1) return
    const next = [...order]
    ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
    onChange(next)
  }

  return (
    <div className="space-y-2">
      {order.map((key, idx) => {
        const info = PRIORITY_LABELS[key] || { label: key, desc: '', emoji: '📋' }

        return (
          <div
            key={key}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/40 border border-white/60"
          >
            {/* 순서 번호 */}
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ backgroundColor: '#4DD0E1' }}
            >
              {idx + 1}
            </span>

            {/* 이모지 + 라벨 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{info.emoji}</span>
                <span className="text-sm font-semibold text-text">{info.label}</span>
              </div>
              <div className="text-[10px] text-textMuted">{info.desc}</div>
            </div>

            {/* 상하 이동 버튼 */}
            <div className="flex flex-col gap-0.5 shrink-0">
              <button
                onClick={() => moveUp(idx)}
                disabled={idx === 0}
                className="w-6 h-5 rounded flex items-center justify-center text-xs transition-all disabled:opacity-20 hover:bg-white/60"
              >
                ▲
              </button>
              <button
                onClick={() => moveDown(idx)}
                disabled={idx === order.length - 1}
                className="w-6 h-5 rounded flex items-center justify-center text-xs transition-all disabled:opacity-20 hover:bg-white/60"
              >
                ▼
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
