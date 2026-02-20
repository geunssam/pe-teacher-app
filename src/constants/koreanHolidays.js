// 한국 법정공휴일 상수 — 양력 고정 + 음력 변동(2026~2030) + 대체공휴일 계산 | 사용처→useSchoolCalendar

/**
 * 양력 고정 공휴일 (8개)
 */
export const FIXED_HOLIDAYS = [
  { month: 1, day: 1, label: '신정' },
  { month: 3, day: 1, label: '삼일절' },
  { month: 5, day: 5, label: '어린이날' },
  { month: 6, day: 6, label: '현충일' },
  { month: 8, day: 15, label: '광복절' },
  { month: 10, day: 3, label: '개천절' },
  { month: 10, day: 9, label: '한글날' },
  { month: 12, day: 25, label: '성탄절' },
]

/**
 * 음력 변동 공휴일 (2026~2030 하드코딩)
 * 설날(전날·당일·다음날), 석가탄신일, 추석(전날·당일·다음날)
 */
export const LUNAR_HOLIDAYS = {
  2026: [
    { date: '2026-02-16', label: '설날 연휴' },
    { date: '2026-02-17', label: '설날' },
    { date: '2026-02-18', label: '설날 연휴' },
    { date: '2026-05-24', label: '석가탄신일' },
    { date: '2026-09-24', label: '추석 연휴' },
    { date: '2026-09-25', label: '추석' },
    { date: '2026-09-26', label: '추석 연휴' },
  ],
  2027: [
    { date: '2027-02-05', label: '설날 연휴' },
    { date: '2027-02-06', label: '설날' },
    { date: '2027-02-07', label: '설날 연휴' },
    { date: '2027-05-13', label: '석가탄신일' },
    { date: '2027-10-13', label: '추석 연휴' },
    { date: '2027-10-14', label: '추석' },
    { date: '2027-10-15', label: '추석 연휴' },
  ],
  2028: [
    { date: '2028-01-25', label: '설날 연휴' },
    { date: '2028-01-26', label: '설날' },
    { date: '2028-01-27', label: '설날 연휴' },
    { date: '2028-05-02', label: '석가탄신일' },
    { date: '2028-10-01', label: '추석 연휴' },
    { date: '2028-10-02', label: '추석' },
    { date: '2028-10-03', label: '추석 연휴' },
  ],
  2029: [
    { date: '2029-02-12', label: '설날 연휴' },
    { date: '2029-02-13', label: '설날' },
    { date: '2029-02-14', label: '설날 연휴' },
    { date: '2029-05-20', label: '석가탄신일' },
    { date: '2029-09-21', label: '추석 연휴' },
    { date: '2029-09-22', label: '추석' },
    { date: '2029-09-23', label: '추석 연휴' },
  ],
  2030: [
    { date: '2030-02-02', label: '설날 연휴' },
    { date: '2030-02-03', label: '설날' },
    { date: '2030-02-04', label: '설날 연휴' },
    { date: '2030-05-09', label: '석가탄신일' },
    { date: '2030-09-11', label: '추석 연휴' },
    { date: '2030-09-12', label: '추석' },
    { date: '2030-09-13', label: '추석 연휴' },
  ],
}

// --- Helper ---

/** YYYY-MM-DD 문자열에서 Date 객체 생성 (로컬 시간대) */
function parseDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Date → YYYY-MM-DD */
function formatDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Date의 요일 (0=일, 6=토) */
function dayOfWeek(date) {
  return date.getDay()
}

/** 다음 평일(월~금) 찾기. occupied는 이미 공휴일인 날짜 Set */
function nextWeekday(date, occupied) {
  const d = new Date(date)
  d.setDate(d.getDate() + 1)
  while (dayOfWeek(d) === 0 || dayOfWeek(d) === 6 || occupied.has(formatDate(d))) {
    d.setDate(d.getDate() + 1)
  }
  return d
}

/**
 * 대체공휴일 계산
 *
 * - 설날/추석: 3일 중 하나라도 일요일이면 다음 평일
 * - 어린이날: 토/일이면 다음 월요일
 * - 삼일절/광복절/개천절/한글날: 일요일이면 다음 월요일 (2021년~)
 */
