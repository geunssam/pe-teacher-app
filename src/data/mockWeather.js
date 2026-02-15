// 야외수업 판단 — 날씨 조건별 실외활동 가능 여부 + 개발용 목업 데이터 | 상수(SKY_CODE/PTY_CODE/PM_GRADE)→weather 컴포넌트들에서 import
/**
 * Mock Weather Data
 * 실제 API 연동 전까지 사용할 Mock 데이터
 *
 * 기상청 단기예보 + 에어코리아 + 생활기상지수 통합
 */

// 하늘상태 코드
export const SKY_CODE = {
  1: { text: '맑음', emoji: '☀️', color: '#D97706' },
  3: { text: '구름많음', emoji: '⛅', color: '#64748B' },
  4: { text: '흐림', emoji: '☁️', color: '#64748B' }
}

// 강수형태 코드
export const PTY_CODE = {
  0: { text: '없음', emoji: '', color: '' },
  1: { text: '비', emoji: '🌧️', color: '#7C9EF5' },
  2: { text: '비/눈', emoji: '🌨️', color: '#A78BFA' },
  3: { text: '눈', emoji: '❄️', color: '#0891B2' },
  5: { text: '빗방울', emoji: '💧', color: '#7C9EF5' },
  6: { text: '빗방울눈날림', emoji: '🌨️', color: '#A78BFA' },
  7: { text: '눈날림', emoji: '❄️', color: '#0891B2' }
}

// 미세먼지 등급
export const PM_GRADE = {
  1: { text: '좋음', emoji: '😊', color: '#059669', bg: 'rgba(5, 150, 105, 0.08)' },
  2: { text: '보통', emoji: '😐', color: '#D97706', bg: 'rgba(217, 119, 6, 0.08)' },
  3: { text: '나쁨', emoji: '😷', color: '#DC2626', bg: 'rgba(220, 38, 38, 0.08)' },
  4: { text: '매우나쁨', emoji: '🤢', color: '#991B1B', bg: 'rgba(153, 27, 27, 0.08)' }
}

const getNumber = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const getSkyCode = (value) => {
  const key = String(Math.max(1, Math.floor(Math.abs(getNumber(value, 1))))
  return SKY_CODE[key] ? key : '1'
}

const getPtyCode = (value) => {
  const parsed = getNumber(value, 0)
  const key = Math.max(0, Math.min(7, Math.floor(parsed)))
  return String(key) in PTY_CODE ? key : 0
}

const fallback = {
  text: '측정불가',
  emoji: '⚪',
  color: '#64748B',
  bg: 'rgba(100, 116, 139, 0.08)',
}

const getPmGrade = (value) => {
  const safeValue = Math.max(1, Math.min(4, Math.floor(getNumber(value, 1))))
  const grade = PM_GRADE[safeValue]
  return grade || fallback
}

/**
 * Mock 현재 날씨 데이터
 * 실제로는 기상청 API에서 받아옴
 */
export const getCurrentWeather = () => {
  const now = new Date()
  const hour = now.getHours()

  // 시간대별로 약간씩 다른 데이터 제공
  const isRainy = hour >= 14 && hour <= 17 // 오후 2~5시에 비
  const sky = isRainy ? 4 : (hour >= 18 || hour <= 6) ? 1 : 3
  const pty = isRainy ? 1 : 0

  return {
    baseDate: now.toISOString().split('T')[0].replace(/-/g, ''),
    baseTime: `${String(hour).padStart(2, '0')}00`,
    sky, // 하늘상태 (1:맑음, 3:구름많음, 4:흐림)
    pty, // 강수형태 (0:없음, 1:비, 2:비/눈, 3:눈)
    t1h: isRainy ? 18 : 24, // 기온 (℃)
    rn1: isRainy ? 5 : 0, // 1시간 강수량 (mm)
    reh: isRainy ? 75 : 45, // 습도 (%)
    pop: isRainy ? 80 : 10, // 강수확률 (%)
    wsd: 2.5 // 풍속 (m/s)
  }
}

/**
 * Mock 대기질 데이터
 * 실제로는 에어코리아 API에서 받아옴
 */
export const getAirQuality = () => {
  const now = new Date()
  const hour = now.getHours()

  // 출퇴근 시간대에 미세먼지 증가
  const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)
  const pm10Value = isRushHour ? 65 : 35
  const pm25Value = isRushHour ? 25 : 15

  return {
    stationName: '대전',
    dataTime: new Date().toISOString(),
    pm10Value, // PM10 농도 (㎍/㎥)
    pm10Grade: pm10Value > 80 ? 3 : pm10Value > 50 ? 2 : 1, // 1:좋음, 2:보통, 3:나쁨, 4:매우나쁨
    pm25Value, // PM2.5 농도 (㎍/㎥)
    pm25Grade: pm25Value > 35 ? 3 : pm25Value > 15 ? 2 : 1,
    uvIndex: 5, // 자외선 지수 (0~11+)
    uvGrade: 2 // 1:낮음, 2:보통, 3:높음, 4:매우높음, 5:위험
  }
}

