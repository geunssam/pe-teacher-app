// 📋 학급 탭 — 학급별 학생 명단 관리 + 수업 기록 조회 | 편집UI→components/classes/RosterEditor.jsx, 데이터→hooks/useClassManager.js
import { useState } from 'react'
import { useClassManager } from '../hooks/useClassManager'
import GlassCard from '../components/common/GlassCard'
import RosterEditor from '../components/classes/RosterEditor'
import { formatRecordDate } from '../utils/recordDate'

export default function ClassesPage() {
  const {
    classes,
    getClassesByGrade,
    getClassRecords,
    getClassRecordCount,
    getNextLessonSequence,
    rosters,
  } = useClassManager()
  const classesByGrade = getClassesByGrade()
  const [selectedClass, setSelectedClass] = useState(null)

  const getRecordDateLabel = (recordDate) => {
    return formatRecordDate(recordDate)
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-lg">
        <h1 className="text-page-title">📋 학급 관리</h1>
      </div>

      {Object.keys(classesByGrade).length > 0 ? (
        <div className="space-y-xl">
          {Object.entries(classesByGrade).map(([grade, classList]) => (
            <div key={grade}>
              <h2 className="text-card-title mb-md">
                {grade}학년 ({classList.length}개 반)
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">
                {classList.map((classItem) => {
                  const roster = rosters[classItem.id] || []
                  const filledRoster = roster.filter((s) => s.name).length
                  const records = getClassRecords(classItem.id)
                  const latestRecord = records?.[0]
                  const latestDate = latestRecord?.date || latestRecord?.createdAt
                  const latestPeriod = latestRecord?.period
                  const latestDomain = latestRecord?.domain || classItem.lastDomain || '-'
                  const totalRecords = records.length
                  const latestDomainCount = latestDomain && latestDomain !== '-'
                    ? getClassRecordCount(classItem.id, latestDomain)
                    : totalRecords
                  const nextSequenceInDomain = latestDomain && latestDomain !== '-'
                    ? getNextLessonSequence(classItem.id, latestDomain)
                    : totalRecords + 1

                  return (
                    <GlassCard
                      key={classItem.id}
                      clickable
                      onClick={() => setSelectedClass(classItem)}
                    >
                      <div className="flex items-start justify-between mb-md">
                        <div>
                          <h3 className="text-body-bold">
                            {classItem.grade}학년 {classItem.classNum}반
                          </h3>
                          <p className="text-caption text-muted">
                            학생 {classItem.studentCount}명
                          </p>
                        </div>

                        <span
                          className={`badge ${
                            filledRoster === classItem.studentCount
                              ? 'badge-success'
                              : filledRoster > 0
                              ? 'badge-warning'
                              : 'badge-danger'
                          }`}
                        >
                          명단 {filledRoster}/{classItem.studentCount}
                        </span>
                      </div>

                      {latestRecord ? (
                        <div className="pt-md border-t border-border">
                          <p className="text-caption text-muted">
                            최근 수업: {latestRecord.activity || classItem.lastActivity}
                            {latestPeriod ? ` · ${latestPeriod}교시` : ''}
                          </p>
                          <p className="text-caption text-muted">
                            {latestDomain} · {latestRecord.sequence || latestDomainCount}차시
                          </p>
                          <p className="text-caption text-muted">
                            {getRecordDateLabel(latestDate)}
                          </p>
                          {latestRecord.variation && (
                            <p className="text-caption text-muted">
                              변형: {latestRecord.variation}
                            </p>
                          )}
                          {latestRecord.memo && (
                            <p className="text-caption text-muted">
                              메모: {latestRecord.memo}
                            </p>
                          )}
                          {latestRecord.performance && (
                            <p className="text-caption text-muted">
                              평가: {latestRecord.performance}
                            </p>
                          )}
                          <p className="text-caption text-muted mt-1">
                            총 {totalRecords}차시 · 다음차시 {latestDomain}: {nextSequenceInDomain}차시
                          </p>
                        </div>
                      ) : (
                        <div className="pt-md border-t border-border">
                          <p className="text-caption text-muted">아직 수업 기록이 없습니다</p>
                        </div>
                      )}
                    </GlassCard>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <GlassCard>
          <p className="text-body text-muted text-center">
            학급 정보가 없습니다
          </p>
        </GlassCard>
      )}

      {/* 명단 편집 모달 */}
      {selectedClass && (
        <RosterEditor
          classInfo={selectedClass}
          onClose={() => setSelectedClass(null)}
        />
      )}
    </div>
  )
}
