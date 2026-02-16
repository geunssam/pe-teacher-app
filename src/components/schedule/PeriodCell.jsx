// 교시 셀 — 시간표 한 칸 (과목명 + 편집 + ACE 배지) | 부모→ScheduleGrid.jsx, 학급색상→hooks/useClassManager.js
import { useClassManager } from '../../hooks/useClassManager'

export default function PeriodCell({
  day,
  period,
  periodData,
  isOverridden,
  isEditing,
  isCurrent,
  onEdit,
  onRemove,
  onOpenLessonLog,
  hasAceRecord,
}) {
  const { getClassColor } = useClassManager()

  const handleCellClick = () => {
    if (isEditing) {
      onEdit(day, period)
      return
    }

    if (periodData?.classId && onOpenLessonLog) {
      onOpenLessonLog(day, period, periodData)
    }
  }

  // 학급 색상 가져오기
  const classColor = periodData?.classId
    ? getClassColor(periodData.classId)
    : null

  // 셀 배경색 결정
  const getCellBackground = () => {
    if (isCurrent) {
      return 'bg-primary/20 border-2 border-primary'
    }
    if (periodData?.className && classColor) {
      return { style: { backgroundColor: `${classColor.bg}` }, className: 'hover:opacity-90' }
    }
    if (isEditing) {
      return 'bg-white/40 hover:bg-white/60 border-dashed'
    }
    return 'bg-white/20'
  }

  const cellStyle = getCellBackground()
  const className = typeof cellStyle === 'string' ? cellStyle : cellStyle.className || ''
  const style = typeof cellStyle === 'object' && cellStyle.style ? cellStyle.style : {}

  return (
    <div
      onClick={handleCellClick}
      className={`
        p-2 rounded-lg transition-all min-h-[50px] flex flex-col items-center justify-center relative
        ${className}
        ${(isEditing || periodData?.classId) ? 'cursor-pointer' : ''}
        border border-white/60
      `}
      style={style}
    >
      {isOverridden && (
        <span className="absolute top-0.5 right-0.5 text-xs text-primary">✦</span>
      )}

      {periodData?.className ? (
        <>
          <div
            className="text-xs font-bold leading-tight"
            style={classColor ? { color: classColor.text } : {}}
          >
            {periodData.className}
          </div>
          {periodData.memo && (
            <div
              className="text-[10px] mt-0.5 leading-tight"
              style={classColor ? { color: `${classColor.text}cc` } : {}}
            >
              {periodData.memo}
            </div>
          )}
          {isCurrent && (
            <div className="text-[10px] text-primary font-semibold mt-0.5">
              ● 현재
            </div>
          )}
          {/* ACE 기록이 있으면 ACE 배지, 아니면 기록 텍스트 */}
          {hasAceRecord ? (
            <span className="text-[9px] text-[#7C9EF5] font-bold mt-0.5">ACE</span>
          ) : !isEditing && periodData?.classId ? (
            <span className="text-[10px] text-primary font-semibold mt-0.5">기록</span>
          ) : null}
        </>
      ) : (
        isEditing && (
          <div className="text-[10px] text-textMuted">+ 추가</div>
        )
      )}
    </div>
  )
}
