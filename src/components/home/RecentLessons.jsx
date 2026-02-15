// 최근 수업 — 홈 탭에서 최근 수업 기록 목록 | 부모→pages/HomePage.jsx, 데이터→hooks/useClassManager.js

import { useClassManager } from '../../hooks/useClassManager'
import { formatRecordDate, getRecordSortValue } from '../../utils/recordDate'

/**
 * 홈 탭의 최근 수업 기록
 * 최근 5건의 수업 기록 (학급 + 활동 + 날짜)
 */
export default function RecentLessons() {
  const { classes, getClassRecords } = useClassManager()

    const recentLessons = classes
    .flatMap((cls) => {
      const records = getClassRecords(cls.id) || []
      return records.map((record) => ({
        classId: cls.id,
        className: `${cls.grade}학년 ${cls.classNum}반`,
        activity: record.activity || '수업 활동',
        domain: record.domain || '스포츠',
        variation: record.variation || '',
        memo: record.memo || '',
        date: record.date || record.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        period: record.period,
        dayLabel: record.dayLabel,
        sequence: record.sequence,
        performance: record.performance,
        recordId: record.id,
        ...record,
      }))
    })
    .sort((a, b) => getRecordSortValue(b.date) - getRecordSortValue(a.date))
    .slice(0, 5)

  const hasLessons = recentLessons.length > 0
  const formatDate = formatRecordDate

  return (
    <div>
      <div className="flex items-center justify-between mb-md">
        <h2 className="text-card-title">최근 수업</h2>
      </div>

      {hasLessons ? (
        <div className="space-y-xs">
          {recentLessons.map((lesson) => {
              const domainColors = {
              운동: '#F57C7C',
              스포츠: '#7C9EF5',
              표현: '#A78BFA',
              놀이: '#FBBF24',
              기타: '#818CF8',
            }
            const domainColor = domainColors[lesson.domain] || '#7C9EF5'
            const periodLabel = [lesson.dayLabel, lesson.period ? `${lesson.period}교시` : null].filter(Boolean)
            const subtitle = [lesson.variation, lesson.memo].filter(Boolean).join(' · ')

            return (
              <div
                key={lesson.recordId || `${lesson.classId}-${lesson.date}-${lesson.activity}`}
                className="space-y-1 p-md bg-white/40 rounded-lg border border-white/60"
              >
                <div className="flex items-center justify-between">
                <div className="flex items-center gap-md flex-1">
                  <div className="text-body font-semibold text-text">
                    {lesson.className}
                  </div>
                  <div className="text-body text-text">{lesson.activity}</div>
                  <div className="text-caption text-muted">
                    {lesson.sequence ? `${lesson.sequence}차시` : '차시 미기록'}
                  </div>
                  <div
                    className="text-caption font-semibold px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: `${domainColor}20`,
                        color: domainColor,
                      }}
                    >
                      {lesson.domain}
                    </div>
                  </div>
                <div className="text-caption text-muted">
                    {[
                      ...periodLabel,
                      formatDate(lesson.date),
                    ].filter(Boolean).join(' · ')}
                  </div>
                  {lesson.performance && (
                    <p className="text-caption text-muted">
                      평가: {lesson.performance}
                    </p>
                  )}
                </div>

                {subtitle && (
                  <div className="text-caption text-muted">{subtitle}</div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="p-lg bg-white/40 rounded-lg text-center border border-white/60">
          <div className="text-body text-muted mb-xs">
            아직 수업 기록이 없습니다
          </div>
          <span className="text-caption text-muted">수업 기록은 시간표에서 저장할 수 있습니다</span>
        </div>
      )}
    </div>
  )
}
