// 오늘 시간표 — 홈 탭에서 오늘의 체육 수업 일정 표시 | 부모→pages/HomePage.jsx, 데이터→hooks/useSchedule.js
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useSchedule } from '../../hooks/useSchedule'
import { useCurrentPeriod } from '../../hooks/useCurrentPeriod'
import { useAnnualPlan } from '../../hooks/useAnnualPlan'

/**
 * 홈 탭의 오늘 시간표 요약
 * 오늘 요일의 교시별 학급 리스트 + 현재 교시 표시
 */
export default function TodaySchedule() {
  const { WEEKDAYS, WEEKDAY_LABELS, getTimetableForWeek } = useSchedule()
  const { currentDay, isCurrentPeriod } = useCurrentPeriod()
  const { plans, getScheduleOverlay } = useAnnualPlan()

  const getTodayFallback = () => {
    const dayOfWeek = new Date().getDay()
    return dayOfWeek >= 1 && dayOfWeek <= 5 ? WEEKDAYS[dayOfWeek - 1] : WEEKDAYS[0]
  }

  const today = WEEKDAYS.includes(currentDay) ? currentDay : getTodayFallback()
  const { timetable } = getTimetableForWeek()

  // 오늘 체육 교시별 연간 계획 오버레이 계산
  const todayOverlays = useMemo(() => {
    if (!plans || plans.length === 0) return {}
    const overlays = {}
    // 학급별로 오늘 체육 셀만 그룹화
    const cellsByClass = {}
    for (let period = 1; period <= 7; period++) {
      const cellKey = `${today}-${period}`
      const pd = timetable[cellKey]
      if (!pd?.classId) continue
      if (!cellsByClass[pd.classId]) cellsByClass[pd.classId] = {}
      cellsByClass[pd.classId][cellKey] = pd
    }
    Object.entries(cellsByClass).forEach(([classId, classTimetable]) => {
      for (const plan of plans) {
        const overlay = getScheduleOverlay(plan.id, classId, undefined, classTimetable)
        if (overlay && Object.keys(overlay).length > 0) {
          Object.assign(overlays, overlay)
          break
        }
      }
    })
    return overlays
  }, [plans, timetable, today, getScheduleOverlay])

  // 오늘 요일의 시간표만 필터링
  const todaySchedule = []
  for (let period = 1; period <= 7; period++) {
    const cellKey = `${today}-${period}`
    const periodData = timetable[cellKey]
    if (periodData) {
      todaySchedule.push({
        period,
        ...periodData,
        isCurrent: isCurrentPeriod(today, period),
        planOverlay: todayOverlays[cellKey] || null,
      })
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-md">
        <h2 className="text-card-title">
          오늘 시간표 ({WEEKDAY_LABELS[today]})
        </h2>
        <Link to="/schedule" className="btn btn-sm btn-ghost">
          전체보기 →
        </Link>
      </div>

      {todaySchedule.length > 0 ? (
        <div className="space-y-xs">
          {todaySchedule.map((item) => (
            <div
              key={item.period}
              className={`
                flex items-center justify-between p-md rounded-lg border transition-all
                ${
                  item.isCurrent
                    ? 'bg-primary/10 border-primary'
                    : 'bg-white/40 border-white/60'
                }
              `}
            >
              <div className="flex items-center gap-md">
                <div
                  className={`
                    text-body-bold
                    ${item.isCurrent ? 'text-primary' : 'text-muted'}
                  `}
                >
                  {item.period}교시
                </div>
                <div className="text-body font-semibold text-text">
                  {item.className}
                </div>
                {item.planOverlay && (
                  <div className="text-[10px] text-primary/70 font-medium">
                    {item.planOverlay.lessonNumber}차시: {item.planOverlay.lessonTitle}
                  </div>
                )}
                {item.memo && (
                  <div className="text-caption text-muted">· {item.memo}</div>
                )}
              </div>

              <div className="flex items-center gap-sm">
                <Link
                  to={`/schedule?day=${today}&period=${item.period}&classId=${item.classId}`}
                  className="text-caption font-semibold text-primary"
                >
                  기록하기 →
                </Link>
                {item.isCurrent && (
                  <div className="text-caption font-semibold text-primary">● 현재</div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-lg bg-white/40 rounded-lg text-center border border-white/60">
          <div className="text-body text-muted mb-xs">
            오늘은 등록된 수업이 없습니다
          </div>
          <Link to="/schedule" className="text-caption text-primary font-semibold">
            시간표 등록하기 →
          </Link>
        </div>
      )}
    </div>
  )
}
