// 연간 계획 영역 분포 — 운동/스포츠/표현 비율 차트 | 부모→AnnualPlanView
const DOMAIN_CONFIG = {
  '운동':   { color: '#F57C7C', label: '운동' },
  '스포츠': { color: '#7C9EF5', label: '스포츠' },
  '표현':   { color: '#A78BFA', label: '표현' },
}

export default function AnnualDomainChart({ distribution }) {
  // distribution: { 운동: 8, 스포츠: 16, 표현: 6 }
  const entries = Object.entries(distribution || {})
  const total = entries.reduce((sum, [, v]) => sum + v, 0)

  if (total === 0) {
    return (
      <div className="text-center py-4 text-xs text-gray-400">
        단원을 추가하면 영역 분포가 표시됩니다
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      {entries.map(([domain, count]) => {
        const config = DOMAIN_CONFIG[domain] || { color: '#8f8f8f', label: domain }
        const pct = Math.round((count / total) * 100)
        return (
          <div key={domain}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: config.color }}
                />
                <span className="text-xs font-medium text-gray-700">{config.label}</span>
              </div>
              <span className="text-xs text-gray-400">{count}차시 ({pct}%)</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${pct}%`,
                  backgroundColor: config.color,
                  minWidth: count > 0 ? '8px' : '0',
                }}
              />
            </div>
          </div>
        )
      })}
      <div className="text-[10px] text-gray-400 text-right mt-1">
        총 {total}차시
      </div>
    </div>
  )
}
