import { useLocalStorage } from './useLocalStorage'

/**
 * 시간표 관리 Hook (classpet 스타일)
 *
 * localStorage 스키마:
 * - pe_timetable_base: { "mon-1": { subject: "국어" }, "mon-2": { subject: "수학" }, ... }
 * - pe_timetable_weeks: { "2025-W06": { "mon-1": { subject: "체육" }, ... }, ... }
 */

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri']
const WEEKDAY_LABELS = {
  mon: '월',
  tue: '화',
  wed: '수',
  thu: '목',
  fri: '금',
}
const MAX_PERIODS = 7

/**
 * 주차 키 생성 (ISO Week: YYYY-Wnn)
 */
function getWeekKey(date) {
  const tempDate = new Date(date)
  const dayOfWeek = tempDate.getDay()

  // 이번 주 목요일로 이동 (ISO 8601 기준)
  const thursday = new Date(tempDate)
  thursday.setDate(tempDate.getDate() + (4 - (dayOfWeek === 0 ? 7 : dayOfWeek)))

  const year = thursday.getFullYear()
  const firstThursday = new Date(year, 0, 4)
  const weekNumber = Math.ceil(((thursday - firstThursday) / 86400000 + 1) / 7)

  return `${year}-W${String(weekNumber).padStart(2, '0')}`
}

/**
 * 특정 주의 월요일 날짜 계산
 */
export function getWeekRange(offset = 0) {
  const today = new Date()
  const dayOfWeek = today.getDay() // 0: 일요일, 1: 월요일, ...

  // 이번 주 월요일 계산
  const monday = new Date(today)
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  monday.setDate(today.getDate() + diff + (offset * 7))

  // 금요일 계산
  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)

  const formatDate = (date, dayName) => `${date.getMonth() + 1}월 ${date.getDate()}일 (${dayName})`

  return {
    monday,
    friday,
    rangeText: `${formatDate(monday, '월')} ~ ${formatDate(friday, '금')}`,
    isCurrentWeek: offset === 0,
    weekKey: getWeekKey(monday)
  }
}

export function useSchedule() {
  const [baseTimetable, setBaseTimetable] = useLocalStorage('pe_timetable_base', {})
  const [weekTimetables, setWeekTimetables] = useLocalStorage('pe_timetable_weeks', {})

  /**
   * 특정 주의 시간표 가져오기 (기본 + 오버라이드 병합)
   */
  const getTimetableForWeek = (weekKey) => {
    const weekOverride = weekTimetables[weekKey] || {}
    const merged = { ...baseTimetable }
    const overriddenCells = []

    // 주별 오버라이드 적용
    Object.keys(weekOverride).forEach(cellKey => {
      const override = weekOverride[cellKey]
      if (override === null) {
        // null이면 삭제 (기본 시간표 무시)
        delete merged[cellKey]
      } else {
        merged[cellKey] = override
        overriddenCells.push(cellKey)
      }
    })

    return { timetable: merged, overriddenCells }
  }

  /**
   * 특정 셀 가져오기
   */
  const getCell = (weekKey, cellKey) => {
    const { timetable } = getTimetableForWeek(weekKey)
    return timetable[cellKey] || null
  }

  /**
   * 기본 시간표 셀 업데이트
   */
  const updateBaseCell = (cellKey, data) => {
    setBaseTimetable(prev => ({
      ...prev,
      [cellKey]: data
    }))
  }

  /**
   * 기본 시간표 셀 삭제
   */
  const deleteBaseCell = (cellKey) => {
    setBaseTimetable(prev => {
      const newTable = { ...prev }
      delete newTable[cellKey]
      return newTable
    })
  }

  /**
   * 주별 오버라이드 설정
   */
  const setWeekOverride = (weekKey, cellKey, data) => {
    setWeekTimetables(prev => {
      const weekData = prev[weekKey] || {}

      if (data === null) {
        // 오버라이드 삭제
        const newWeekData = { ...weekData }
        delete newWeekData[cellKey]

        // 주 데이터가 비었으면 주 자체 삭제
        if (Object.keys(newWeekData).length === 0) {
          const newWeeks = { ...prev }
          delete newWeeks[weekKey]
          return newWeeks
        }

        return {
          ...prev,
          [weekKey]: newWeekData
        }
      }

      return {
        ...prev,
        [weekKey]: {
          ...weekData,
          [cellKey]: data
        }
      }
    })
  }

  /**
   * 두 셀 교환 (기본 또는 주별)
   */
  const swapCells = (weekKey, cell1Key, cell2Key, saveType = 'week') => {
    const { timetable } = getTimetableForWeek(weekKey)
    const cell1Data = timetable[cell1Key] || null
    const cell2Data = timetable[cell2Key] || null

    if (saveType === 'week') {
      // 주별 오버라이드
      setWeekOverride(weekKey, cell1Key, cell2Data)
      setWeekOverride(weekKey, cell2Key, cell1Data)
    } else {
      // 기본 시간표 변경
      if (cell2Data) {
        updateBaseCell(cell1Key, cell2Data)
      } else {
        deleteBaseCell(cell1Key)
      }

      if (cell1Data) {
        updateBaseCell(cell2Key, cell1Data)
      } else {
        deleteBaseCell(cell2Key)
      }

      // 해당 셀들의 주별 오버라이드 삭제
      setWeekOverride(weekKey, cell1Key, null)
      setWeekOverride(weekKey, cell2Key, null)
    }
  }

  /**
   * 전체 시간표 초기화
   */
  const clearSchedule = () => {
    setBaseTimetable({})
    setWeekTimetables({})
  }

  /**
   * 시간표가 비어있는지 확인
   */
  const isEmpty = () => {
    return Object.keys(baseTimetable).length === 0 && Object.keys(weekTimetables).length === 0
  }

  return {
    baseTimetable,
    weekTimetables,
    WEEKDAYS,
    WEEKDAY_LABELS,
    MAX_PERIODS,
    getTimetableForWeek,
    getCell,
    updateBaseCell,
    deleteBaseCell,
    setWeekOverride,
    swapCells,
    clearSchedule,
    isEmpty,
  }
}
