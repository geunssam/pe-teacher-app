import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useClassManager } from '../hooks/useClassManager'
import { useRecommend } from '../hooks/useRecommend'
import FilterPanel from '../components/sketch/FilterPanel'
import ResultCard from '../components/sketch/ResultCard'
import LessonMemo from '../components/sketch/LessonMemo'

const STEPS = [
  { id: 1, title: '조건 설정' },
  { id: 2, title: '후보 확인' },
  { id: 3, title: '수업 확정' },
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

function buildLessonOutline({ candidate, durationMin, fmsFocus, sportSkills }) {
  const introMin = Math.max(6, Math.round(durationMin * 0.2))
  const closingMin = Math.max(6, Math.round(durationMin * 0.15))
  const developTotal = Math.max(15, durationMin - introMin - closingMin)
  const basePart = Math.max(5, Math.floor(developTotal / 3))
  const remainder = developTotal - basePart * 3
  const developDurations = [basePart, basePart, basePart + remainder]

  const modifiers = (candidate.modifiers || []).map((modifier) => `${modifier.type}: ${modifier.ruleText}`)

  return {
    intro: {
      title: '도입',
      durationMin: introMin,
      bullets: [
        `${candidate.sport} 수업 안전 규칙 및 역할을 2분 내 안내한다.`,
        `FMS 포커스(${fmsFocus.join(', ') || '기본 움직임'}) 중심 준비 활동으로 신체를 활성화한다.`,
        `종목기술(${sportSkills.join(', ') || '기본기'})의 오늘 목표를 명확히 제시한다.`,
      ],
    },
    develop: [
      {
        title: '활동 1. 기본 구조 익히기',
        subtitle: candidate.title,
        durationMin: developDurations[0],
        bullets: candidate.basicRules.slice(0, 3),
      },
      {
        title: '활동 2. 규칙 적용 게임',
        subtitle: '미션과 역할 전환 적용',
        durationMin: developDurations[1],
        bullets: [
          ...candidate.penaltiesMissions.slice(0, 2),
          ...candidate.operationTips.slice(0, 1),
        ],
      },
      {
        title: '활동 3. 전략 변형 라운드',
        subtitle: '부수 규칙 조합 활용',
        durationMin: developDurations[2],
        bullets: [
          ...(modifiers.length > 0 ? modifiers.slice(0, 2) : candidate.operationTips.slice(0, 2)),
          ...candidate.educationEffects.slice(0, 1),
        ],
      },
    ],
    closing: {
      title: '정리',
      durationMin: closingMin,
      bullets: [
        `핵심 성찰: 오늘 가장 잘 된 전략 선택 1가지를 팀별로 공유한다.`,
        `FMS 적용 점검: ${fmsFocus.join(', ') || '기본 움직임'}가 실제 게임에서 어떻게 나타났는지 확인한다.`,
        '저강도 정리 운동 후 장비를 정리하고 다음 차시 연결 과제를 안내한다.',
      ],
    },
  }
}

function StepHeader({ currentStep, onMove, canMoveStep2, canMoveStep3 }) {
  return (
    <div className="flex gap-sm mb-lg overflow-x-auto pb-xs">
      {STEPS.map((step) => {
        const active = currentStep === step.id
        const enabled = step.id === 1 || (step.id === 2 && canMoveStep2) || (step.id === 3 && canMoveStep3)

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

function SectionList({ title, items }) {
  return (
    <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-lg border border-white/80 shadow-glass-strong">
      <h4 className="text-body-bold mb-sm">{title}</h4>
      <ul className="space-y-xs">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="text-caption text-text leading-relaxed">
            • {item}
          </li>
        ))}
      </ul>
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
 * 수업스케치 탭
 * 1단계 조건설정 -> 2단계 후보확인 -> 3단계 수업확정
 */
export default function SketchPage() {
  const { classes, updateClass, addClassRecord, getClassRecords } = useClassManager()
  const {
    selectedGrade,
    selectedSport,
    selectedFmsByCategory,
    selectedFmsFocus,
    selectedSportSkills,
    sportSkillOptions,
    selectedLocation,
    durationMin,
    weatherFilter,
    availableEquipmentText,
    generatedCandidates,
    generateMeta,
    recommendedActivity,

    setSelectedGrade,
    setSelectedSport,
    setSelectedLocation,
    setDurationMin,
    setWeatherFilter,
    setAvailableEquipmentText,
    toggleFmsFocus,
    clearFmsCategory,
    toggleSportSkill,

    getGeneratedRecommendations,

    GRADES,
    SPORTS,
    LOCATIONS,
    FMS_CATEGORIES,
    FMS_OPTIONS_BY_CATEGORY,
  } = useRecommend()

  const [currentStep, setCurrentStep] = useState(1)
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '')
  const [memo, setMemo] = useState('')
  const [selectedCandidate, setSelectedCandidate] = useState(null)
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
  const canMoveStep2 = cardsToRender.length > 0
  const canMoveStep3 = Boolean(selectedCandidate)

  const lessonOutline = useMemo(() => {
    if (!selectedCandidate) {
      return null
    }

    return buildLessonOutline({
      candidate: selectedCandidate,
      durationMin,
      fmsFocus: selectedFmsFocus,
      sportSkills: selectedSportSkills,
    })
  }, [durationMin, selectedCandidate, selectedFmsFocus, selectedSportSkills])

  const handleMoveStep = (stepId) => {
    if (stepId === 2 && !canMoveStep2) {
      return
    }

    if (stepId === 3 && !canMoveStep3) {
      return
    }

    setCurrentStep(stepId)
  }

  const handleRecommend = () => {
    if (selectedClass?.grade) {
      const classGrade = String(selectedClass.grade).includes('학년')
        ? String(selectedClass.grade)
        : `${selectedClass.grade}학년`

      if (!GRADES.includes(classGrade)) {
        toast.error('1차 생성형 추천 범위는 5~6학년입니다')
        return
      }
    }

    const classSize = selectedClass?.studentCount || 24
    const lessonHistory = getClassRecords(selectedClassId).map((record) => record.title)

    const result = getGeneratedRecommendations({
      classSize,
      lessonHistory,
    })

    setSelectedCandidate(null)
    setIsFinalized(false)

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
    setCurrentStep(3)
    toast.success('선택한 후보로 수업스케치를 구성했습니다')
  }

  const handleFinalizeLesson = () => {
    if (!selectedClassId) {
      toast.error('학급을 먼저 선택해주세요')
      return
    }

    if (!selectedClass) {
      toast.error('학급 정보를 찾을 수 없습니다')
      return
    }

    if (!selectedCandidate) {
      toast.error('확정할 후보를 먼저 선택해주세요')
      return
    }

    const date = new Date().toISOString().split('T')[0]

    updateClass(selectedClassId, {
      lastActivity: selectedCandidate.title,
      lastDomain: '스포츠',
      lastDate: date,
      lastGeneratedId: selectedCandidate.id,
    })

    addClassRecord(selectedClassId, {
      classId: selectedClassId,
      date,
      generatedId: selectedCandidate.id,
      title: selectedCandidate.title,
      sport: selectedCandidate.sport,
      fmsTags: selectedCandidate.fmsTags,
      difficulty: selectedCandidate.difficulty,
      note: memo || '',
    })

    setIsFinalized(true)
    toast.success(`${selectedClass.grade}학년 ${selectedClass.classNum}반 수업이 확정되었습니다`)
  }

  return (
    <div className="container mx-auto px-md py-lg max-w-7xl">
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
        canMoveStep3={canMoveStep3}
      />

      {currentStep === 1 && (
        <div className="space-y-md">
          <FilterPanel
            selectedGrade={selectedGrade}
            setSelectedGrade={setSelectedGrade}
            selectedSport={selectedSport}
            setSelectedSport={setSelectedSport}
            selectedFmsByCategory={selectedFmsByCategory}
            selectedFmsFocus={selectedFmsFocus}
            selectedSportSkills={selectedSportSkills}
            sportSkillOptions={sportSkillOptions}
            toggleFmsFocus={toggleFmsFocus}
            clearFmsCategory={clearFmsCategory}
            toggleSportSkill={toggleSportSkill}
            selectedLocation={selectedLocation}
            setSelectedLocation={setSelectedLocation}
            durationMin={durationMin}
            setDurationMin={setDurationMin}
            weatherFilter={weatherFilter}
            setWeatherFilter={setWeatherFilter}
            availableEquipmentText={availableEquipmentText}
            setAvailableEquipmentText={setAvailableEquipmentText}
            GRADES={GRADES}
            SPORTS={SPORTS}
            LOCATIONS={LOCATIONS}
            FMS_CATEGORIES={FMS_CATEGORIES}
            FMS_OPTIONS_BY_CATEGORY={FMS_OPTIONS_BY_CATEGORY}
            onRecommend={handleRecommend}
          />

          <div className="bg-white/60 backdrop-blur-xl rounded-xl p-sm border border-white/80 shadow-glass flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-muted">요약</span>
            <Chip text={`학년 ${selectedGrade}`} />
            <Chip text={`종목 ${selectedSport}`} />
            <Chip text={`FMS ${selectedFmsFocus.length}개`} />
            <Chip text={`기술 ${selectedSportSkills.length}개`} />
            <Chip text={`장소 ${weatherFilter ? '실내' : selectedLocation}`} />
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
              <div className="text-caption text-muted">생성 메타</div>
              <div className="text-caption text-text">
                시도 {generateMeta.attempts || 0}회 · atom {generateMeta.atomPoolCount || 0}개 · modifier {generateMeta.modifierPoolCount || 0}개
              </div>
              {generateMeta.topFailureReasons?.length > 0 && (
                <div className="text-caption text-muted mt-xs">
                  실패 주요 원인: {generateMeta.topFailureReasons.map((item) => `${item.reason}(${item.count})`).join(', ')}
                </div>
              )}
            </div>
          )}

          {cardsToRender.length > 0 ? (
            <>
              <div className="hidden md:grid md:grid-cols-3 gap-md items-start">
                {cardsToRender.map((card, index) => (
                  <ResultCard
                    key={card.id}
                    card={card}
                    index={index + 1}
                    onConfirm={handleSelectCandidate}
                    actionLabel="🧾 이 후보로 3단계 스케치"
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
                      actionLabel="🧾 이 후보로 3단계 스케치"
                      selected={selectedCandidate?.id === card.id}
                    />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <ResultCard />
          )}
        </div>
      )}

      {currentStep === 3 && (
        <div className="space-y-md">
          <div className="flex gap-sm">
            <button
              onClick={() => setCurrentStep(2)}
              className="py-2 px-4 bg-white/70 text-text rounded-lg font-semibold hover:bg-white transition-all border border-white/80"
            >
              ← 후보 다시 보기
            </button>
          </div>

          {!selectedCandidate || !lessonOutline ? (
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-xl border border-white/80 shadow-glass-strong">
              <div className="text-body text-muted">먼저 2단계에서 후보를 선택해주세요.</div>
            </div>
          ) : (
            <>
              <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-lg border border-white/80 shadow-glass-strong">
                <div className="flex items-start justify-between gap-md">
                  <div>
                    <div className="text-caption text-muted mb-xs">확정 대상</div>
                    <h2 className="text-card-title">{selectedCandidate.title}</h2>
                    <div className="text-caption text-text mt-xs">
                      {selectedCandidate.sport} · {selectedCandidate.difficulty} · {durationMin}분
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-caption text-muted">추천점수</div>
                    <div className="text-body-bold text-primary">{selectedCandidate.score}점</div>
                  </div>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-md">
                <SectionList
                  title={`${lessonOutline.intro.title} (${lessonOutline.intro.durationMin}분)`}
                  items={lessonOutline.intro.bullets}
                />

                <SectionList
                  title={`${lessonOutline.closing.title} (${lessonOutline.closing.durationMin}분)`}
                  items={lessonOutline.closing.bullets}
                />
              </div>

              <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-lg border border-white/80 shadow-glass-strong">
                <h3 className="text-card-title mb-md">전개 ({lessonOutline.develop.reduce((sum, activity) => sum + activity.durationMin, 0)}분)</h3>
                <div className="grid lg:grid-cols-3 gap-md">
                  {lessonOutline.develop.map((activity, index) => (
                    <div key={activity.title} className="bg-white/50 rounded-xl border border-white/80 p-md">
                      <div className="text-body-bold mb-xs">{activity.title}</div>
                      <div className="text-caption text-muted mb-sm">{activity.subtitle} · {activity.durationMin}분</div>
                      <ul className="space-y-xs">
                        {activity.bullets.map((bullet, bulletIndex) => (
                          <li key={`${index}-${bulletIndex}`} className="text-caption text-text leading-relaxed">
                            • {bullet}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

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
            </>
          )}
        </div>
      )}
    </div>
  )
}
