// ✏️ 수업스케치 탭 — 핵심 기능. 2단계: 조건설정 → 수업확정 | 필터UI→components/sketch/FilterPanel.jsx, 엔진→hooks/useRecommend.js, 빌더→utils/recommend/lessonOutlineBuilder.js
import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useClassManager } from '../hooks/useClassManager'
import { useRecommend } from '../hooks/useRecommend'
import FilterPanel from '../components/sketch/FilterPanel'
import ResultCard from '../components/sketch/ResultCard'
import LessonMemo from '../components/sketch/LessonMemo'
import { buildLessonOutline, cloneLessonOutline } from '../utils/recommend/lessonOutlineBuilder'

const STEPS = [
  { id: 1, title: '조건 설정' },
  { id: 2, title: '수업 확정' },
]

function legacyToGeneratedCard(activity, sport) {
  if (!activity) {
    return null
  }

  return {
    id: `legacy-${activity.id}`,
    title: activity.name,
    sport,
    sportSkillTags: [],
    fmsTags: [activity.sub, '기본기'],
    difficulty: activity.difficulty <= 1 ? '쉬움' : activity.difficulty >= 3 ? '도전' : '중간',
    basicRules: [activity.desc || '활동 기본 규칙을 교사가 수업 맥락에 맞게 안내합니다.'],
    penaltiesMissions: ['실수 시 핵심 동작 1회 복습 후 재참여합니다.'],
    operationTips: [`활동 권장 시간: ${activity.duration || 40}분`, '학생 수준에 따라 거리와 인원 구성을 조정합니다.'],
    educationEffects: ['기초 기술을 반복해 경기 이해도를 높입니다.'],
    equipment: activity.equipment || [],
    youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(
      activity.youtubeKeyword || activity.name
    )}`,
    score: 55,
    explanation: '생성 엔진 조건이 맞지 않아 기존 랜덤 추천에서 fallback된 활동입니다.',
    modifiers: [],
  }
}

const FAILURE_LABELS = {
  '시간 초과': '수업 시간을 초과합니다.',
  '장소 불일치': '선택한 장소에 맞지 않습니다.',
  '준비물 부족': '교구를 추가해주세요.',
  '장비 부족': '필요 장비가 부족합니다.',
  '학년 미지원': '해당 학년에서 지원하지 않습니다.',
  '종목 미지원': '해당 종목 데이터가 없습니다.',
}

function formatFailureReason(reason) {
  return FAILURE_LABELS[reason] || reason
}

function StepHeader({ currentStep, onMove, canMoveStep2 }) {
  return (
    <div className="flex gap-sm mb-lg overflow-x-auto pb-xs">
      {STEPS.map((step) => {
        const active = currentStep === step.id
        const enabled = step.id === 1 || (step.id === 2 && canMoveStep2)

        return (
          <button
            key={step.id}
            onClick={() => enabled && onMove(step.id)}
            disabled={!enabled}
            className={`px-4 py-2 rounded-full text-sm font-semibold border whitespace-nowrap transition-all ${
              active
                ? 'bg-primary text-white border-primary'
                : enabled
                ? 'bg-white/70 text-text border-white/80 hover:bg-white'
                : 'bg-white/40 text-muted border-white/60 cursor-not-allowed'
            }`}
          >
            {step.id}. {step.title}
          </button>
        )
      })}
    </div>
  )
}

function Chip({ text }) {
  return (
    <span className="text-[11px] px-2 py-1 bg-white/70 rounded-md border border-white/80 text-text">
      {text}
    </span>
  )
}

/**
 * LockIcon: locked 항목 표시 (빨간 자물쇠)
 */
function LockIcon() {
  return (
    <span className="inline-flex items-center text-danger/70 mr-1" title="핵심 항목 (수정 불가)">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
      </svg>
    </span>
  )
}

/**
 * EditIcon: flexible 항목 표시 (파란 연필)
 */
function EditIcon() {
  return (
    <span className="inline-flex items-center text-primary/70 mr-1" title="편집 가능">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
      </svg>
    </span>
  )
}

/**
 * 수업스케치 탭
 * 모든 모드 2단계: 조건설정 → 수업확정 (인라인 편집 통합)
 */
export default function SketchPage() {
  const { classes, updateClass, addClassRecord, getClassRecords } = useClassManager()
  const {
    selectedGrade,
    selectedDomain,
    selectedSub,
    selectedSport,
    selectedFmsByCategory,
    selectedFmsFocus,
    selectedSportSkills,
    sportSkillOptions,
    selectedSpace,
    selectedStructureIds,
    durationMin,
    availableEquipmentText,
    recommendAvailability,
    compatibleModuleCounts,
    generatedCandidates,
    generateMeta,
    recommendedActivity,
    filteredSports,
    nLessonMode,
    nLessonCount,
    generatedLessonSequence,
    isSixthSoccerSingleMode,
    primaryFmsFocus,
    primarySportSkill,
    fmsCurriculumGuide,

    setSelectedGrade,
    setSelectedDomain,
    setSelectedSub,
    setSelectedSport,
    setSelectedSpace,
    setDurationMin,
    setAvailableEquipmentText,
    toggleFmsFocus,
    clearFmsCategory,
    toggleSportSkill,
    toggleStructure,
    setNLessonMode,
    setNLessonCount,

    getGeneratedRecommendations,
    getGeneratedNLessonRecommendations,

    GRADES,
    DOMAINS,
    SUB_DOMAINS_BY_DOMAIN,
    SPORTS,
    SPACES,
    DURATION_OPTIONS,
    FMS_CATEGORIES,
    FMS_OPTIONS_BY_CATEGORY,
  } = useRecommend()

  const [currentStep, setCurrentStep] = useState(1)
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '')
  const [memo, setMemo] = useState('')
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [editableOutline, setEditableOutline] = useState(null)
  const [isFinalized, setIsFinalized] = useState(false)

  useEffect(() => {
    if (!selectedClassId && classes.length > 0) {
      setSelectedClassId(classes[0].id)
    }
  }, [classes, selectedClassId])

  const selectedClass = useMemo(
    () => classes.find((classInfo) => classInfo.id === selectedClassId) || null,
    [classes, selectedClassId]
  )

  useEffect(() => {
    if (!selectedClass?.grade) {
      return
    }

    const classGrade = String(selectedClass.grade).includes('학년')
      ? String(selectedClass.grade)
      : `${selectedClass.grade}학년`

    if (GRADES.includes(classGrade) && selectedGrade !== classGrade) {
      setSelectedGrade(classGrade)
    }
  }, [GRADES, selectedClass, selectedGrade, setSelectedGrade])

  const fallbackCard = legacyToGeneratedCard(recommendedActivity, selectedSport)
  const cardsToRender = generatedCandidates.length > 0 ? generatedCandidates : fallbackCard ? [fallbackCard] : []
  const hasNLessonResults = nLessonMode && generatedLessonSequence?.meta?.successCount > 0
  const canMoveStep2 = cardsToRender.length > 0 || hasNLessonResults

  // Build outline for selected candidate
  const currentOutline = useMemo(() => {
    if (editableOutline) return editableOutline
    if (!selectedCandidate) return null

    return buildLessonOutline({
      candidate: selectedCandidate,
      durationMin,
      fmsFocus: selectedFmsFocus,
      sportSkills: selectedSportSkills,
      grade: selectedGrade,
    })
  }, [durationMin, editableOutline, selectedCandidate, selectedFmsFocus, selectedSportSkills, selectedGrade])

  // When selectedCandidate changes, rebuild editable outline
  useEffect(() => {
    if (!selectedCandidate) {
      setEditableOutline(null)
      return
    }
    const outline = buildLessonOutline({
      candidate: selectedCandidate,
      durationMin,
      fmsFocus: selectedFmsFocus,
      sportSkills: selectedSportSkills,
      grade: selectedGrade,
    })
    setEditableOutline(cloneLessonOutline(outline))
  }, [selectedCandidate?.id])

  const updateActivityField = (activityIndex, field, value) => {
    setEditableOutline((prev) => {
      if (!prev?.develop?.[activityIndex]) return prev
      const nextDevelop = prev.develop.map((activity, index) =>
        index === activityIndex ? { ...activity, [field]: value } : activity
      )
      return { ...prev, develop: nextDevelop }
    })
  }

  const updateActivityBullet = (activityIndex, bulletIndex, value) => {
    setEditableOutline((prev) => {
      if (!prev?.develop?.[activityIndex]?.bullets?.[bulletIndex] && prev?.develop?.[activityIndex]?.bullets?.[bulletIndex] !== '') {
        return prev
      }
      const nextDevelop = prev.develop.map((activity, index) => {
        if (index !== activityIndex) return activity
        const nextBullets = [...(activity.bullets || [])]
        nextBullets[bulletIndex] = value
        return { ...activity, bullets: nextBullets }
      })
      return { ...prev, develop: nextDevelop }
    })
  }

  const addActivityBullet = (activityIndex) => {
    setEditableOutline((prev) => {
      if (!prev?.develop?.[activityIndex]) return prev
      const nextDevelop = prev.develop.map((activity, index) =>
        index === activityIndex
          ? {
            ...activity,
            bullets: [...(activity.bullets || []), '새 활동 지시를 입력하세요.'],
            bulletMeta: [...(activity.bulletMeta || []), { editable: true }],
          }
          : activity
      )
      return { ...prev, develop: nextDevelop }
    })
  }

  const removeActivityBullet = (activityIndex, bulletIndex) => {
    setEditableOutline((prev) => {
      if (!prev?.develop?.[activityIndex]) return prev
      const nextDevelop = prev.develop.map((activity, index) => {
        if (index !== activityIndex) return activity
        const nextBullets = (activity.bullets || []).filter((_, i) => i !== bulletIndex)
        const nextMeta = (activity.bulletMeta || []).filter((_, i) => i !== bulletIndex)
        return {
          ...activity,
          bullets: nextBullets.length > 0 ? nextBullets : ['핵심 수행 문장을 입력하세요.'],
          bulletMeta: nextMeta.length > 0 ? nextMeta : [{ editable: true }],
        }
      })
      return { ...prev, develop: nextDevelop }
    })
  }

  const updateIntroBullet = (bulletIndex, value) => {
    setEditableOutline((prev) => {
      if (!prev?.intro?.bullets?.[bulletIndex] && prev?.intro?.bullets?.[bulletIndex] !== '') return prev
      const nextBullets = [...(prev.intro.bullets || [])]
      nextBullets[bulletIndex] = value
      return { ...prev, intro: { ...prev.intro, bullets: nextBullets } }
    })
  }

  const updateClosingBullet = (bulletIndex, value) => {
    setEditableOutline((prev) => {
      if (!prev?.closing?.bullets?.[bulletIndex] && prev?.closing?.bullets?.[bulletIndex] !== '') return prev
      const nextBullets = [...(prev.closing.bullets || [])]
      nextBullets[bulletIndex] = value
      return { ...prev, closing: { ...prev.closing, bullets: nextBullets } }
    })
  }

  const handleMoveStep = (stepId) => {
    if (stepId === 2 && !canMoveStep2) return
    setCurrentStep(stepId)
  }

  const handleRecommend = () => {
    if (selectedClass?.grade) {
      const classGrade = String(selectedClass.grade).includes('학년')
        ? String(selectedClass.grade)
        : `${selectedClass.grade}학년`

      if (!GRADES.includes(classGrade)) {
        toast.error('추천 범위는 3~6학년입니다')
        return
      }
    }

    const classSize = selectedClass?.studentCount || 24
    const lessonHistory = getClassRecords(selectedClassId).map((record) => record.title)

    setSelectedCandidate(null)
    setEditableOutline(null)
    setIsFinalized(false)

    // N차시 모드
    if (nLessonMode) {
      const nResult = getGeneratedNLessonRecommendations({ classSize, lessonHistory })
      if (nResult.meta.successCount > 0) {
        setCurrentStep(2)
        toast.success(`${nResult.meta.successCount}차시 시퀀스를 생성했습니다`)
      } else {
        toast.error('N차시 시퀀스 생성에 실패했습니다. 조건을 완화해주세요.')
      }
      return
    }

    // 단일 추천 모드
    const result = getGeneratedRecommendations({
      classSize,
      lessonHistory,
    })

    if (result.mode === 'generated') {
      setCurrentStep(2)
      toast.success(`${result.candidates.length}개 후보를 생성했습니다`)
      return
    }

    if (result.fallbackActivity) {
      setCurrentStep(2)
      const reasonText = result.meta?.reason ? ` (${result.meta.reason})` : ''
      toast(`생성 실패로 기존 추천 1개를 표시합니다${reasonText}`, { icon: '⚠️' })
      return
    }

    toast.error('조건을 완화해 다시 시도해주세요')
  }

  const handleSelectCandidate = (card) => {
    setSelectedCandidate(card)
    setIsFinalized(false)
    toast.success('후보를 선택했습니다. 아래에서 수업 플로우를 편집하세요.')
  }

  const persistFinalizedLesson = (candidateToSave) => {
    if (!selectedClassId) {
      toast.error('학급을 먼저 선택해주세요')
      return false
    }

    if (!selectedClass) {
      toast.error('학급 정보를 찾을 수 없습니다')
      return false
    }

    if (!candidateToSave) {
      toast.error('확정할 후보를 먼저 선택해주세요')
      return false
    }

    const date = new Date().toISOString().split('T')[0]

    updateClass(selectedClassId, {
      lastActivity: candidateToSave.title,
      lastDomain: '스포츠',
      lastDate: date,
      lastGeneratedId: candidateToSave.id,
    })

    addClassRecord(selectedClassId, {
      classId: selectedClassId,
      date,
      generatedId: candidateToSave.id,
      title: candidateToSave.title,
      sport: candidateToSave.sport,
      fmsTags: candidateToSave.fmsTags,
      difficulty: candidateToSave.difficulty,
      note: memo || '',
      ...(candidateToSave.structureId && {
        structureId: candidateToSave.structureId,
        structureName: candidateToSave.structureName,
      }),
      ...(candidateToSave.skillId && {
        skillId: candidateToSave.skillId,
        skillName: candidateToSave.skillName,
      }),
      ...(candidateToSave.modifiers && {
        modifierIds: candidateToSave.modifiers.map((m) => m.id),
      }),
      ...(candidateToSave.phase && { phase: candidateToSave.phase }),
      ...(candidateToSave.lessonNumber && { lessonNumber: candidateToSave.lessonNumber }),
      ...(candidateToSave.sequenceId && { sequenceId: candidateToSave.sequenceId }),
    })

    setIsFinalized(true)
    toast.success(`${selectedClass.grade}학년 ${selectedClass.classNum}반 수업이 확정되었습니다`)
    return true
  }

  const handleFinalizeLesson = () => {
    persistFinalizedLesson(selectedCandidate)
  }

  const isBulletEditable = (section, bulletIndex) => {
    const meta = section?.bulletMeta?.[bulletIndex]
    return meta?.editable !== false
  }

  return (
    <div className="container mx-auto px-md py-lg max-w-2xl">
      <div className="flex items-center justify-between mb-md gap-md">
        <h1 className="text-page-title">✏️ 수업스케치</h1>

        {classes.length > 0 && (
          <select
            value={selectedClassId}
            onChange={(event) => setSelectedClassId(event.target.value)}
            className="py-2 px-4 bg-white/80 border border-white/80 rounded-lg font-semibold text-text focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
          >
            {classes.map((classInfo) => (
              <option key={classInfo.id} value={classInfo.id}>
                {classInfo.grade}학년 {classInfo.classNum}반
              </option>
            ))}
          </select>
        )}
      </div>

      <StepHeader
        currentStep={currentStep}
        onMove={handleMoveStep}
        canMoveStep2={canMoveStep2}
      />

      {currentStep === 1 && (
        <div className="space-y-md">
          <FilterPanel
            selectedGrade={selectedGrade}
            setSelectedGrade={setSelectedGrade}
            selectedDomain={selectedDomain}
            setSelectedDomain={setSelectedDomain}
            selectedSub={selectedSub}
            setSelectedSub={setSelectedSub}
            selectedSport={selectedSport}
            setSelectedSport={setSelectedSport}
            selectedFmsByCategory={selectedFmsByCategory}
            selectedFmsFocus={selectedFmsFocus}
            selectedSportSkills={selectedSportSkills}
            sportSkillOptions={sportSkillOptions}
            toggleFmsFocus={toggleFmsFocus}
            clearFmsCategory={clearFmsCategory}
            toggleSportSkill={toggleSportSkill}
            selectedSpace={selectedSpace}
            setSelectedSpace={setSelectedSpace}
            selectedStructureIds={selectedStructureIds}
            toggleStructure={toggleStructure}
            durationMin={durationMin}
            setDurationMin={setDurationMin}
            availableEquipmentText={availableEquipmentText}
            setAvailableEquipmentText={setAvailableEquipmentText}
            recommendAvailability={recommendAvailability}
            compatibleModuleCounts={compatibleModuleCounts}
            fmsCurriculumGuide={fmsCurriculumGuide}
            isSixthSoccerSingleMode={isSixthSoccerSingleMode}
            GRADES={GRADES}
            DOMAINS={DOMAINS}
            SUB_DOMAINS_BY_DOMAIN={SUB_DOMAINS_BY_DOMAIN}
            SPORTS={SPORTS}
            filteredSports={filteredSports}
            SPACES={SPACES}
            DURATION_OPTIONS={DURATION_OPTIONS}
            FMS_CATEGORIES={FMS_CATEGORIES}
            FMS_OPTIONS_BY_CATEGORY={FMS_OPTIONS_BY_CATEGORY}
            onRecommend={handleRecommend}
          />

          {/* N차시 모드 토글 */}
          <div className="bg-white/60 backdrop-blur-xl rounded-xl p-3 border border-white/80 shadow-glass">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-text">N차시 모드</span>
                <span className="text-[10px] text-muted">차시별 난이도 자동 배치</span>
              </div>
              <button
                onClick={() => setNLessonMode(!nLessonMode)}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  nLessonMode ? 'bg-primary' : 'bg-black/10'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    nLessonMode ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            {nLessonMode && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[11px] text-text/60">차시 수</span>
                <select
                  value={nLessonCount}
                  onChange={(e) => setNLessonCount(Number(e.target.value))}
                  className="py-1 px-2 bg-white/70 border border-white/80 rounded-lg text-xs text-text font-semibold"
                >
                  {[2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}차시
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-1 text-[10px] text-muted">
                  {Array.from({ length: nLessonCount }, (_, i) => {
                    const phases = { 1: '기본', 2: '기본', 3: '응용', 4: '챌린지', 5: '챌린지' }
                    return (
                      <span key={i} className="px-1 py-0.5 bg-white/70 rounded">
                        {i + 1}차시={phases[i + 1]}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white/60 backdrop-blur-xl rounded-xl p-sm border border-white/80 shadow-glass flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-muted">요약</span>
            <Chip text={`학년 ${selectedGrade}`} />
            <Chip text={`종목 ${selectedSport}`} />
            <Chip text={`FMS ${selectedFmsFocus.length}개`} />
            <Chip text={`기술 ${selectedSportSkills.length}개`} />
            <Chip text={`장소 ${selectedSpace}`} />
            <Chip text={`시간 ${durationMin}분`} />
            {canMoveStep2 && (
              <button
                onClick={() => setCurrentStep(2)}
                className="ml-auto py-1.5 px-3 bg-primary text-white rounded-lg text-xs font-semibold hover:opacity-90"
              >
                2단계 이동
              </button>
            )}
          </div>
        </div>
      )}

      {currentStep === 2 && (
        <div className="space-y-md">
          <div className="flex items-center justify-between gap-sm flex-wrap">
            <div className="flex gap-sm">
              <button
                onClick={() => setCurrentStep(1)}
                className="py-2 px-4 bg-white/70 text-text rounded-lg font-semibold hover:bg-white transition-all border border-white/80"
              >
                ← 조건 수정
              </button>
              <button
                onClick={handleRecommend}
                className="py-2 px-4 bg-white/70 text-text rounded-lg font-semibold hover:bg-white transition-all border border-white/80"
              >
                🔄 후보 다시 생성
              </button>
            </div>
          </div>

          {generateMeta && (
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-md border border-white/80 shadow-glass">
              <div className="text-caption text-muted">
                생성 메타 {generateMeta.engine ? `(${generateMeta.engine})` : ''}
              </div>
              <div className="text-caption text-text">
                시도 {generateMeta.attempts || 0}회
                {generateMeta.pairCount != null && ` · 페어 ${generateMeta.pairCount}개`}
                {generateMeta.structureCount != null && ` · 구조 ${generateMeta.structureCount}개`}
                {generateMeta.skillCount != null && ` · 기술 ${generateMeta.skillCount}개`}
                {generateMeta.modifierCount != null && ` · 변형 ${generateMeta.modifierCount}개`}
                {generateMeta.atomPoolCount != null && ` · atom ${generateMeta.atomPoolCount}개`}
                {generateMeta.modifierPoolCount != null && ` · modifier ${generateMeta.modifierPoolCount}개`}
              </div>
              {generateMeta.topFailureReasons?.length > 0 && (
                <div className="text-caption text-muted mt-xs">
                  실패 주요 원인: {generateMeta.topFailureReasons.map((item) => `${formatFailureReason(item.reason)}(${item.count}회)`).join(', ')}
                </div>
              )}
            </div>
          )}

          {/* N차시 시퀀스 표시 */}
          {nLessonMode && generatedLessonSequence ? (
            <div className="space-y-md">
              <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-md border border-white/80 shadow-glass-strong">
                <h3 className="text-body-bold mb-sm">
                  {generatedLessonSequence.meta.successCount}차시 시퀀스
                </h3>
                <div className="text-caption text-muted">
                  성공 {generatedLessonSequence.meta.successCount} / 총 {generatedLessonSequence.meta.lessonCount}차시
                </div>
              </div>

              {generatedLessonSequence.lessons.map((lesson) => (
                <div key={lesson.lessonNumber}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center shrink-0">
                      {lesson.lessonNumber}
                    </span>
                    <span className="text-xs font-semibold text-text">
                      {lesson.lessonNumber}차시
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                      lesson.phase === '기본' ? 'bg-success/20 text-success'
                        : lesson.phase === '응용' ? 'bg-warning/20 text-warning'
                        : 'bg-danger/20 text-danger'
                    }`}>
                      {lesson.phase}
                    </span>
                  </div>
                  {lesson.candidate ? (
                    <ResultCard
                      card={lesson.candidate}
                      index={lesson.lessonNumber}
                      onConfirm={handleSelectCandidate}
                      actionLabel="이 차시로 수업 스케치"
                      selected={selectedCandidate?.id === lesson.candidate.id}
                    />
                  ) : (
                    <div className="bg-white/40 rounded-xl p-md border border-white/60 text-center">
                      <div className="text-caption text-muted">
                        {lesson.failureReason || '후보를 생성하지 못했습니다.'}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : cardsToRender.length > 0 ? (
            <>
              {/* 후보 카드 영역 */}
              <div className="hidden md:grid md:grid-cols-3 gap-md items-start">
                {cardsToRender.map((card, index) => (
                  <ResultCard
                    key={card.id}
                    card={card}
                    index={index + 1}
                    onConfirm={handleSelectCandidate}
                    actionLabel="이 후보 선택"
                    selected={selectedCandidate?.id === card.id}
                  />
                ))}
              </div>

              <div className="md:hidden flex gap-md overflow-x-auto snap-x snap-mandatory pb-sm">
                {cardsToRender.map((card, index) => (
                  <div key={card.id} className="min-w-[88%] snap-center">
                    <ResultCard
                      card={card}
                      index={index + 1}
                      onConfirm={handleSelectCandidate}
                      actionLabel="이 후보 선택"
                      selected={selectedCandidate?.id === card.id}
                    />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <ResultCard />
          )}

          {/* 선택된 후보의 수업 아웃라인 인라인 편집 */}
          {selectedCandidate && editableOutline && (
            <div className="space-y-md mt-md">
              <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-lg border border-white/80 shadow-glass-strong">
                <div className="flex items-start justify-between gap-md">
                  <div>
                    <div className="text-caption text-muted mb-xs">수업 플로우 편집</div>
                    <h3 className="text-card-title">{selectedCandidate.title}</h3>
                    <div className="text-caption text-text mt-xs">
                      {selectedCandidate.sport} · {selectedCandidate.difficulty} · {durationMin}분
                    </div>
                    {editableOutline.gradeHint && (
                      <div className="text-[10px] mt-1 px-2 py-0.5 bg-primary/10 text-primary rounded inline-block">
                        {selectedGrade} {editableOutline.gradeHint.level}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-caption text-muted">추천점수</div>
                    <div className="text-body-bold text-primary">{selectedCandidate.score}점</div>
                  </div>
                </div>
                {/* locked/flexible 범례 */}
                <div className="flex items-center gap-3 mt-sm text-[10px] text-muted">
                  <span className="flex items-center gap-0.5"><LockIcon /> 핵심 (수정 불가)</span>
                  <span className="flex items-center gap-0.5"><EditIcon /> 편집 가능</span>
                </div>
              </div>

              {/* 도입 */}
              <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-lg border border-white/80 shadow-glass-strong">
                <h4 className="text-body-bold mb-sm">{editableOutline.intro.title} ({editableOutline.intro.durationMin}분)</h4>
                <div className="space-y-xs">
                  {(editableOutline.intro.bullets || []).map((bullet, bulletIndex) => {
                    const editable = isBulletEditable(editableOutline.intro, bulletIndex)
                    return (
                      <div key={`intro-${bulletIndex}`} className="flex items-start gap-xs">
                        <span className="mt-1.5 shrink-0">
                          {editable ? <EditIcon /> : <LockIcon />}
                        </span>
                        {editable ? (
                          <textarea
                            value={bullet}
                            rows={2}
                            onChange={(e) => updateIntroBullet(bulletIndex, e.target.value)}
                            className="w-full py-1.5 px-2 bg-white/85 border border-white/80 rounded-lg text-xs text-text leading-relaxed resize-y"
                          />
                        ) : (
                          <p className="text-caption text-text leading-relaxed py-1.5">• {bullet}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 전개 */}
              <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-lg border border-white/80 shadow-glass-strong">
                <h3 className="text-card-title mb-md">
                  전개 ({editableOutline.develop.reduce((sum, activity) => sum + Number(activity.durationMin || 0), 0)}분)
                </h3>
                <div className="grid grid-cols-1 gap-md">
                  {editableOutline.develop.map((activity, index) => (
                    <div
                      key={`${activity.title}-${index}`}
                      className={`rounded-xl border p-md ${
                        index === 0
                          ? 'bg-sky-50/70 border-sky-200'
                          : index === 1
                          ? 'bg-amber-50/70 border-amber-200'
                          : 'bg-emerald-50/70 border-emerald-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-sm">
                        <span className="text-[11px] font-semibold text-text/60">활동 카드 {index + 1}</span>
                        <span className="text-[11px] text-muted">인라인 편집</span>
                      </div>
                      <input
                        value={activity.title}
                        onChange={(event) => updateActivityField(index, 'title', event.target.value)}
                        className="w-full mb-xs py-1.5 px-2 bg-white/80 border border-white/80 rounded-lg text-sm font-semibold text-text"
                      />
                      <div className="grid grid-cols-[1fr_auto] gap-xs mb-sm">
                        <input
                          value={activity.subtitle}
                          onChange={(event) => updateActivityField(index, 'subtitle', event.target.value)}
                          className="w-full py-1.5 px-2 bg-white/80 border border-white/80 rounded-lg text-xs text-text"
                        />
                        <input
                          type="number"
                          min={1}
                          value={activity.durationMin}
                          onChange={(event) => updateActivityField(index, 'durationMin', Number(event.target.value || 0))}
                          className="w-20 py-1.5 px-2 bg-white/80 border border-white/80 rounded-lg text-xs text-text"
                        />
                      </div>

                      <div className="space-y-xs">
                        {(activity.bullets || []).map((bullet, bulletIndex) => {
                          const editable = isBulletEditable(activity, bulletIndex)
                          return (
                            <div key={`${index}-bullet-${bulletIndex}`} className="flex items-start gap-xs">
                              <span className="mt-1.5 shrink-0">
                                {editable ? <EditIcon /> : <LockIcon />}
                              </span>
                              {editable ? (
                                <textarea
                                  value={bullet}
                                  rows={2}
                                  onChange={(event) => updateActivityBullet(index, bulletIndex, event.target.value)}
                                  className="w-full py-1.5 px-2 bg-white/85 border border-white/80 rounded-lg text-xs text-text leading-relaxed resize-y"
                                />
                              ) : (
                                <p className="text-caption text-text leading-relaxed py-1.5 flex-1">• {bullet}</p>
                              )}
                              {editable && (
                                <button
                                  onClick={() => removeActivityBullet(index, bulletIndex)}
                                  className="shrink-0 py-1 px-2 rounded-md text-[11px] bg-white/80 border border-white/80 text-muted hover:text-text"
                                >
                                  삭제
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                      <button
                        onClick={() => addActivityBullet(index)}
                        className="mt-sm py-1.5 px-2 rounded-md text-[11px] font-semibold bg-white/80 border border-white/80 text-text hover:bg-white"
                      >
                        + 활동 지시 추가
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 정리 */}
              <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-lg border border-white/80 shadow-glass-strong">
                <h4 className="text-body-bold mb-sm">{editableOutline.closing.title} ({editableOutline.closing.durationMin}분)</h4>
                <div className="space-y-xs">
                  {(editableOutline.closing.bullets || []).map((bullet, bulletIndex) => {
                    const editable = isBulletEditable(editableOutline.closing, bulletIndex)
                    return (
                      <div key={`closing-${bulletIndex}`} className="flex items-start gap-xs">
                        <span className="mt-1.5 shrink-0">
                          {editable ? <EditIcon /> : <LockIcon />}
                        </span>
                        {editable ? (
                          <textarea
                            value={bullet}
                            rows={2}
                            onChange={(e) => updateClosingBullet(bulletIndex, e.target.value)}
                            className="w-full py-1.5 px-2 bg-white/85 border border-white/80 rounded-lg text-xs text-text leading-relaxed resize-y"
                          />
                        ) : (
                          <p className="text-caption text-text leading-relaxed py-1.5">• {bullet}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 변형 해설 */}
              {editableOutline.modifierGuide?.length > 0 && (
                <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-lg border border-white/80 shadow-glass-strong">
                  <h4 className="text-body-bold mb-sm">적용 변형 해설</h4>
                  <ul className="space-y-xs">
                    {editableOutline.modifierGuide.map((item, index) => (
                      <li key={`mod-guide-${index}`} className="text-caption text-text leading-relaxed">
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 메모 + 확정 버튼 */}
              <LessonMemo memo={memo} onMemoChange={setMemo} />

              <button
                onClick={handleFinalizeLesson}
                disabled={isFinalized}
                className={`w-full py-3 px-4 rounded-xl font-semibold transition-all ${
                  isFinalized
                    ? 'bg-success/20 text-success cursor-default'
                    : 'bg-primary text-white hover:opacity-90'
                }`}
              >
                {isFinalized ? '✅ 수업 확정 저장 완료' : '✅ 수업 확정 저장'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
