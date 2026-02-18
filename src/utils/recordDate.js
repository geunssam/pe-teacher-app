export const toLocalDateFromRecord = (value) => {
  if (!value) return null

  if (value instanceof Date) {
    const y = value.getFullYear()
    const m = String(value.getMonth() + 1).padStart(2, '0')
    const d = String(value.getDate()).padStart(2, '0')
    value = `${y}-${m}-${d}`
  }

  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.slice(0, 10)
  const [yearText, monthText, dayText] = normalized.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)

  if (!year || !month || !day) return null

  const parsed = new Date(year, month - 1, day)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export const formatRecordDate = (value) => {
  const parsed = toLocalDateFromRecord(value)
  if (!parsed) return '-'

  return parsed.toLocaleDateString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  })
}

export const getRecordSortValue = (value) => {
  const parsed = toLocalDateFromRecord(value)
  return parsed ? parsed.getTime() : 0
}

/**
 * Date 또는 날짜 문자열 → 'YYYY-MM-DD' 로컬 날짜 문자열 변환
 * (SchedulePage, useClassManager 등에서 공통 사용)
 */
export const toLocalDateString = (value) => {
  if (!value) return ''

  if (value instanceof Date) {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  if (typeof value === 'string') {
    return value.slice(0, 10)
  }

  const fallback = new Date(value)
  if (Number.isNaN(fallback.getTime())) {
    return ''
  }

  return toLocalDateString(fallback)
}

/**
 * 오늘 날짜를 'YYYY-MM-DD' 문자열로 반환
 */
export const getTodayLocalDate = () => toLocalDateString(new Date())
