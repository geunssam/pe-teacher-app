// 📋 학급 탭 — 학급별 학생 명단 관리 + 수업 기록 조회 | 편집UI→components/classes/RosterEditor.jsx, 데이터→hooks/useClassManager.js
import { useState } from 'react'
import { useClassManager } from '../hooks/useClassManager'
import GlassCard from '../components/common/GlassCard'
import RosterEditor from '../components/classes/RosterEditor'
import ClassEditModal from '../components/classes/ClassEditModal'
import { formatRecordDate, getRecordSortValue } from '../utils/recordDate'
import { confirm } from '../components/common/ConfirmDialog'
import AIButton from '../components/common/AIButton'
import AIResponseCard from '../components/common/AIResponseCard'
import { useAI } from '../hooks/useAI'
import { buildClassAnalysisPrompt } from '../services/aiPrompts'

export default function ClassesPage() {
  const {
    classes,
    getClassesByGrade,
    getClassRecords,
    getClassRecordCount,
    getNextLessonSequence,
    rosters,
    addClass,
    deleteClass,
    updateClass,
  } = useClassManager()
  const classesByGrade = getClassesByGrade()
  const [selectedClass, setSelectedClass] = useState(null)
  const [editModalClass, setEditModalClass] = useState(null) // null=닫힘, {}=추가, {classInfo}=수정
  const [showEditModal, setShowEditModal] = useState(false)
  const { loading: aiLoading, error: aiError, result: aiResult, generate: aiGenerate, reset: aiReset } = useAI()
  const [analyzingClassId, setAnalyzingClassId] = useState(null)

  const handleClassAnalysis = (classItem) => {
    const classRecords = getClassRecords(classItem.id)
    setAnalyzingClassId(classItem.id)
    aiReset()
    const prompt = buildClassAnalysisPrompt(classItem, classRecords)
    aiGenerate(prompt)
  }

  // 학급 추가/수정 모달 핸들러
  const handleOpenAddModal = () => {
    setEditModalClass(null)
    setShowEditModal(true)
  }

  const handleOpenEditModal = (e, classItem) => {
    e.stopPropagation()
    setEditModalClass(classItem)
    setShowEditModal(true)
  }

  const handleSaveClass = (data) => {
    if (editModalClass) {
      // 수정 모드: 인원 수 변경 시 경고
      if (data.studentCount < editModalClass.studentCount) {
        const roster = rosters[editModalClass.id] || []
        const filledCount = roster.filter((s) => s.name).length
        if (data.studentCount < filledCount) {
          if (!window.confirm(
            `현재 ${filledCount}명의 이름이 입력되어 있습니다.\n학생 수를 ${data.studentCount}명으로 줄이면 일부 데이터가 삭제될 수 있습니다.`
          )) return
        }
      }
      updateClass(editModalClass.id, {
        studentCount: data.studentCount,
        color: data.color,
      })
    } else {
      addClass(data)
    }
    setShowEditModal(false)
  }

  const handleDeleteClass = async (e, classItem) => {
    e.stopPropagation()
    const records = getClassRecords(classItem.id)
    const recordCount = records.length
    const msg = recordCount > 0
      ? `${classItem.grade}학년 ${classItem.classNum}반을 삭제하시겠습니까?\n\n${recordCount}건의 수업 기록이 함께 삭제됩니다.`
      : `${classItem.grade}학년 ${classItem.classNum}반을 삭제하시겠습니까?`

    const confirmed = await confirm(msg, '삭제', '취소')
    if (confirmed) {
      deleteClass(classItem.id)
    }
  }

  const getRecordDateLabel = (recordDate) => {
    return formatRecordDate(recordDate)
  }
  const getRecordDate = (record) =>
    record?.recordedAt || record?.createdAt || record?.date

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-lg">
        <h1 className="text-page-title">학급 관리</h1>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-all shadow-sm"
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="8" y1="3" x2="8" y2="13" />
            <line x1="3" y1="8" x2="13" y2="8" />
          </svg>
          학급 추가
        </button>
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
                  const records = [...getClassRecords(classItem.id)].sort(
                    (a, b) =>
                      getRecordSortValue(b.recordedAt || b.createdAt || b.date) -
                      getRecordSortValue(a.recordedAt || a.createdAt || a.date)
                  )
                  const latestRecord = records?.[0]
                  const latestDate = getRecordDate(latestRecord)
                  const latestPeriod = latestRecord?.period
                  const latestDomain = latestRecord?.domain || classItem.lastDomain || '-'
                  const latestVariation = latestRecord?.variation || ''
                  const latestMemo = latestRecord?.memo || latestRecord?.memoText || latestRecord?.note || ''
                  const latestPerformance = latestRecord?.performance || latestRecord?.grade || ''
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

                        <div className="flex items-center gap-1">
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
                          {/* 편집 */}
                          <button
                            onClick={(e) => handleOpenEditModal(e, classItem)}
                            className="p-1.5 rounded-lg hover:bg-black/5 transition-colors text-muted"
                            title="학급 수정"
                          >
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M10.5 1.5a2.12 2.12 0 0 1 3 3L4.5 13.5 1 14l.5-3.5z" />
                            </svg>
                          </button>
                          {/* 삭제 */}
                          <button
                            onClick={(e) => handleDeleteClass(e, classItem)}
                            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-muted hover:text-red-500"
                            title="학급 삭제"
                          >
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="1 3.5 3 3.5 13 3.5" />
                              <path d="M4.5 3.5V2a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1.5M11 3.5v8.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3.5" />
                            </svg>
                          </button>
                        </div>
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
                          {latestVariation && (
                            <p className="text-caption text-muted">
                              변형: {latestVariation}
                            </p>
                          )}
                          {latestMemo && (
                            <p className="text-caption text-muted">
                              메모: {latestMemo}
                            </p>
                          )}
                          {latestPerformance && (
                            <p className="text-caption text-muted">
                              평가: {latestPerformance}
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

                      {/* AI 분석 */}
                      <div className="pt-2 border-t border-border mt-2">
                        <AIButton
                          label="AI 수업 분석"
                          loading={aiLoading && analyzingClassId === classItem.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleClassAnalysis(classItem)
                          }}
                          size="sm"
                        />
                        {analyzingClassId === classItem.id && (
                          <AIResponseCard
                            text={aiResult || ''}
                            loading={aiLoading}
                            error={aiError}
                            onClose={() => {
                              aiReset()
                              setAnalyzingClassId(null)
                            }}
                          />
                        )}
                      </div>
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

      {/* 학급 추가/수정 모달 */}
      {showEditModal && (
        <ClassEditModal
          classInfo={editModalClass}
          onSave={handleSaveClass}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  )
}
