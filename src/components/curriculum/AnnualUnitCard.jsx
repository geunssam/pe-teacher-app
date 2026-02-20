// 연간 계획 단원 카드 — 단원 정보 + ACE 분포 + 주차 배정 | 부모→AnnualPlanView
import { useState } from 'react'
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

function formatWeekLabel(weekKey) {
  if (!weekKey) return ''
  return weekKey.replace('-', ' ')
}

function formatWeekRange(weekStart, weekEnd) {
  if (!weekStart) return '주차 미배정'
  const startNum = weekStart.split('-W')[1]
  const endNum = weekEnd ? weekEnd.split('-W')[1] : startNum
  return startNum === endNum ? `W${startNum}` : `W${startNum}~W${endNum}`
}

export default function AnnualUnitCard({ unit, index, totalCount, onUpdate, onRemove, onAssignWeeks, onMoveUp, onMoveDown, teachableWeeks }) {
  const { id, title, domain, totalLessons, weekStart, weekEnd, lessons, standardCodes } = unit
  const borderColor = DOMAIN_BORDER_COLORS[domain] || '#8f8f8f'
  const badge = DOMAIN_BADGE[domain] || { bg: 'bg-gray-200', text: 'text-gray-700' }
  const [weekPickerOpen, setWeekPickerOpen] = useState(false)
  const [pickStart, setPickStart] = useState(weekStart || '')
  const [pickEnd, setPickEnd] = useState(weekEnd || '')

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
  const weeks = teachableWeeks || []

  const handleSaveWeeks = () => {
    if (pickStart) {
      onAssignWeeks(id, { weekStart: pickStart, weekEnd: pickEnd || pickStart })
    }
    setWeekPickerOpen(false)
  }

  const handleClearWeeks = () => {
    onAssignWeeks(id, { weekStart: null, weekEnd: null })
    setPickStart('')
    setPickEnd('')
    setWeekPickerOpen(false)
  }

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
        <span className={weekStart ? 'text-primary font-semibold' : 'text-gray-300'}>{weekLabel}</span>
        {weekStart && weeks.length > 0 && (
          <>
            <span className="text-gray-300">|</span>
            <span className="text-gray-400">
              {weeks.find(w => w.weekKey === weekStart)?.mondayDate?.slice(5) || ''}~
              {weeks.find(w => w.weekKey === (weekEnd || weekStart))?.fridayDate?.slice(5) || ''}
            </span>
          </>
        )}
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

      {/* 주차 배정 피커 */}
      {weekPickerOpen && (
        <div className="p-3 mb-3 bg-white/60 rounded-lg border border-primary/20">
          <div className="text-xs font-semibold text-gray-600 mb-2">주차 배정</div>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1">
              <label className="text-[10px] text-gray-400 block mb-1">시작 주</label>
              <select
                value={pickStart}
                onChange={(e) => {
                  setPickStart(e.target.value)
                  if (!pickEnd || e.target.value > pickEnd) setPickEnd(e.target.value)
                }}
                className="w-full py-1.5 px-2 rounded-lg border border-gray-200 bg-white text-xs focus:outline-none focus:border-primary/50"
              >
                <option value="">선택</option>
                {weeks.map((w) => (
                  <option key={w.weekKey} value={w.weekKey}>
                    {w.weekKey.split('-W')[1]}주 ({w.mondayDate.slice(5)}~{w.fridayDate.slice(5)})
                  </option>
                ))}
              </select>
            </div>
            <div className="text-gray-400 mt-4">~</div>
            <div className="flex-1">
              <label className="text-[10px] text-gray-400 block mb-1">종료 주</label>
              <select
                value={pickEnd}
                onChange={(e) => setPickEnd(e.target.value)}
                className="w-full py-1.5 px-2 rounded-lg border border-gray-200 bg-white text-xs focus:outline-none focus:border-primary/50"
              >
                <option value="">선택</option>
                {weeks
                  .filter((w) => !pickStart || w.weekKey >= pickStart)
                  .map((w) => (
                    <option key={w.weekKey} value={w.weekKey}>
                      {w.weekKey.split('-W')[1]}주 ({w.mondayDate.slice(5)}~{w.fridayDate.slice(5)})
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveWeeks}
              disabled={!pickStart}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white bg-primary disabled:opacity-40 transition-all"
            >
              확인
            </button>
            {weekStart && (
              <button
                onClick={handleClearWeeks}
                className="py-1.5 px-3 rounded-lg text-xs font-semibold text-gray-500 bg-gray-100 transition-all"
              >
                해제
              </button>
            )}
            <button
              onClick={() => setWeekPickerOpen(false)}
              className="py-1.5 px-3 rounded-lg text-xs font-semibold text-gray-500 bg-gray-100 transition-all"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 순서 이동 / 주차 배정 / 삭제 */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onMoveUp(id)}
            disabled={index === 0}
            className="p-1 rounded-md text-gray-400 hover:bg-gray-100 disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
            title="위로 이동"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 4L4 9h8L8 4z" fill="currentColor"/></svg>
          </button>
          <button
            onClick={() => onMoveDown(id)}
            disabled={index === totalCount - 1}
            className="p-1 rounded-md text-gray-400 hover:bg-gray-100 disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
            title="아래로 이동"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 12L4 7h8L8 12z" fill="currentColor"/></svg>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setPickStart(weekStart || '')
              setPickEnd(weekEnd || '')
              setWeekPickerOpen(!weekPickerOpen)
            }}
            className="text-xs font-semibold text-primary hover:bg-primary/10 px-2.5 py-1 rounded-lg transition-colors"
          >
            {weekStart ? '주차 변경' : '주차 배정'}
          </button>
          <button
            onClick={() => onRemove(id)}
            className="text-xs font-semibold text-danger hover:bg-danger/10 px-2.5 py-1 rounded-lg transition-colors"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  )
}
