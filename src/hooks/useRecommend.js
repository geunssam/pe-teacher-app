import { useState, useEffect } from 'react'
import activitiesData from '../data/activities.json'

/**
 * 활동 추천 엔진 Hook
 * 
 * 3단 필터 캐스케이드:
 * 1. 학년 선택
 * 2. 영역 선택 (운동/스포츠/표현)
 * 3. 세부영역 선택 (중영역)
 * 
 * + 날씨 자동 필터 (비/미세먼지 나쁨 → rainOk:true만)
 */

const ACTIVITIES = activitiesData.activities

export function useRecommend() {
  const [selectedGrade, setSelectedGrade] = useState('3학년')
  const [selectedDomain, setSelectedDomain] = useState('') // 운동/스포츠/표현
  const [selectedSub, setSelectedSub] = useState('') // 중영역
  const [weatherFilter, setWeatherFilter] = useState(false) // 날씨 자동 필터 활성화
  
  const [filteredActivities, setFilteredActivities] = useState([])
  const [recommendedActivity, setRecommendedActivity] = useState(null)

  // 필터링된 활동 목록 업데이트
  useEffect(() => {
    let filtered = ACTIVITIES

    // 학년 필터
    if (selectedGrade) {
      filtered = filtered.filter((act) => act.grades.includes(selectedGrade))
    }

    // 영역 필터
    if (selectedDomain) {
      filtered = filtered.filter((act) => act.domain === selectedDomain)
    }

    // 세부영역 필터
    if (selectedSub) {
      filtered = filtered.filter((act) => act.sub === selectedSub)
    }

    // 날씨 필터 (실내 가능 활동만)
    if (weatherFilter) {
      filtered = filtered.filter((act) => act.rainOk === true)
    }

    setFilteredActivities(filtered)
  }, [selectedGrade, selectedDomain, selectedSub, weatherFilter])

  /**
   * 랜덤 추천
   * 필터링된 풀에서 랜덤 1개 선택
   */
  const getRandomRecommendation = () => {
    if (filteredActivities.length === 0) {
      // Fallback: rainOk 전체에서 추천
      const rainOkActivities = ACTIVITIES.filter((act) => act.rainOk === true)
      if (rainOkActivities.length > 0) {
        const randomIndex = Math.floor(Math.random() * rainOkActivities.length)
        setRecommendedActivity(rainOkActivities[randomIndex])
        return rainOkActivities[randomIndex]
      }
      return null
    }

    const randomIndex = Math.floor(Math.random() * filteredActivities.length)
    const activity = filteredActivities[randomIndex]
    setRecommendedActivity(activity)
    return activity
  }

  /**
   * 영역별 세부영역 목록 반환
   */
  const getSubDomains = (domain) => {
    const subs = new Set()
    ACTIVITIES.filter((act) => act.domain === domain).forEach((act) => {
      subs.add(act.sub)
    })
    return Array.from(subs)
  }

  /**
   * 특정 활동 ID로 조회
   */
  const getActivityById = (id) => {
    return ACTIVITIES.find((act) => act.id === id)
  }

  return {
    // 상태
    selectedGrade,
    selectedDomain,
    selectedSub,
    weatherFilter,
    filteredActivities,
    recommendedActivity,

    // 액션
    setSelectedGrade,
    setSelectedDomain,
    setSelectedSub,
    setWeatherFilter,
    getRandomRecommendation,
    getSubDomains,
    getActivityById,

    // 상수
    ACTIVITIES,
    GRADES: ['3학년', '4학년', '5학년', '6학년'],
    DOMAINS: ['운동', '스포츠', '표현']
  }
}
