// 연간 계획 단원 카드 — 단원 정보 + ACE 분포 + 주차 배정 | 부모→AnnualPlanView
import AceBadge from './AceBadge'

const DOMAIN_BORDER_COLORS = {
  '운동':   '#F57C7C',
  '스포츠': '#7C9EF5',
  '표현':   '#A78BFA',
}

const DOMAIN_BADGE = {
  '운동':   { bg: 'bg-[#F57C7C]', text: 'text-white' },
  '스포츠': { bg: 'bg-[#7C9EF5]', text: 'text-white' },
  '표현':   { bg: 'bg-[#A78BFA]', text: 'text-white' },
}

function formatWeekRange(weekStart, weekEnd) {
  if (!weekStart) return '주차 미배정'
  const startNum = weekStart.split('-W')[1]
  const endNum = weekEnd ? weekEnd.split('-W')[1] : startNum
  return startNum === endNum ? `W${startNum}` : `W${startNum}~W${endNum}`
}

export default function AnnualUnitCard({ unit, index, onUpdate, onRemove, onAssignWeeks, teachableWeeks }) {
  const { id, title, domain, totalLessons, weekStart, weekEnd, lessons, standardCodes } = unit
  const borderColor = DOMAIN_BORDER_COLORS[domain] || '#8f8f8f'
  const badge = DOMAIN_BADGE[domain] || { bg: 'bg-gray-200', text: 'text-gray-700' }

  // ACE 배분 계산
  const aceCounts = { A: 0, C: 0, E: 0 }
  if (lessons) {
    lessons.forEach((l) => {
      if (l.acePhase && aceCounts[l.acePhase] !== undefined) {
        aceCounts[l.acePhase]++
      }
    })
  }

  const weekLabel = formatWeekRange(weekStart, weekEnd)

  return (
    <div
      className="p-4 bg-white/40 rounded-xl border border-white/60"
      style={{ borderLeftWidth: '4px', borderLeftColor: borderColor }}
    >
      {/* 상단: 순번 + 영역 배지 + 주차 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-400">{index + 1}.</span>
          <h3 className="text-sm font-bold text-gray-900 leading-snug">{title}</h3>
          <span className={`inline-flex items-center rounded-full text-[11px] font-semibold px-2 py-0.5 ${badge.bg} ${badge.text}`}>
            {domain}
          </span>
        </div>
      </div>

      {/* 차시수 + ACE 배분 + 주차 */}
      <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
        <span>{totalLessons}차시</span>
        <span className="text-gray-300">|</span>
        <span className={weekStart ? 'text-gray-500' : 'text-gray-300'}>{weekLabel}</span>
      </div>

      {/* ACE 분포 */}
      {(aceCounts.A > 0 || aceCounts.C > 0 || aceCounts.E > 0) && (
        <div className="flex items-center gap-1.5 mb-2">
          {aceCounts.A > 0 && <><AceBadge phase="A" /><span className="text-xs text-gray-500">{aceCounts.A}</span></>}
          {aceCounts.A > 0 && aceCounts.C > 0 && <span className="text-gray-300 text-xs">→</span>}
          {aceCounts.C > 0 && <><AceBadge phase="C" /><span className="text-xs text-gray-500">{aceCounts.C}</span></>}
          {aceCounts.C > 0 && aceCounts.E > 0 && <span className="text-gray-300 text-xs">→</span>}
          {aceCounts.E > 0 && <><AceBadge phase="E" /><span className="text-xs text-gray-500">{aceCounts.E}</span></>}
        </div>
      )}

      {/* 성취기준 코드 */}
      {standardCodes && standardCodes.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {standardCodes.map((code) => (
            <span key={code} className="text-[10px] text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">
              {code}
            </span>
          ))}
        </div>
      )}

      {/* 주차 배정 / 삭제 */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
        <button
          onClick={() => onAssignWeeks(id, { weekStart, weekEnd })}
          className="text-xs font-semibold text-primary hover:bg-primary/10 px-2.5 py-1 rounded-lg transition-colors"
        >
          주차 배정
        </button>
        <button
          onClick={() => onRemove(id)}
          className="text-xs font-semibold text-danger hover:bg-danger/10 px-2.5 py-1 rounded-lg transition-colors"
        >
          삭제
        </button>
      </div>
    </div>
  )
}
