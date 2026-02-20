// 교육과정 단원 설계 — 필터 칩 바 + viewMode 전환 (전체/교과서/내 활동/연간 계획/활동 추가) | 훅→useCurriculum, 컴포넌트→components/curriculum/
import { useState, useMemo, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCurriculum } from '../hooks/useCurriculum'
import { useAnnualPlan } from '../hooks/useAnnualPlan'
import { useSchoolCalendar } from '../hooks/useSchoolCalendar'
import { useSchedule } from '../hooks/useSchedule'
import UnitCard from '../components/curriculum/UnitCard'
import LessonTimeline from '../components/curriculum/LessonTimeline'
import ActivityDetailModal from '../components/curriculum/ActivityDetailModal'
import AlternativeActivityModal from '../components/curriculum/AlternativeActivityModal'
import MyActivityList from '../components/curriculum/MyActivityList'
import MyActivityForm from '../components/curriculum/MyActivityForm'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useEditedAceLesson } from '../hooks/useEditedAceLesson'
import { generateId } from '../utils/generateId'

const AnnualPlanView = lazy(() => import('../components/curriculum/AnnualPlanView'))

const VIEW_CHIPS = [
  { key: 'all', label: '전체' },
  { key: 'textbook', label: '교과서' },
  { key: 'grade', label: '학년별' },
  { key: 'annual', label: '연간 계획' },
  { key: 'archive', label: '내 활동' },
]

const GRADE_TABS = ['3', '4', '5', '6']

