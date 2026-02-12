import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useClassManager } from '../hooks/useClassManager'
import { useRecommend } from '../hooks/useRecommend'
import FilterPanel from '../components/sketch/FilterPanel'
import ResultCard from '../components/sketch/ResultCard'
import LessonMemo from '../components/sketch/LessonMemo'

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
  }
}

/**
 * 수업스케치 탭
 * 생성형 추천 후보 3개 -> 교사 확정
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

  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '')
  const [memo, setMemo] = useState('')
  const [confirmedId, setConfirmedId] = useState('')

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

    setConfirmedId('')

    if (result.mode === 'generated') {
      toast.success(`${result.candidates.length}개 후보를 생성했습니다`)
      return
    }

    if (result.fallbackActivity) {
      const reasonText = result.meta?.reason ? ` (${result.meta.reason})` : ''
      toast(`생성 실패로 기존 추천 1개를 표시합니다${reasonText}`, { icon: '⚠️' })
      return
    }

    toast.error('조건을 완화해 다시 시도해주세요')
  }

  const handleConfirm = (card) => {
    if (!selectedClassId) {
      toast.error('학급을 먼저 선택해주세요')
      return
    }

    if (!selectedClass) {
      toast.error('학급 정보를 찾을 수 없습니다')
      return
    }

    const date = new Date().toISOString().split('T')[0]

    updateClass(selectedClassId, {
      lastActivity: card.title,
      lastDomain: '스포츠',
      lastDate: date,
      lastGeneratedId: card.id,
    })

    addClassRecord(selectedClassId, {
      classId: selectedClassId,
      date,
      generatedId: card.id,
      title: card.title,
      sport: card.sport,
      fmsTags: card.fmsTags,
      difficulty: card.difficulty,
      note: memo || '',
    })

    setConfirmedId(card.id)
    setMemo('')
    toast.success(`${selectedClass.grade}학년 ${selectedClass.classNum}반 수업이 확정되었습니다`)
  }

  const fallbackCard = legacyToGeneratedCard(recommendedActivity, selectedSport)
  const cardsToRender = generatedCandidates.length > 0 ? generatedCandidates : fallbackCard ? [fallbackCard] : []

  return (
    <div className="container mx-auto px-md py-lg max-w-6xl">
      <div className="flex items-center justify-between mb-lg gap-md">
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

      <div className="grid lg:grid-cols-[360px_1fr] gap-lg">
        <div>
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
        </div>

        <div className="space-y-lg">
          <div className="flex justify-end">
            <button
              onClick={handleRecommend}
              className="py-2 px-4 bg-white/70 text-text rounded-lg font-semibold hover:bg-white transition-all border border-white/80"
            >
              🔄 후보 다시 생성
            </button>
          </div>

          {generateMeta && (
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-md border border-white/80 shadow-glass">
              <div className="text-caption text-muted">생성 메타</div>
              <div className="text-caption text-text">
                시도 {generateMeta.attempts || 0}회 · atom {generateMeta.atomPoolCount || 0}개 · modifier{' '}
                {generateMeta.modifierPoolCount || 0}개
              </div>
            </div>
          )}

          {cardsToRender.length > 0 ? (
            <div className="space-y-md">
              {cardsToRender.map((card, index) => (
                <ResultCard
                  key={card.id}
                  card={card}
                  index={index + 1}
                  onConfirm={handleConfirm}
                  confirmedId={confirmedId}
                />
              ))}
            </div>
          ) : (
            <ResultCard />
          )}

          <LessonMemo memo={memo} onMemoChange={setMemo} />
        </div>
      </div>
    </div>
  )
}
