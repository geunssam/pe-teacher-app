import { useState, useEffect } from 'react'

/**
 * 현재 교시 계산 Hook
 *
 * 교시 시간 (기본 초등학교 기준):
 * 1교시: 09:00 - 09:40
 * 2교시: 09:50 - 10:30
 * 3교시: 10:40 - 11:20
 * 4교시: 11:30 - 12:10
 * 점심: 12:10 - 13:10
 * 5교시: 13:10 - 13:50
 * 6교시: 14:00 - 14:40
 * 7교시: 14:50 - 15:30
 */

const PERIOD_TIMES = [
  { period: 1, start: '09:00', end: '09:40' },
  { period: 2, start: '09:50', end: '10:30' },
  { period: 3, start: '10:40', end: '11:20' },
  { period: 4, start: '11:30', end: '12:10' },
  { period: 5, start: '13:10', end: '13:50' },
  { period: 6, start: '14:00', end: '14:40' },
  { period: 7, start: '14:50', end: '15:30' },
]

const WEEKDAY_MAP = {
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
}

/**
 * 시간 문자열을 분으로 변환 (예: "09:00" -> 540)
 */
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * 현재 시간이 어느 교시인지 반환
 */
function getCurrentPeriodNumber() {
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  for (const periodTime of PERIOD_TIMES) {
    const startMinutes = timeToMinutes(periodTime.start)
    const endMinutes = timeToMinutes(periodTime.end)

    if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
      return periodTime.period
    }
  }

  return null // 수업 시간이 아님
}

/**
 * 현재 요일 반환 (월~금만)
 */
function getCurrentDay() {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0(일) ~ 6(토)
  return WEEKDAY_MAP[dayOfWeek] || null // 월~금만 반환
}

export function useCurrentPeriod() {
  const [currentPeriod, setCurrentPeriod] = useState(null)
  const [currentDay, setCurrentDay] = useState(null)

  useEffect(() => {
    // 초기 설정
    setCurrentPeriod(getCurrentPeriodNumber())
    setCurrentDay(getCurrentDay())

    // 1분마다 업데이트
    const interval = setInterval(() => {
      setCurrentPeriod(getCurrentPeriodNumber())
      setCurrentDay(getCurrentDay())
    }, 60000) // 60초

    return () => clearInterval(interval)
  }, [])

  return {
    currentPeriod,
    currentDay,
    isCurrentPeriod: (day, period) => {
      return day === currentDay && period === currentPeriod
    },
  }
}
