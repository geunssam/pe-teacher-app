// 수업추천 담당 훅 — 날씨+기록+시간표+교육과정 종합 → 학급별 맞춤 수업 활동 추천 | 사용처→RecommendPage
import { useMemo, useCallback, useState } from 'react'
import { useClassManager } from './useClassManager'
import { useSchedule, getWeekRange } from './useSchedule'
import { useSettings } from './useSettings'
import { useCurrentPeriod } from './useCurrentPeriod'
import { useCurriculum } from './useCurriculum'
import { useAI } from './useAI'
import { judgeOutdoorClass } from '../data/mockWeather'
import { buildRecommendationPrompt } from '../services/aiPrompts'

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri']
const WEEKDAY_LABELS = { mon: '월', tue: '화', wed: '수', thu: '목', fri: '금' }
const DAY_INDEX = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4 }

// 시간표 메모에서 특별행사 감지하는 키워드 사전 + 맞춤 안내 메시지
const SPECIAL_EVENT_KEYWORDS = {
  skip: [
    { keyword: '운동회', message: '오늘은 운동회입니다! 체육 수업이 없어요.' },
    { keyword: '현장학습', message: '현장학습일입니다! 체육 수업이 없어요.' },
    { keyword: '소풍', message: '소풍일입니다! 즐거운 하루 보내세요.' },
    { keyword: '수학여행', message: '수학여행 기간입니다! 수업이 없어요.' },
    { keyword: '수련회', message: '수련회 기간입니다! 수업이 없어요.' },
    { keyword: '학예회', message: '학예회 준비/진행일입니다! 체육 수업이 없어요.' },
    { keyword: '시험', message: '시험 기간입니다! 체육 수업이 없어요.' },
    { keyword: '평가', message: '평가일입니다! 일정을 확인해주세요.' },
    { keyword: '재량휴업', message: '재량휴업일입니다! 쉬세요.' },
  ],
  adjust: [
    { keyword: '대피훈련', message: '대피훈련이 있습니다! 담임선생님과 상의 후 시간표를 조정해주세요.' },
    { keyword: '방송조회', message: '방송조회가 있습니다! 시작 시간이 밀릴 수 있어요.' },
    { keyword: '학부모상담', message: '학부모 상담 기간입니다! 일정 조정이 필요할 수 있어요.' },
  ],
  indoor: [
    { keyword: '우천', message: '우천 대비! 실내 활동으로 전환합니다.' },
    { keyword: '미세먼지', message: '미세먼지 주의! 실내 활동만 추천합니다.' },
    { keyword: '실내수업', message: '실내 수업으로 진행합니다.' },
    { keyword: '실내', message: '실내 활동으로 전환합니다.' },
  ],
  special: [
    { keyword: '체육대회', message: '체육대회 준비/진행일입니다! 대회 관련 활동을 확인하세요.' },
    { keyword: '스포츠데이', message: '스포츠데이입니다! 특별 프로그램을 확인하세요.' },
    { keyword: '공개수업', message: '공개수업일입니다! 수업안을 점검해주세요.' },
    { keyword: '재량활동', message: '재량활동 시간입니다.' },
  ],
}

/**
 * 시간표 메모에서 특별행사 키워드를 감지
 * @param {string} memo - 시간표 셀의 memo 필드
 * @returns {{ type: 'skip'|'adjust'|'indoor'|'special'|null, keyword: string|null, message: string|null }}
 */
function detectSpecialEvent(memo) {
  if (!memo) return { type: null, keyword: null, message: null }
  const text = memo.trim()
  for (const [type, entries] of Object.entries(SPECIAL_EVENT_KEYWORDS)) {
    for (const entry of entries) {
      if (text.includes(entry.keyword)) {
        return { type, keyword: entry.keyword, message: entry.message }
      }
    }
  }
  return { type: null, keyword: null, message: null }
}

/**
 * 영역별 수업 횟수를 집계
 * @param {Array} records - 해당 학급의 수업 기록 배열
 * @returns {{ 운동: number, 스포츠: number, 표현: number, suggestedDomain: string }}
 */
