import { useSchedule } from '../../hooks/useSchedule'
import { useCurrentPeriod } from '../../hooks/useCurrentPeriod'
import PeriodCell from './PeriodCell'

export default function ScheduleGrid({
  weekKey,
  isEditing,
  onEditPeriod,
  onRemovePeriod
}) {
  const { WEEKDAYS, WEEKDAY_LABELS, MAX_PERIODS, getTimetableForWeek } = useSchedule()
  const { isCurrentPeriod } = useCurrentPeriod()

  const { timetable, overriddenCells } = getTimetableForWeek(weekKey)

  return (
    <div>
      {/* 헤더: 요일 */}
      <div className="grid grid-cols-[50px_repeat(5,1fr)] gap-1.5 mb-1.5">
        <div className="p-1"></div>
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="p-2 bg-white/60 rounded-lg text-center font-bold text-sm text-text"
          >
            {WEEKDAY_LABELS[day]}
          </div>
        ))}
      </div>

      {/* 교시별 행 */}
      {Array.from({ length: MAX_PERIODS }, (_, i) => i + 1).map((period) => (
        <div key={period} className="grid grid-cols-[50px_repeat(5,1fr)] gap-1.5 mb-1.5">
          {/* 교시 번호 */}
          <div className="p-2 bg-white/60 rounded-lg flex items-center justify-center font-bold text-sm text-primary whitespace-nowrap">
            {period}
          </div>

            {/* 각 요일별 셀 */}
            {WEEKDAYS.map((day) => {
              const cellKey = `${day}-${period}`
              const periodData = timetable[cellKey]
              const isOverridden = overriddenCells.includes(cellKey)
              const isCurrent = isCurrentPeriod(day, period)

              return (
                <PeriodCell
                  key={cellKey}
                  day={day}
                  period={period}
                  periodData={periodData}
                  isOverridden={isOverridden}
                  isEditing={isEditing}
                  isCurrent={isCurrent}
                  onEdit={onEditPeriod}
                  onRemove={onRemovePeriod}
                />
              )
            })}
        </div>
      ))}
    </div>
  )
}
