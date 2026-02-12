import { Link } from 'react-router-dom'
import { useClassManager } from '../hooks/useClassManager'
import GlassCard from '../components/common/GlassCard'

export default function HomePage() {
  const { classes, getClassesByGrade } = useClassManager()
  const classesByGrade = getClassesByGrade()

  return (
    <div className="page-container">
      <h1 className="text-page-title mb-lg">🏠 오늘</h1>

      <div className="space-y-lg">
        {/* 날씨 미니 위젯 (향후 구현) */}
        <GlassCard accent="weather">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-card-title mb-sm">오늘의 날씨</h2>
              <p className="text-body text-muted">날씨 정보 로딩 중...</p>
            </div>
            <Link to="/weather" className="btn btn-sm btn-ghost">
              상세보기 →
            </Link>
          </div>
        </GlassCard>

        {/* 오늘 시간표 (향후 구현) */}
        <GlassCard accent="schedule">
          <div className="flex items-center justify-between mb-md">
            <h2 className="text-card-title">오늘 시간표</h2>
            <Link to="/schedule" className="btn btn-sm btn-ghost">
              전체보기 →
            </Link>
          </div>
          <p className="text-body text-muted">시간표를 등록해주세요</p>
        </GlassCard>

        {/* 최근 수업 (향후 구현) */}
        <GlassCard accent="sketch">
          <div className="flex items-center justify-between mb-md">
            <h2 className="text-card-title">최근 수업</h2>
            <Link to="/sketch" className="btn btn-sm btn-ghost">
              수업스케치 →
            </Link>
          </div>
          <p className="text-body text-muted">아직 수업 기록이 없습니다</p>
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