/**
 * Mock 시간별 예보 데이터
 * 실제로는 기상청 단기예보 API에서 받아옴
 */
export const getHourlyForecast = () => {
  const now = new Date()
  const hourly = []

  for (let i = 0; i < 12; i++) {
    const time = new Date(now.getTime() + i * 60 * 60 * 1000)
    const hour = time.getHours()

    // 오후 2~5시 비
    const isRainy = hour >= 14 && hour <= 17
    const sky = isRainy ? 4 : (hour >= 18 || hour <= 6) ? 1 : 3
    const pty = isRainy ? 1 : 0

    hourly.push({
      time: `${String(hour).padStart(2, '0')}시`,
      sky,
      pty,
      temp: isRainy ? 18 + Math.floor(Math.random() * 3) : 22 + Math.floor(Math.random() * 5),
      pop: isRainy ? 70 + Math.floor(Math.random() * 20) : 5 + Math.floor(Math.random() * 15),
      reh: isRainy ? 70 + Math.floor(Math.random() * 10) : 40 + Math.floor(Math.random() * 20)
    })
  }

  return hourly
}

/**
 * 야외수업 자동 판단 로직
 * @param {Object} weather - 현재 날씨 데이터
 * @param {Object} air - 대기질 데이터
 * @returns {Object} 판정 결과
 */
export const judgeOutdoorClass = (weather, air) => {
  const safeWeather = {
    t1h: getNumber(weather?.t1h, 20),
    pty: getPtyCode(weather?.pty),
    sky: getSkyCode(weather?.sky),
    rn1: getNumber(weather?.rn1, 0),
    pop: getNumber(weather?.pop, 10),
    reh: getNumber(weather?.reh, 50),
  }

  const safeAir = {
    pm10Value: getNumber(air?.pm10Value, 20),
    pm10Grade: Math.max(1, Math.min(4, Math.floor(getNumber(air?.pm10Grade, 1)))),
    pm25Value: getNumber(air?.pm25Value, 15),
    pm25Grade: Math.max(1, Math.min(4, Math.floor(getNumber(air?.pm25Grade, 1)))),
  }

  const rainLabel = safeWeather.pty === 0 ? '없음' : PTY_CODE[safeWeather.pty]?.text || '강수'

  const checks = {
    rain: { pass: safeWeather.pty === 0, label: '강수', value: rainLabel },
    pm10: {
      pass: safeAir.pm10Value <= 80,
      label: '미세먼지',
      value: `${safeAir.pm10Value}㎍/㎥ (${getPmGrade(safeAir.pm10Grade).text})`,
    },
    temp: {
      pass: safeWeather.t1h >= -5 && safeWeather.t1h <= 33,
      label: '기온',
      value: `${safeWeather.t1h}℃`,
    },
    pm10Warning: { pass: safeAir.pm10Value <= 50, label: '미세먼지 주의', value: '' }
  }

  let result = {
    status: 'optimal', // 'optimal', 'caution', 'not-recommended'
    emoji: '✅',
    text: '야외 수업 최적',
    color: '#059669',
    reason: '',
    checks
  }

  // 1순위: 강수
  if (!checks.rain.pass) {
    result = {
      ...result,
      status: 'not-recommended',
      emoji: '❌',
      text: '실내 수업 추천',
      color: '#F57C7C',
      reason: `${checks.rain.value} 예보`
    }
    return result
  }

  // 2순위: 미세먼지 나쁨
  if (!checks.pm10.pass) {
    result = {
      ...result,
      status: 'not-recommended',
      emoji: '❌',
      text: '실내 수업 권장',
      color: '#F57C7C',
      reason: '미세먼지 나쁨'
    }
    return result
  }

  // 3순위: 기온 부적합
  if (!checks.temp.pass) {
    result = {
      ...result,
      status: 'not-recommended',
      emoji: '❌',
      text: '실내 수업 권장',
      color: '#F57C7C',
      reason: safeWeather.t1h < -5 ? '기온이 너무 낮음' : '기온이 너무 높음'
    }
    return result
  }

  // 4순위: 미세먼지 보통 상위 (마스크 권장)
  if (!checks.pm10Warning.pass) {
    result = {
      ...result,
      status: 'caution',
      emoji: '⚠️',
      text: '야외 가능 (마스크 권장)',
      color: '#D97706',
      reason: '미세먼지 보통~나쁨 수준'
    }
    return result
  }

  return result
}
