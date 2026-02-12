import { useState } from 'react'
import { useClassManager } from '../hooks/useClassManager'
import { useRecommend } from '../hooks/useRecommend'
import toast from 'react-hot-toast'
import FilterPanel from '../components/sketch/FilterPanel'
import ResultCard from '../components/sketch/ResultCard'
import VideoSection from '../components/sketch/VideoSection'
import LessonMemo from '../components/sketch/LessonMemo'

/**
 * 수업스케치 탭
 * 활동 추천 + 영상 연동 + 수업 기록
 */
export default function SketchPage() {
  const { classes, updateClass } = useClassManager()
  const {
    selectedGrade,
    selectedDomain,
    selectedSub,
    weatherFilter,
    setSelectedGrade,
    setSelectedDomain,
    setSelectedSub,
    setWeatherFilter,
    getSubDomains,
    getRandomRecommendation,
    recommendedActivity,
    GRADES,
    DOMAINS
  } = useRecommend()

  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '')
  const [memo, setMemo] = useState('')

  // 추천받기
  const handleRecommend = () => {
    const activity = getRandomRecommendation()
    if (activity) {
      toast.success(`${activity.name} 추천!`)
    } else {
      toast.error('조건에 맞는 활동이 없습니다')
    }
  }

  // 수업 결정
  const handleDecide = (activity) => {
    if (!selectedClassId) {
      toast.error('학급을 먼저 선택해주세요')
      return
    }

    const selectedClass = classes.find((c) => c.id === selectedClassId)
    if (!selectedClass) {
      toast.error('학급을 찾을 수 없습니다')
      return
    }

    // 학급 정보 업데이트 (lastActivity, lastDomain, lastDate)
    updateClass(selectedClassId, {
      lastActivity: activity.name,
      lastDomain: activity.domain,
      lastDate: new Date().toISOString().split('T')[0]
    })

    // TODO: 수업 기록 컬렉션에 저장 (Phase 3 Firestore 연동 시)
    // /users/{uid}/classes/{classId}/records/{recordId}
    // { activityName, activityId, domain, subDomain, date, note }

    toast.success(`${selectedClass.grade}학년 ${selectedClass.classNum}반 수업 기록 저장 완료!`)
    setMemo('')
  }

  return (
    <div className="container mx-auto px-md py-lg max-w-4xl">
      {/* 헤더 + 학급 선택 */}
      <div className="flex items-center justify-between mb-lg">
        <h1 className="text-page-title">✏️ 수업스케치</h1>

        {classes.length > 0 && (
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
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

      {/* 컨텐츠 */}
      <div className="grid lg:grid-cols-2 gap-lg">
        {/* 좌측: 필터 패널 */}
        <div>
          <FilterPanel
            selectedGrade={selectedGrade}
            selectedDomain={selectedDomain}
            selectedSub={selectedSub}
            weatherFilter={weatherFilter}
            setSelectedGrade={setSelectedGrade}
            setSelectedDomain={setSelectedDomain}
            setSelectedSub={setSelectedSub}
            setWeatherFilter={setWeatherFilter}
            getSubDomains={getSubDomains}
            GRADES={GRADES}
            DOMAINS={DOMAINS}
            onRecommend={handleRecommend}
          />
        </div>

        {/* 우측: 추천 결과 + 영상 + 메모 */}
        <div className="space-y-lg">
          <ResultCard
            activity={recommendedActivity}
            onDecide={handleDecide}
            onReroll={handleRecommend}
          />

          {recommendedActivity && (
            <>
              <VideoSection activity={recommendedActivity} />
              <LessonMemo memo={memo} onMemoChange={setMemo} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
