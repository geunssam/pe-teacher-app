// 교무담당 훅 — 학사 일정 관리 (학기/방학/공휴일/행사) | 사용처→SettingsPage
import { useCallback, useEffect, useRef, useMemo } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { getUid } from './useDataSource'
import { setDocument, getDocument } from '../services/firestore'
import { generateKoreanHolidays } from '../constants/koreanHolidays'
import { generateEventId } from '../utils/generateId'

const CALENDAR_KEY = 'pe_school_calendar'
const FIRESTORE_PATH = (uid) => `users/${uid}/calendar/main`

// --- Helper ---

/** YYYY-MM-DD → Date (로컬) */
function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Date → YYYY-MM-DD */
function formatDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * 학년도 계산: 3월~12월이면 올해, 1~2월이면 전년도
 */
function getSchoolYear() {
  const now = new Date()
  return now.getMonth() >= 2 ? now.getFullYear() : now.getFullYear() - 1
}

/**
 * 연도 기반 기본 학사일정 생성
 */
function buildDefaultCalendar(year) {
  return {
    year,
    semesters: {
      first: {
        startDate: `${year}-03-02`,
        endDate: `${year}-07-17`,
      },
      second: {
        startDate: `${year}-09-01`,
        endDate: `${year + 1}-02-12`,
      },
    },
    vacations: {
      summer: {
        startDate: `${year}-07-18`,
        endDate: `${year}-08-31`,
      },
      winter: {
        startDate: `${year + 1}-01-04`,
        endDate: `${year + 1}-02-28`,
      },
    },
    events: [],
    lastUpdated: null,
  }
}

/**
 * ISO 주차 키 생성 (useSchedule.js 의 getWeekKey와 동일 로직)
 */
function getWeekKey(date) {
  const tempDate = new Date(date)
  const dayOfWeek = tempDate.getDay()

  const thursday = new Date(tempDate)
  thursday.setDate(tempDate.getDate() + (4 - (dayOfWeek === 0 ? 7 : dayOfWeek)))

  const year = thursday.getFullYear()
  const firstThursday = new Date(year, 0, 4)
  const weekNumber = Math.ceil(((thursday - firstThursday) / 86400000 + 1) / 7)

  return `${year}-W${String(weekNumber).padStart(2, '0')}`
}

/**
 * 날짜가 범위 안에 있는지 (inclusive)
 */
function isDateInRange(dateStr, startStr, endStr) {
  return dateStr >= startStr && dateStr <= endStr
}

/**
 * 날짜가 방학 기간인지
 */
function isVacationDay(dateStr, vacations) {
  for (const vac of Object.values(vacations)) {
    if (isDateInRange(dateStr, vac.startDate, vac.endDate)) return true
  }
  return false
}

// ===== Hook =====

