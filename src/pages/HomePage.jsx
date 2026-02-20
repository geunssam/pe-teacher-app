// 🏠 오늘 탭 — 날씨 요약 + AI 제안 + 오늘 시간표 + 최근 수업 기록 | 위젯→components/home/, 날씨데이터→services/weather/
import { Link, useNavigate } from 'react-router-dom'
import { useClassManager } from '../hooks/useClassManager'
import { useAnnualPlan } from '../hooks/useAnnualPlan'
import { useSchoolCalendar } from '../hooks/useSchoolCalendar'
import { getWeekRange } from '../hooks/useSchedule'
import GlassCard from '../components/common/GlassCard'
import HourlyWeatherSummary from '../components/home/HourlyWeatherSummary'
import TodaySchedule from '../components/home/TodaySchedule'
import RecentLessons from '../components/home/RecentLessons'
import AIDailySuggestion from '../components/home/AIDailySuggestion'
import WeeklyPlanReminder from '../components/home/WeeklyPlanReminder'

export default function HomePage() {
  const navigate = useNavigate()
  const { classes, getClassesByGrade } = useClassManager()
  const { plans } = useAnnualPlan()
  const { teachableWeeks } = useSchoolCalendar()
  const weekInfo = getWeekRange(0)
  const classesByGrade = getClassesByGrade()

  return (
    <div className="page-container">
      <h1 className="text-page-title mb-lg">오늘</h1>

      <div className="space-y-lg">
        {/* AI 오늘의 제안 */}
        <GlassCard accent="home">
          <AIDailySuggestion />
        </GlassCard>

        {/* 주간 수업 계획 알림 (금/월요일만 표시) */}
        <WeeklyPlanReminder
          plans={plans}
          teachableWeeks={teachableWeeks}
          weekKey={weekInfo.weekKey}
          onNavigate={() => navigate('/curriculum')}
        />

        {/* 시간별 날씨 요약 */}
        <GlassCard accent="weather">
          <HourlyWeatherSummary />
        </GlassCard>

        {/* 오늘 시간표 */}
        <GlassCard accent="schedule">
          <TodaySchedule />
        </GlassCard>

        {/* 최근 수업 */}
        <GlassCard accent="sketch">
          <RecentLessons />
        </GlassCard>

        {/* 학급 현황 */}
        <GlassCard accent="classes">
          <div className="flex items-center justify-between mb-md">
            <h2 className="text-card-title">학급 현황</h2>
            <Link to="/classes" className="btn btn-sm btn-ghost">
              학급 관리 →
            </Link>
          </div>

          {Object.keys(classesByGrade).length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-md">
              {Object.entries(classesByGrade).map(([grade, classList]) => (
                <div
                  key={grade}
                  className="p-md bg-surface rounded-lg text-center"
                >
                  <div className="text-body-bold mb-xs">{grade}학년</div>
                  <div className="text-caption text-muted">
                    {classList.length}개 반
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-body text-muted">학급 정보가 없습니다</p>
          )}

          <div className="mt-md pt-md border-t border-border">
            <div className="text-caption text-muted">
              총 {classes.length}개 학급
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
