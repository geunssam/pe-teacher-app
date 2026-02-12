import { Link } from 'react-router-dom'
import { useClassManager } from '../../hooks/useClassManager'

/**
 * 홈 탭의 최근 수업 기록
 * 최근 5건의 수업 기록 (학급 + 활동 + 날짜)
 * 수업스케치 탭에서 "수업 결정" 시 저장됨
 */
export default function RecentLessons() {
  const { classes } = useClassManager()

  // TODO: 수업 기록 데이터 구조 구현 후 실제 데이터로 교체
  // 현재는 Mock 데이터로 표시
  const recentLessons = []

  // 각 학급의 lastActivity 정보를 모아서 최근 5건 추출
  const lessonsFromClasses = classes
    .filter((cls) => cls.lastActivity)
    .map((cls) => ({
      classId: cls.id,
      className: `${cls.grade}학년 ${cls.classNum}반`,
      activity: cls.lastActivity,
      domain: cls.lastDomain || '스포츠',
      date: cls.lastDate || new Date().toISOString().split('T')[0]
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5)

  const hasLessons = lessonsFromClasses.length > 0

  return (
    <div>
      <div className="flex items-center justify-between mb-md">
        <h2 className="text-card-title">최근 수업</h2>
        <Link to="/sketch" className="btn btn-sm btn-ghost">
          수업스케치 →
        </Link>
      </div>

      {hasLessons ? (
        <div className="space-y-xs">
          {lessonsFromClasses.map((lesson, index) => {
            // 영역별 색상
            const domainColors = {
              운동: '#F57C7C',
              스포츠: '#7C9EF5',
              표현: '#A78BFA'
            }
            const domainColor = domainColors[lesson.domain] || '#7C9EF5'

            return (
              <div
                key={index}
                className="flex items-center justify-between p-md bg-white/40 rounded-lg border border-white/60"
              >
                <div className="flex items-center gap-md flex-1">
                  <div className="text-body font-semibold text-text">
                    {lesson.className}
                  </div>
                  <div className="text-body text-text">{lesson.activity}</div>
                  <div
                    className="text-caption font-semibold px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: `${domainColor}20`,
                      color: domainColor
                    }}
                  >
                    {lesson.domain}
                  </div>
                </div>
                <div className="text-caption text-muted">
                  {new Date(lesson.date).toLocaleDateString('ko-KR', {
                    month: 'numeric',
                    day: 'numeric'
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="p-lg bg-white/40 rounded-lg text-center border border-white/60">
          <div className="text-body text-muted mb-xs">
            아직 수업 기록이 없습니다
          </div>
          <Link to="/sketch" className="text-caption text-primary font-semibold">
            수업 설계하기 →
          </Link>
        </div>
      )}
    </div>
  )
}