export function useSchoolCalendar() {
  const [calendar, setCalendar] = useLocalStorage(CALENDAR_KEY, () => buildDefaultCalendar(getSchoolYear()))
  const firestoreLoaded = useRef(false)

  // --- Firestore 동기화 ---

  useEffect(() => {
    const uid = getUid()
    if (!uid || firestoreLoaded.current) return
    firestoreLoaded.current = true

    async function loadFromFirestore() {
      try {
        const data = await getDocument(FIRESTORE_PATH(uid))
        if (data) {
          const { id, ...calendarData } = data
          setCalendar(calendarData)
        }
      } catch (err) {
        console.warn('[useSchoolCalendar] Firestore load failed, using localStorage:', err.message)
      }
    }

    loadFromFirestore()
  }, [])

  const syncToFirestore = useCallback((newCalendar) => {
    const uid = getUid()
    if (uid) {
      setDocument(FIRESTORE_PATH(uid), newCalendar, true).catch((err) => {
        console.error('[useSchoolCalendar] Firestore sync failed:', err)
      })
    }
  }, [])

  // --- 내부 업데이트 헬퍼 ---

  const update = useCallback((updater) => {
    setCalendar((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      const withTimestamp = { ...next, lastUpdated: new Date().toISOString() }
      syncToFirestore(withTimestamp)
      return withTimestamp
    })
  }, [setCalendar, syncToFirestore])

  // --- 학기/방학 설정 ---

  const updateSemester = useCallback((key, { startDate, endDate }) => {
    update((prev) => ({
      ...prev,
      semesters: {
        ...prev.semesters,
        [key]: { startDate, endDate },
      },
    }))
  }, [update])

  const updateVacation = useCallback((key, { startDate, endDate }) => {
    update((prev) => ({
      ...prev,
      vacations: {
        ...prev.vacations,
        [key]: { startDate, endDate },
      },
    }))
  }, [update])

  // --- 이벤트 관리 ---

  const addEvent = useCallback(({ date, label, type }) => {
    update((prev) => ({
      ...prev,
      events: [
        ...prev.events,
        { id: generateEventId(), date, label, type, source: 'manual' },
      ],
    }))
  }, [update])

  const removeEvent = useCallback((eventId) => {
    update((prev) => ({
      ...prev,
      events: prev.events.filter((e) => e.id !== eventId),
    }))
  }, [update])

  const updateEvent = useCallback((eventId, updates) => {
    update((prev) => ({
      ...prev,
      events: prev.events.map((e) => (e.id === eventId ? { ...e, ...updates } : e)),
    }))
  }, [update])

  /**
   * 공휴일 자동 적용 — 기존 auto 이벤트를 교체
   */
  const applyHolidays = useCallback((year) => {
    const holidays = generateKoreanHolidays(year)
    const autoEvents = holidays.map((h) => ({
      id: generateEventId(),
      date: h.date,
      label: h.label,
      type: 'holiday',
      source: 'auto',
    }))

    update((prev) => ({
      ...prev,
      events: [
        ...prev.events.filter((e) => e.source !== 'auto'),
        ...autoEvents,
      ],
    }))
  }, [update])

  // --- 계산: 수업일수 ---

  const schoolDays = useMemo(() => {
    const { semesters, vacations, events } = calendar

    // 휴일/결과일 날짜 Set
    const skipDates = new Set()
    for (const evt of events) {
      if (evt.type === 'holiday' || evt.type === 'skip') {
        skipDates.add(evt.date)
      }
    }

    function countSchoolDays(startStr, endStr) {
      let count = 0
      const cursor = parseDate(startStr)
      const end = parseDate(endStr)

      while (cursor <= end) {
        const dateStr = formatDate(cursor)
        const dow = cursor.getDay()

        // 토(6)/일(0) 제외
        if (dow !== 0 && dow !== 6) {
          // 방학 제외
          if (!isVacationDay(dateStr, vacations)) {
            // 휴일/결과일 제외
            if (!skipDates.has(dateStr)) {
              count++
            }
          }
        }

        cursor.setDate(cursor.getDate() + 1)
      }

      return count
    }

    const first = countSchoolDays(semesters.first.startDate, semesters.first.endDate)
    const second = countSchoolDays(semesters.second.startDate, semesters.second.endDate)

    return { first, second, total: first + second }
  }, [calendar])

  // --- 계산: teachableWeeks ---

  const teachableWeeks = useMemo(() => {
    const { semesters, vacations, events } = calendar
    const weeks = []

    const skipDates = new Set()
    for (const evt of events) {
      if (evt.type === 'holiday' || evt.type === 'skip') {
        skipDates.add(evt.date)
      }
    }

    function processSemester(semKey) {
      const sem = semesters[semKey]
      const cursor = parseDate(sem.startDate)
      const end = parseDate(sem.endDate)

      // 첫 번째 월요일로 이동
      while (cursor.getDay() !== 1 && cursor <= end) {
        cursor.setDate(cursor.getDate() + 1)
      }

      const visited = new Set()

      while (cursor <= end) {
        const monday = new Date(cursor)
        const friday = new Date(cursor)
        friday.setDate(monday.getDate() + 4)

        const weekKey = getWeekKey(monday)

        if (!visited.has(weekKey)) {
          visited.add(weekKey)

          // 해당 주의 수업일 수 계산 (월~금)
          let schoolDaysInWeek = 0
          const dayCursor = new Date(monday)

          for (let i = 0; i < 5; i++) {
            const ds = formatDate(dayCursor)
            // 학기 범위 내 + 방학 아님 + 휴일 아님
            if (
              isDateInRange(ds, sem.startDate, sem.endDate) &&
              !isVacationDay(ds, vacations) &&
              !skipDates.has(ds)
            ) {
              schoolDaysInWeek++
            }
            dayCursor.setDate(dayCursor.getDate() + 1)
          }

          if (schoolDaysInWeek > 0) {
            weeks.push({
              weekKey,
              mondayDate: formatDate(monday),
              fridayDate: formatDate(friday),
              semester: semKey,
              schoolDaysInWeek,
            })
          }
        }

        // 다음 주 월요일로
        cursor.setDate(cursor.getDate() + 7)
      }
    }

    processSemester('first')
    processSemester('second')

    return weeks
  }, [calendar])

  // --- 유틸 ---

  const getEventsForMonth = useCallback((year, month) => {
    const prefix = `${year}-${String(month).padStart(2, '0')}`
    return calendar.events.filter((e) => e.date.startsWith(prefix))
  }, [calendar.events])

  const getEventsForDate = useCallback((dateStr) => {
    return calendar.events.filter((e) => e.date === dateStr)
  }, [calendar.events])

  const isSchoolDay = useCallback((dateStr) => {
    const date = parseDate(dateStr)
    const dow = date.getDay()

    // 주말
    if (dow === 0 || dow === 6) return false

    // 학기 범위 내인지
    const { semesters, vacations, events } = calendar
    const inSemester =
      isDateInRange(dateStr, semesters.first.startDate, semesters.first.endDate) ||
      isDateInRange(dateStr, semesters.second.startDate, semesters.second.endDate)
    if (!inSemester) return false

    // 방학
    if (isVacationDay(dateStr, vacations)) return false

    // 휴일/결과일
    for (const evt of events) {
      if (evt.date === dateStr && (evt.type === 'holiday' || evt.type === 'skip')) {
        return false
      }
    }

    return true
  }, [calendar])

  // --- 시간표 연동 ---

  const getWeeklyPEHours = useCallback((baseTimetable) => {
    if (!baseTimetable) return 0
    return Object.values(baseTimetable).filter(
      (cell) => cell && cell.subject === '체육'
    ).length
  }, [])

  const getTotalPEHours = useCallback((baseTimetable) => {
    return getWeeklyPEHours(baseTimetable) * teachableWeeks.length
  }, [getWeeklyPEHours, teachableWeeks.length])

  // --- 추천 훅 호환 ---

  const getSpecialEventsForRecommend = useCallback(() => {
    return calendar.events
      .filter((e) => e.type === 'skip' || e.type === 'indoor' || e.type === 'special')
      .map(({ date, label, type }) => ({ date, label, type }))
  }, [calendar.events])

  return {
    calendar,

    // 학기/방학 설정
    updateSemester,
    updateVacation,

    // 이벤트 관리
    addEvent,
    removeEvent,
    updateEvent,
    applyHolidays,

    // 계산 (useMemo)
    schoolDays,
    teachableWeeks,

    // 유틸
    getEventsForMonth,
    getEventsForDate,
    isSchoolDay,

    // 시간표 연동
    getWeeklyPEHours,
    getTotalPEHours,

    // 호환
    getSpecialEventsForRecommend,
  }
}