export function getSubstituteHolidays(year) {
  const substitutes = []
  const lunarDates = LUNAR_HOLIDAYS[year] || []

  // 모든 기본 공휴일 날짜 Set (대체공휴일 겹침 방지용)
  const allHolidayDates = new Set()

  // 양력 고정 공휴일 등록
  for (const h of FIXED_HOLIDAYS) {
    allHolidayDates.add(formatDate(new Date(year, h.month - 1, h.day)))
  }
  // 음력 변동 공휴일 등록
  for (const h of lunarDates) {
    allHolidayDates.add(h.date)
  }

  // 설날 (3일 연휴) — 일요일 겹치면 연휴 다음 평일
  const seolDates = lunarDates.filter((h) => h.label.includes('설날'))
  if (seolDates.length === 3) {
    const hasSunday = seolDates.some((h) => dayOfWeek(parseDate(h.date)) === 0)
    if (hasSunday) {
      const lastDay = parseDate(seolDates[2].date)
      const sub = nextWeekday(lastDay, allHolidayDates)
      const subStr = formatDate(sub)
      allHolidayDates.add(subStr)
      substitutes.push({ date: subStr, label: '대체공휴일 (설날)' })
    }
  }

  // 추석 (3일 연휴) — 일요일 겹치면 연휴 다음 평일
  const chuseokDates = lunarDates.filter((h) => h.label.includes('추석'))
  if (chuseokDates.length === 3) {
    const hasSunday = chuseokDates.some((h) => dayOfWeek(parseDate(h.date)) === 0)
    if (hasSunday) {
      const lastDay = parseDate(chuseokDates[2].date)
      const sub = nextWeekday(lastDay, allHolidayDates)
      const subStr = formatDate(sub)
      allHolidayDates.add(subStr)
      substitutes.push({ date: subStr, label: '대체공휴일 (추석)' })
    }
  }

  // 어린이날 — 토/일이면 다음 월요일
  const childrenDay = new Date(year, 4, 5) // 5월 5일
  const cdDow = dayOfWeek(childrenDay)
  if (cdDow === 0 || cdDow === 6) {
    const sub = nextWeekday(childrenDay, allHolidayDates)
    const subStr = formatDate(sub)
    allHolidayDates.add(subStr)
    substitutes.push({ date: subStr, label: '대체공휴일 (어린이날)' })
  }

  // 삼일절/광복절/개천절/한글날 — 일요일이면 다음 월요일 (2021년~)
  if (year >= 2021) {
    const solarSubTargets = [
      { month: 3, day: 1, label: '삼일절' },
      { month: 8, day: 15, label: '광복절' },
      { month: 10, day: 3, label: '개천절' },
      { month: 10, day: 9, label: '한글날' },
    ]
    for (const t of solarSubTargets) {
      const d = new Date(year, t.month - 1, t.day)
      if (dayOfWeek(d) === 0) {
        const sub = nextWeekday(d, allHolidayDates)
        const subStr = formatDate(sub)
        allHolidayDates.add(subStr)
        substitutes.push({ date: subStr, label: `대체공휴일 (${t.label})` })
      }
    }
  }

  return substitutes
}

/**
 * 해당 연도 전체 공휴일 배열 반환
 * @param {number} year
 * @returns {Array<{date: string, label: string}>}
 */
export function generateKoreanHolidays(year) {
  const holidays = []

  // 1. 양력 고정 공휴일
  for (const h of FIXED_HOLIDAYS) {
    holidays.push({
      date: formatDate(new Date(year, h.month - 1, h.day)),
      label: h.label,
    })
  }

  // 2. 음력 변동 공휴일 (범위 내만)
  const lunarDates = LUNAR_HOLIDAYS[year]
  if (lunarDates) {
    holidays.push(...lunarDates)
  }

  // 3. 대체공휴일
  const substitutes = getSubstituteHolidays(year)
  holidays.push(...substitutes)

  // 날짜순 정렬
  holidays.sort((a, b) => a.date.localeCompare(b.date))

  return holidays
}
