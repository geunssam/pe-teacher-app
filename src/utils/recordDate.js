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