function computeDomainBalance(records) {
  const counts = { '운동': 0, '스포츠': 0, '표현': 0 }
  for (const r of records) {
    const d = r.domain || '스포츠'
    if (d in counts) counts[d]++
  }
  const total = counts['운동'] + counts['스포츠'] + counts['표현']
  if (total === 0) return { ...counts, suggestedDomain: '스포츠' }

  // 비율이 가장 낮은 영역을 추천
  const entries = Object.entries(counts)
  entries.sort((a, b) => a[1] - b[1])
  return { ...counts, suggestedDomain: entries[0][0] }
}

/**
 * 날씨 기반으로 사용 불가능한 장소를 결정
 * @returns {{ status: string, restrictedSpaces: string[], reason: string }}
 */
function getWeatherContext(weather, air) {
  const judgment = judgeOutdoorClass(weather, air)
  const restrictedSpaces = []

  if (judgment.status === 'bad') {
    restrictedSpaces.push('운동장')
  }

  return {
    status: judgment.status,
    text: judgment.text,
    emoji: judgment.emoji,
    reason: judgment.reason,
    restrictedSpaces,
    judgment,
  }
}

/**
 * 추천 점수를 계산하여 최적 활동을 선정
 */
function scoreAndRankActivities(candidates, context) {
  const { weatherCtx, domainBalance, lastRecord, priorityOrder, availableSpaces } = context

  // 날씨 제한 장소 필터
  const allowedSpaces = availableSpaces.filter(
    (s) => !weatherCtx.restrictedSpaces.includes(s)
  )

  const scored = candidates.map((activity) => {
    let score = 50 // 기본 점수
    let dominantPriority = null

    for (const priority of priorityOrder) {
      switch (priority) {
        case 'weather': {
          // 활동의 장소가 허용 장소에 포함되는지
          const actSpaces = activity.space || []
          const hasAllowedSpace = actSpaces.some((s) => allowedSpaces.includes(s))
          if (!hasAllowedSpace && actSpaces.length > 0) {
            score -= 100 // 장소 불가 → 거의 탈락
          } else if (weatherCtx.status === 'bad' && actSpaces.includes('교실')) {
            score += 20 // 실내 권장 시 교실 활동 가점
          }
          break
        }
        case 'continuity': {
          // 마지막 수업과 같은 영역/단원 → 진도 연속성 가점
          if (lastRecord) {
            if (activity.domain === lastRecord.domain) score += 15
            // 같은 단원의 다음 ACE 단계면 추가 가점
            if (lastRecord.acePhase === 'A' && activity.acePhase === 'C') score += 10
            if (lastRecord.acePhase === 'C' && activity.acePhase === 'E') score += 10
          }
          break
        }
        case 'space': {
          // 사용 가능 공간 매칭 가점
          const actSpaces = activity.space || []
          const matchCount = actSpaces.filter((s) => allowedSpaces.includes(s)).length
          score += matchCount * 5
          break
        }
        case 'domainBalance': {
          // 부족한 영역 활동에 가점
          if (activity.domain === domainBalance.suggestedDomain) {
            score += 20
            if (!dominantPriority) dominantPriority = 'domainBalance'
          }
          break
        }
      }
    }

    // 연속으로 같은 활동 반복 방지
    if (lastRecord && lastRecord.activity === activity.name) {
      score -= 30
    }

    return { ...activity, score, dominantPriority: dominantPriority || priorityOrder[0] }
  })

  // 점수 내림차순 정렬
  scored.sort((a, b) => b.score - a.score)
  return scored
}

/**
 * 수업 추천 시스템 Hook
 *
 * 날씨 + 수업 기록 + 시간표 + 교육과정 데이터를 종합하여
 * 학급별 맞춤 수업 활동을 추천합니다.
 *
 * @param {{ weather: Object|null, air: Object|null }} weatherData - 현재 날씨/대기질
 */
