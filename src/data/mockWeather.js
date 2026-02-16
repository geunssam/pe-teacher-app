// 단순, 안정된 Mock 날씨 데이터 + 규칙 (기상/에어데이터 연동 전 호환용)
export const SKY_CODE = {
  1: { text: '맑음', emoji: '☀️', color: '#D97706' },
  3: { text: '구름많음', emoji: '⛅', color: '#64748B' },
  4: { text: '흐림', emoji: '☁️', color: '#64748B' },
}

export const PTY_CODE = {
  0: { text: '없음', emoji: '', color: '' },
  1: { text: '비', emoji: '🌧️', color: '#7C9EF5' },
  2: { text: '비/눈', emoji: '🌨️', color: '#A78BFA' },
  3: { text: '눈', emoji: '❄️', color: '#0891B2' },
  5: { text: '빗방울', emoji: '💧', color: '#7C9EF5' },
  6: { text: '빗방울눈날림', emoji: '🌨️', color: '#A78BFA' },
  7: { text: '눈날림', emoji: '❄️', color: '#0891B2' },
}

export const PM_GRADE = {
  1: { text: '좋음', emoji: '😊', color: '#059669', bg: 'rgba(5, 150, 105, 0.08)' },
  2: { text: '보통', emoji: '😐', color: '#D97706', bg: 'rgba(217, 119, 6, 0.08)' },
  3: { text: '나쁨', emoji: '😷', color: '#DC2626', bg: 'rgba(220, 38, 38, 0.08)' },
  4: { text: '매우나쁨', emoji: '🤢', color: '#991B1B', bg: 'rgba(153, 27, 27, 0.08)' },
}

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const formatDate = (date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

const formatTime = (date) => `${String(date.getHours()).padStart(2, '0')}00`

const normalizeSkyCode = (value) => {
  const number = Math.floor(Math.abs(toNumber(value, 1)))
  return SKY_CODE[number] ? String(number) : '1'
}

const normalizePtyCode = (value) => {
  const number = Math.floor(toNumber(value, 0))
  if (number in PTY_CODE) return String(number)
  if (number < 0) return '0'
  if (number > 7) return '7'
  return '0'
}

const getGradeInfo = (value) => PM_GRADE[Math.max(1, Math.min(4, Math.floor(toNumber(value, 1))))] || PM_GRADE[1]

export const getCurrentWeather = () => {
  const now = new Date()
  const hour = now.getHours()
  const isRainy = hour >= 14 && hour <= 17
  const sky = isRainy ? 4 : 1
  const pty = isRainy ? 1 : 0

  return {
    baseDate: formatDate(now),
    baseTime: formatTime(now),
    sky,
    pty,
    t1h: isRainy ? 18 : 24,
    rn1: isRainy ? 5 : 0,
    reh: isRainy ? 75 : 45,
    pop: isRainy ? 80 : 10,
    wsd: 2.5,
  }
}

export const getAirQuality = () => {
  const now = new Date()
  const hour = now.getHours()
  const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)
  const pm10Value = isRushHour ? 65 : 35
  const pm25Value = isRushHour ? 25 : 15

  return {
    stationName: '대전',
    dataTime: now.toISOString(),
    pm10Value,
    pm10Grade: pm10Value > 80 ? 3 : pm10Value > 50 ? 2 : 1,
    pm25Value,
    pm25Grade: pm25Value > 35 ? 3 : pm25Value > 15 ? 2 : 1,
    uvIndex: 5,
    uvGrade: 2,
  }
}

export const getHourlyForecast = () => {
  const now = new Date()
  const hourly = []

  for (let i = 0; i < 12; i++) {
    const itemTime = new Date(now.getTime() + i * 60 * 60 * 1000)
    const hour = itemTime.getHours()
    const isRainy = hour >= 14 && hour <= 17
    const sky = isRainy ? 4 : 1
    const pty = isRainy ? 1 : 0

    hourly.push({
      time: `${String(hour).padStart(2, '0')}시`,
      sky,
      pty,
      temp: isRainy ? 18 + Math.floor(Math.random() * 3) : 22 + Math.floor(Math.random() * 5),
      pop: isRainy ? 70 + Math.floor(Math.random() * 20) : 5 + Math.floor(Math.random() * 15),
      reh: isRainy ? 70 + Math.floor(Math.random() * 10) : 40 + Math.floor(Math.random() * 20),
    })
  }

  return hourly
}

export const judgeOutdoorClass = (weather, air) => {
  const safeWeather = {
    t1h: toNumber(weather?.t1h, 20),
    pty: normalizePtyCode(weather?.pty),
    sky: normalizeSkyCode(weather?.sky),
    rn1: toNumber(weather?.rn1, 0),
    pop: toNumber(weather?.pop, 10),
    reh: toNumber(weather?.reh, 50),
  }

  const safeAir = {
    pm10Value: toNumber(air?.pm10Value, 20),
    pm10Grade: Math.max(1, Math.min(4, Math.floor(toNumber(air?.pm10Grade, 1)))),
    pm25Value: toNumber(air?.pm25Value, 15),
    pm25Grade: Math.max(1, Math.min(4, Math.floor(toNumber(air?.pm25Grade, 1)))),
  }

  const checks = {
    rain: {
      pass: safeWeather.pty === '0',
      label: '강수',
      value: safeWeather.pty === '0' ? '없음' : (PTY_CODE[safeWeather.pty]?.text || '강수'),
    },
    pm10: {
      pass: safeAir.pm10Value <= 80,
      label: '미세먼지',
      value: `${safeAir.pm10Value}㎍/㎥ (${getGradeInfo(safeAir.pm10Grade).text})`,
    },
    temp: {
      pass: safeWeather.t1h >= -5 && safeWeather.t1h <= 33,
      label: '기온',
      value: `${safeWeather.t1h}℃`,
    },
    pm10Warning: {
      pass: safeAir.pm10Value <= 50,
      label: '미세먼지 주의',
      value: '',
    },
  }

  const baseResult = {
    status: 'optimal',
    emoji: '✅',
    text: '야외 수업 최적',
    color: '#059669',
    reason: '',
    checks,
  }

  if (!checks.rain.pass) {
    return {
      ...baseResult,
      status: 'not-recommended',
      emoji: '❌',
      text: '실내 수업 추천',
      color: '#F57C7C',
      reason: `${checks.rain.value} 예보`,
    }
  }

  if (!checks.pm10.pass) {
    return {
      ...baseResult,
      status: 'not-recommended',
      emoji: '❌',
      text: '실내 수업 권장',
      color: '#F57C7C',
      reason: '미세먼지 나쁨',
    }
  }

  if (!checks.temp.pass) {
    return {
      ...baseResult,
      status: 'not-recommended',
      emoji: '❌',
      text: '실내 수업 권장',
      color: '#F57C7C',
      reason: safeWeather.t1h < -5 ? '기온이 너무 낮음' : '기온이 너무 높음',
    }
  }

  if (!checks.pm10Warning.pass) {
    return {
      ...baseResult,
      status: 'caution',
      emoji: '⚠️',
      text: '야외 가능 (마스크 권장)',
      color: '#D97706',
      reason: '미세먼지 보통~나쁨 수준',
    }
  }

  return baseResult
}