export default function CurriculumPage() {
  const navigate = useNavigate()
  const {
    units, getActivityById, getStandardByCode,
    myActivityList, addMyActivity, updateMyActivity, deleteMyActivity,
    findRelatedActivities,
  } = useCurriculum()
  const { getEditedAceLesson } = useEditedAceLesson()
  const {
    plans,
    createPlan,
    deletePlan,
    addUnitFromTemplate,
    addCustomUnit,
    updateUnit,
    removeUnit,
    assignUnitWeeks,
    autoAssignAllWeeks,
    reorderUnits,
    updateLesson,
    getDomainDistribution,
    getPlanSummary,
  } = useAnnualPlan()
  const { calendar, teachableWeeks, getWeeklyPEHours } = useSchoolCalendar()
  const { baseTimetable } = useSchedule()
  const weeklyPEHours = getWeeklyPEHours(baseTimetable)

  // --- 뷰 모드: 'all' | 'textbook' | 'grade' | 'archive' | 'addForm' ---
  const [viewMode, setViewMode] = useState('all')
  const [selectedGrade, setSelectedGrade] = useState('3')
  const [selectedUnit, setSelectedUnit] = useState(null)
  const [selectedActivity, setSelectedActivity] = useState(null)
  const [isAlternativeModalOpen, setIsAlternativeModalOpen] = useState(false)
  const [activeLessonForAlternative, setActiveLessonForAlternative] = useState(null)
  const [customActivities, setCustomActivities] = useLocalStorage(
    'curriculum_custom_activities_v1',
    {}
  )
  const [customAlternativeIds, setCustomAlternativeIds] = useLocalStorage(
    'curriculum_custom_alternative_ids_v1',
    {}
  )

  const step = selectedUnit ? 2 : 1
  const isUnitView = viewMode === 'all' || viewMode === 'textbook'

  // --- 페이지 제목 ---
  const pageTitle = useMemo(() => {
    if (viewMode === 'archive') return '내 활동'
    if (viewMode === 'addForm') return '활동 추가'
    if (viewMode === 'grade') return '학년별 활동'
    if (viewMode === 'annual') return '연간 수업 계획'
    return '교육과정 단원'
  }, [viewMode])

  const pageDesc = useMemo(() => {
    if (viewMode === 'archive') return '직접 추가한 활동을 관리합니다'
    if (viewMode === 'addForm') return '새로운 활동을 추가합니다'
    if (viewMode === 'grade') return '학년을 선택하면 해당 단원을 볼 수 있습니다'
    if (viewMode === 'annual') return '학년별 단원을 배치하고 주차를 배정합니다'
    return '단원을 선택하면 차시별 수업 흐름을 확인할 수 있습니다'
  }, [viewMode])

  // --- 대체 활동 로직 (기존 유지) ---
  const getAlternativeActivityIds = (unitId, lesson) => {
    const key = String(lesson)
    return customAlternativeIds?.[unitId]?.[key] ?? []
  }

  const getActivityByIdWithCustom = (activityId) => {
    return customActivities?.[activityId] || getActivityById(activityId)
  }

  const openAlternativeModal = (lesson) => {
    setActiveLessonForAlternative(lesson)
    setIsAlternativeModalOpen(true)
  }

  const closeAlternativeModal = () => {
    setIsAlternativeModalOpen(false)
    setActiveLessonForAlternative(null)
  }

  const addAlternativeActivity = (activity) => {
    if (!selectedUnit || !activeLessonForAlternative) {
      closeAlternativeModal()
      return
    }

    const activityId = generateId('alt')
    const lessonKey = String(activeLessonForAlternative.lesson)

    setCustomActivities((prev) => ({
      ...(prev || {}),
      [activityId]: {
        ...activity,
        id: activityId,
      },
    }))

    setCustomAlternativeIds((prev) => {
      const next = { ...(prev || {}) }
      const unitMap = { ...(next[selectedUnit.id] || {}) }
      const lessonIds = Array.isArray(unitMap[lessonKey]) ? unitMap[lessonKey] : []

      if (!lessonIds.includes(activityId)) {
        unitMap[lessonKey] = [...lessonIds, activityId]
      }

      next[selectedUnit.id] = unitMap
      return next
    })

    closeAlternativeModal()
  }

  const removeAlternativeActivity = (unitId, lesson, activityId) => {
    const nextAlternativeIds = (() => {
      const prev = customAlternativeIds || {}
      const next = { ...prev }
      const unitMap = { ...(next[unitId] || {}) }
      const lessonKey = String(lesson)
      const before = Array.isArray(unitMap[lessonKey]) ? unitMap[lessonKey] : []
      const nextLessonIds = before.filter((id) => id !== activityId)

      if (nextLessonIds.length > 0) {
        unitMap[lessonKey] = nextLessonIds
      } else {
        delete unitMap[lessonKey]
      }

      if (Object.keys(unitMap).length > 0) {
        next[unitId] = unitMap
      } else {
        delete next[unitId]
      }

      return next
    })()

    setCustomAlternativeIds(nextAlternativeIds)

    setCustomActivities((prev) => {
      const next = { ...(prev || {}) }
      const isReferenced = Object.values(nextAlternativeIds || {}).some((lessonMap) => {
        if (!lessonMap) return false
        return Object.values(lessonMap).some((ids) => ids?.includes(activityId))
      })

      if (!isReferenced) {
        delete next[activityId]
      }
      return next
    })

    if (selectedActivity?.id === activityId) {
      setSelectedActivity(null)
    }
  }

  // --- 내 활동 저장 후 목록으로 전환 ---
  const handleSaveMyActivity = (activity) => {
    addMyActivity(activity)
    setViewMode('archive')
  }

  // --- 활동을 시간표에 배정 (SchedulePage로 이동) ---
  const handleAssignToSchedule = (activity) => {
    setSelectedActivity(null)
    // 편집된 ACE 수업안이 있으면 우선 사용
    const edited = getEditedAceLesson(activity.id)
    const aceLesson = edited?.aceLesson || activity.aceLesson || null

    navigate('/schedule', {
      state: {
        pendingActivity: {
          name: activity.name,
          domain: activity.domain || '스포츠',
          source: activity.source || '',
          difficulty: activity.difficulty,
          acePhase: activity.acePhase,
          space: activity.space,
          aceLesson,
          originalActivityId: activity.id,
        },
      },
    })
  }

  return (
    <div className="page-container">
      {/* 페이지 제목 + 필터 칩 바 (Step 1에서만 표시) */}
      {step === 1 && (
        <>
          <div className="mb-lg">
            <h1 className="text-page-title">{pageTitle}</h1>
            <p className="text-caption text-muted mt-1">{pageDesc}</p>
          </div>

          {/* 필터 칩 바 */}
          <div className="flex items-center gap-2 mb-lg overflow-x-auto pb-1 no-scrollbar">
            {VIEW_CHIPS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setViewMode(key)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  viewMode === key
                    ? 'bg-[#7C9EF5] text-white border-[#7C9EF5]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-[#7C9EF5]/50'
                }`}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => setViewMode('addForm')}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                viewMode === 'addForm'
                  ? 'bg-[#F5A67C] text-white border-[#F5A67C]'
                  : 'bg-white text-[#F5A67C] border-[#F5A67C]/40 hover:border-[#F5A67C]'
              }`}
            >
              + 활동 추가
            </button>
          </div>
        </>
      )}

      {/* Step 1 - 단원 카드 그리드 (전체 / 교과서) */}
      {step === 1 && isUnitView && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {units.map((unit) => (
            <UnitCard
              key={unit.id}
              unit={unit}
              onClick={() => {
                setSelectedUnit(unit)
                setSelectedActivity(null)
                closeAlternativeModal()
              }}
            />
          ))}
        </div>
      )}

      {/* Step 1 - 학년별 뷰 (UnitCard 그리드) */}
      {step === 1 && viewMode === 'grade' && (
        <>
          {/* 학년 서브 탭 */}
          <div className="flex items-center gap-2 mb-4">
            {GRADE_TABS.map((g) => (
              <button
                key={g}
                onClick={() => setSelectedGrade(g)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                  selectedGrade === g
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                }`}
              >
                {g}학년
              </button>
            ))}
          </div>

          {/* 단원 카드 그리드 */}
          {units.filter((u) => u.grade === selectedGrade + '학년').length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {units
                .filter((u) => u.grade === selectedGrade + '학년')
                .map((unit) => (
                  <UnitCard
                    key={unit.id}
                    unit={unit}
                    onClick={() => {
                      setSelectedUnit(unit)
                      setSelectedActivity(null)
                      closeAlternativeModal()
                    }}
                  />
                ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-3xl mb-3">📂</div>
              <p className="text-sm text-gray-500">{selectedGrade}학년 단원이 아직 없습니다</p>
            </div>
          )}
        </>
      )}

      {/* Step 1 - 연간 계획 뷰 */}
      {step === 1 && viewMode === 'annual' && (
        <Suspense fallback={<div className="text-caption text-textMuted py-8 text-center">연간 계획을 불러오는 중...</div>}>
          <AnnualPlanView
            plans={plans}
            teachableWeeks={teachableWeeks}
            onCreatePlan={createPlan}
            onDeletePlan={deletePlan}
            onAddUnitFromTemplate={addUnitFromTemplate}
            onAddCustomUnit={addCustomUnit}
            onUpdateUnit={updateUnit}
            onRemoveUnit={removeUnit}
            onAssignUnitWeeks={assignUnitWeeks}
            onAutoAssignWeeks={autoAssignAllWeeks}
            onReorderUnits={reorderUnits}
            onUpdateLesson={updateLesson}
            getDomainDistribution={getDomainDistribution}
            getPlanSummary={getPlanSummary}
            calendarYear={calendar.year}
            weeklyPEHours={weeklyPEHours}
          />
        </Suspense>
      )}

      {/* Step 1 - 내 활동 목록 */}
      {step === 1 && viewMode === 'archive' && (
        <MyActivityList
          activities={myActivityList}
          onActivityClick={setSelectedActivity}
          onDelete={deleteMyActivity}
          onAddClick={() => setViewMode('addForm')}
        />
      )}

      {/* Step 1 - 활동 추가 폼 */}
      {step === 1 && viewMode === 'addForm' && (
        <MyActivityForm
          onSave={handleSaveMyActivity}
          onCancel={() => setViewMode('archive')}
        />
      )}

      {/* Step 2: 차시 타임라인 */}
      {step === 2 && selectedUnit && (
        <LessonTimeline
          unit={selectedUnit}
          units={units}
          getActivityById={getActivityByIdWithCustom}
          getStandardByCode={getStandardByCode}
          onActivityClick={setSelectedActivity}
          onBack={() => {
            setSelectedUnit(null)
            closeAlternativeModal()
            setSelectedActivity(null)
          }}
          onAddAlternative={openAlternativeModal}
          onRemoveAlternative={removeAlternativeActivity}
          getAlternativeActivityIds={getAlternativeActivityIds}
        />
      )}

      {/* 활동 상세 모달 + 아이디어 팁 */}
      {selectedActivity && (
        <ActivityDetailModal
          activity={selectedActivity}
          onClose={() => setSelectedActivity(null)}
          relatedActivities={findRelatedActivities(selectedActivity, 5)}
          onActivitySwitch={setSelectedActivity}
          onAssignToSchedule={handleAssignToSchedule}
        />
      )}

      <AlternativeActivityModal
        open={isAlternativeModalOpen}
        lesson={activeLessonForAlternative}
        onClose={closeAlternativeModal}
        onSave={addAlternativeActivity}
      />
    </div>
  )
}