export function useLessonRecommend({ weather = null, air = null } = {}) {
  const { classes, records, getClassRecords } = useClassManager()
  const { getTimetableForWeek } = useSchedule()
  const { recommendSettings } = useSettings()
  const { currentDay } = useCurrentPeriod()
  const { activitiesByGrade } = useCurriculum()
  const ai = useAI()
  const [aiResults, setAiResults] = useState({})

  // 추천 설정 (우선순위, 공간)
  const priorityOrder = recommendSettings?.priorityOrder || ['weather', 'continuity', 'space', 'domainBalance']
  const availableSpaces = recommendSettings?.availableSpaces || ['운동장', '체육관', '교실']
  const specialEvents = recommendSettings?.specialEvents || []

  // 날씨 컨텍스트 (메모이제이션)
  const weatherCtx = useMemo(
    () => getWeatherContext(weather, air),
    [weather, air]
  )

  /**
   * 학년에 맞는 활동 후보 목록 가져오기
   */
  const getCandidateActivities = useCallback((grade) => {
    if (!grade) return []
    const gradeStr = typeof grade === 'number' ? `${grade}학년` : grade
    return activitiesByGrade
      .filter((g) => g.grade === gradeStr)
      .flatMap((g) => g.activities)
  }, [activitiesByGrade])

  /**
   * 특정 날짜의 시간표에서 수업 셀 추출
   * (체육 전담교사 앱이므로 classId가 있는 모든 셀이 체육 수업)
   */
  const getPECellsForDay = useCallback((weekKey, day) => {
    const { timetable } = getTimetableForWeek(weekKey)
    const peCells = []

    for (let period = 1; period <= 7; period++) {
      const cellKey = `${day}-${period}`
      const cell = timetable[cellKey]
      if (!cell || !cell.classId) continue

      peCells.push({
        cellKey,
        day,
        period,
        classId: cell.classId,
        className: cell.className || '',
        memo: cell.memo || '',
      })
    }

    return peCells
  }, [getTimetableForWeek])

  /**
   * 영역별 수업 분포 가져오기
   */
  const getDomainBalance = useCallback((classId) => {
    const classRecords = getClassRecords(classId)
    return computeDomainBalance(classRecords)
  }, [getClassRecords])

  /**
   * 학급 최근 기록 가져오기
   */
  const getClassHistory = useCallback((classId, limit = 5) => {
    const classRecords = getClassRecords(classId)
    return classRecords.slice(0, limit)
  }, [getClassRecords])

  /**
   * 단일 셀(교시)에 대한 추천 생성
   */
  const generateCellRecommendation = useCallback((peCell) => {
    const { classId, memo, period, day } = peCell
    const classInfo = classes.find((c) => c.id === classId)

    if (!classInfo) return null

    // 1. 특별행사 체크
    const specialEvent = detectSpecialEvent(memo)

    // 수동 등록 특별행사도 체크
    const today = new Date()
    const { monday } = getWeekRange(0)
    const cellDate = new Date(monday)
    cellDate.setDate(monday.getDate() + DAY_INDEX[day])
    const dateStr = cellDate.toISOString().split('T')[0]
    const manualEvent = specialEvents.find((e) => e.date === dateStr)

    // skip → 수업 없음
    if (specialEvent.type === 'skip' || manualEvent?.type === 'skip') {
      return {
        classId,
        classInfo: { grade: classInfo.grade, classNum: classInfo.classNum, color: classInfo.color },
        period,
        day,
        isSkipped: true,
        skipReason: specialEvent.keyword || manualEvent?.label || '행사',
        skipMessage: specialEvent.message || `${manualEvent?.label || '행사'}로 체육 수업이 없습니다.`,
        recommendation: null,
      }
    }

    // adjust → 수업은 있지만 조정 필요 (대피훈련, 방송조회 등)
    if (specialEvent.type === 'adjust') {
      // 추천은 계속 진행하되, 조정 알림 메시지를 추가
      // (아래 로직으로 이어짐)
    }

    // 2. 수업 기록 + 영역 분석
    const classRecords = getClassRecords(classId)
    const lastRecord = classRecords[0] || null
    const domainBalance = computeDomainBalance(classRecords)

    // 3. 후보 활동 수집
    let candidates = getCandidateActivities(classInfo.grade)

    // 4. 실내 강제 (날씨 또는 메모 키워드)
    const forceIndoor = specialEvent.type === 'indoor' || manualEvent?.type === 'indoor'
    const effectiveWeatherCtx = forceIndoor
      ? { ...weatherCtx, status: 'bad', restrictedSpaces: ['운동장'] }
      : weatherCtx

    // 5. 점수화 + 순위 결정
    const ranked = scoreAndRankActivities(candidates, {
      weatherCtx: effectiveWeatherCtx,
      domainBalance,
      lastRecord,
      priorityOrder,
      availableSpaces,
    })

    const top = ranked[0] || null
    const alternatives = ranked.slice(1, 3)

    // 추천 사유 생성
    let rationale = ''
    if (top) {
      if (top.dominantPriority === 'domainBalance') {
        rationale = `${domainBalance.suggestedDomain} 영역이 부족합니다`
      } else if (top.dominantPriority === 'weather' && effectiveWeatherCtx.status === 'bad') {
        rationale = `${effectiveWeatherCtx.reason} — 실내 활동 추천`
      } else if (top.dominantPriority === 'continuity' && lastRecord) {
        rationale = `${lastRecord.domain} 영역 진도를 이어갑니다`
      } else {
        rationale = '종합 점수 기반 추천'
      }
    }

    return {
      classId,
      classInfo: { grade: classInfo.grade, classNum: classInfo.classNum, color: classInfo.color },
      period,
      day,
      isSkipped: false,
      adjustMessage: specialEvent.type === 'adjust' ? specialEvent.message : null,
      specialMessage: specialEvent.type === 'special' ? specialEvent.message : null,
      lastLesson: lastRecord
        ? {
            date: lastRecord.date,
            activity: lastRecord.activity,
            domain: lastRecord.domain || '스포츠',
            sequence: lastRecord.sequence,
          }
        : null,
      weatherContext: {
        status: effectiveWeatherCtx.status,
        restrictedSpaces: effectiveWeatherCtx.restrictedSpaces,
      },
      domainBalance,
      recommendation: top
        ? {
            activity: top.name,
            activityId: top.id,
            domain: top.domain || '스포츠',
            space: (top.space || []).join(', '),
            acePhase: top.acePhase || 'A',
            rationale,
            dominantPriority: top.dominantPriority,
            alternatives: alternatives.map((a) => ({
              name: a.name,
              domain: a.domain || '스포츠',
              space: (a.space || []).join(', '),
            })),
          }
        : null,
    }
  }, [classes, getClassRecords, getCandidateActivities, weatherCtx, priorityOrder, availableSpaces, specialEvents])

  /**
   * 오늘 수업별 추천 배열 생성
   */
  const todayRecommendations = useMemo(() => {
    const day = currentDay
    if (!day) return []

    const { weekKey } = getWeekRange(0)
    const peCells = getPECellsForDay(weekKey, day)

    return peCells
      .map((cell) => generateCellRecommendation(cell))
      .filter(Boolean)
  }, [currentDay, getPECellsForDay, generateCellRecommendation])

  /**
   * 주간 추천 (요일별 맵)
   */
  const weekRecommendations = useMemo(() => {
    const { weekKey } = getWeekRange(0)
    const result = {}

    for (const day of WEEKDAYS) {
      const peCells = getPECellsForDay(weekKey, day)
      result[day] = peCells
        .map((cell) => generateCellRecommendation(cell))
        .filter(Boolean)
    }

    return result
  }, [getPECellsForDay, generateCellRecommendation])

  /**
   * AI 강화 추천 (Gemini 호출)
   */
  const generateAIRecommendation = useCallback(async (classId) => {
    const classInfo = classes.find((c) => c.id === classId)
    if (!classInfo) return null

    const classRecords = getClassRecords(classId).slice(0, 5)
    const domainBalance = computeDomainBalance(getClassRecords(classId))

    const prompt = buildRecommendationPrompt({
      classInfo: { grade: classInfo.grade, classNum: classInfo.classNum },
      weather,
      air,
      recentRecords: classRecords,
      domainBalance,
      priorityOrder,
      availableSpaces,
      weatherContext: weatherCtx,
    })

    const result = await ai.generate(prompt)
    if (result) {
      setAiResults((prev) => ({ ...prev, [classId]: result }))
    }
    return result
  }, [classes, getClassRecords, weather, air, priorityOrder, availableSpaces, weatherCtx, ai])

  return {
    todayRecommendations,
    weekRecommendations,
    generateAIRecommendation,
    getDomainBalance,
    getClassHistory,
    weatherContext: weatherCtx,
    aiResults,
    aiLoading: ai.loading,
    aiError: ai.error,
  }
}
