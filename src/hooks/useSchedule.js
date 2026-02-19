// 교무부장 훅 — 시간표 CRUD (기본 시간표 + 주차별 오버라이드, ISO주 기준, Firestore + localStorage fallback) | 사용처→SchedulePage/HomePage
import { useCallback, useEffect, useRef } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { getUid } from './useDataSource'
import { getDocument, createDebouncedWriter } from '../services/firestore'

const debouncedWrite = createDebouncedWriter(300)

/**
 * 시간표 관리 Hook (classpet 스타일)
 *
 * localStorage 스키마:
 * - pe_timetable_base: { "mon-1": { subject: "국어" }, "mon-2": { subject: "수학" }, ... }
 * - pe_timetable_weeks: { "2025-W06": { "mon-1": { subject: "체육" }, ... }, ... }
 *
 * Firestore paths:
 * - users/{uid}/schedule/base → { timetable: { ... } }
 * - users/{uid}/schedule/weeks → { [weekKey]: { ... } }
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
  const firestoreLoaded = useRef(false)

  // Load from Firestore on mount (if authenticated)
  useEffect(() => {
    const uid = getUid()
    if (!uid || firestoreLoaded.current) return
    firestoreLoaded.current = true

    async function loadFromFirestore() {
      try {
        // Load base timetable
        const baseDoc = await getDocument(`users/${uid}/schedule/base`)
        if (baseDoc?.timetable) {
          setBaseTimetable(baseDoc.timetable)
        }

        // Load week timetables
        const weeksDoc = await getDocument(`users/${uid}/schedule/weeks`)
        if (weeksDoc) {
          const { id, ...weekData } = weeksDoc
          if (Object.keys(weekData).length) {
            setWeekTimetables(weekData)
          }
        }
      } catch (err) {
        console.warn('[useSchedule] Firestore load failed, using localStorage:', err.message)
      }
    }

    loadFromFirestore()
  }, [])

  // Sync helper for Firestore
  const syncBaseToFirestore = useCallback((data) => {
    const uid = getUid()
    if (uid) {
      debouncedWrite(`users/${uid}/schedule/base`, { timetable: data }, false)
    }
  }, [])

  const syncWeeksToFirestore = useCallback((data) => {
    const uid = getUid()
    if (uid) {
      debouncedWrite(`users/${uid}/schedule/weeks`, data, false)
    }
  }, [])

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
    setBaseTimetable(prev => {
      const next = { ...prev, [cellKey]: data }
      syncBaseToFirestore(next)
      return next
    })
  }

  /**
   * 기본 시간표 셀 삭제
   */
  const deleteBaseCell = (cellKey) => {
    setBaseTimetable(prev => {
      const newTable = { ...prev }
      delete newTable[cellKey]
      syncBaseToFirestore(newTable)
      return newTable
    })
  }

  /**
   * 주별 오버라이드 설정
   */
  const setWeekOverride = (weekKey, cellKey, data) => {
    setWeekTimetables(prev => {
      let next
      const weekData = prev[weekKey] || {}

      if (data === null) {
        // 오버라이드 삭제
        const newWeekData = { ...weekData }
        delete newWeekData[cellKey]

        // 주 데이터가 비었으면 주 자체 삭제
        if (Object.keys(newWeekData).length === 0) {
          next = { ...prev }
          delete next[weekKey]
        } else {
          next = { ...prev, [weekKey]: newWeekData }
        }
      } else {
        next = {
          ...prev,
          [weekKey]: { ...weekData, [cellKey]: data }
        }
      }

      syncWeeksToFirestore(next)
      return next
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
    syncBaseToFirestore({})
    syncWeeksToFirestore({})
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
    updateBaseCell,
    deleteBaseCell,
    setWeekOverride,
    clearSchedule,
    isEmpty,
  }
}
