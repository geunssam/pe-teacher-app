// 기상청 API — 단기예보 데이터 fetch + 파싱 | 사용처→WeatherPage/HomePage, 좌표변환→utils/gridConvert.js, API키→.env.local
import { latLonToGrid, DEFAULT_LOCATION } from '../../utils/gridConvert'

const API_KEY = import.meta.env.VITE_PUBLIC_DATA_API_KEY
const WEATHER_ENDPOINT = import.meta.env.VITE_WEATHER_API_ENDPOINT
const ULTRA_SRT_NCST_DELAY_MIN = 40
const VILAGE_FCST_DELAY_MIN = 10
const VILAGE_BASE_HOURS = [2, 5, 8, 11, 14, 17, 20, 23]

/**
 * 기상청 단기예보 API 호출
 * 초단기실황 조회 (getUltraSrtNcst)
 */
export async function fetchWeatherData(location = DEFAULT_LOCATION) {
  try {
    const { nx, ny } = latLonToGrid(location.lat, location.lon)

    // 발표 지연/갱신 지연을 고려해 최근 3개 회차까지 재시도
    const now = new Date()
    let lastNoDataError = null

    for (let attempt = 0; attempt < 3; attempt++) {
      const referenceTime = new Date(now.getTime() - attempt * 60 * 60 * 1000)
      const { baseDate, baseTime } = getUltraSrtNcstBaseDateTime(referenceTime)

      try {
        const data = await fetchWeatherEndpoint('getUltraSrtNcst', {
          serviceKey: API_KEY,
          pageNo: '1',
          numOfRows: '100',
          dataType: 'JSON',
          base_date: baseDate,
          base_time: baseTime,
          nx: nx.toString(),
          ny: ny.toString(),
        })

        const items = data.response?.body?.items?.item || []
        if (items.length === 0) {
          lastNoDataError = new Error('NO_DATA')
          continue
        }

        // 데이터 파싱
        return {
          baseDate,
          baseTime,
          t1h: getItemValue(items, 'T1H') || 20, // 기온
          rn1: getItemValue(items, 'RN1') || 0, // 1시간 강수량
          reh: getItemValue(items, 'REH') || 50, // 습도
          pty: getItemValue(items, 'PTY') || 0, // 강수형태
          sky: 1, // 초단기실황에는 SKY가 없으므로 기본값
          pop: 10, // 초단기실황에는 POP가 없으므로 기본값
          wsd: getItemValue(items, 'WSD') || 2.5, // 풍속
        }
      } catch (error) {
        if (isNoDataError(error)) {
          lastNoDataError = error
          continue
        }
        throw error
      }
    }

    throw lastNoDataError || new Error('NO_DATA')
  } catch (error) {
    console.error('기상청 API 호출 오류:', error)
    throw error
  }
}

/**
 * 기상청 단기예보 API 호출 (시간별 예보)
 * 단기예보 조회 (getVilageFcst)
 */
export async function fetchHourlyForecast(location = DEFAULT_LOCATION) {
  try {
    const { nx, ny } = latLonToGrid(location.lat, location.lon)

    // 발표 지연/갱신 지연을 고려해 최근 4개 회차까지 재시도
    const now = new Date()
    let lastNoDataError = null

    for (let attempt = 0; attempt < 4; attempt++) {
      const referenceTime = new Date(now.getTime() - attempt * 3 * 60 * 60 * 1000)
      const { baseDate, baseTime } = getVilageFcstBaseDateTime(referenceTime)

      try {
        const data = await fetchWeatherEndpoint('getVilageFcst', {
          serviceKey: API_KEY,
          pageNo: '1',
          numOfRows: '600', // 카테고리별 항목 충분히 확보
          dataType: 'JSON',
          base_date: baseDate,
          base_time: baseTime,
          nx: nx.toString(),
          ny: ny.toString(),
        })

        const items = data.response?.body?.items?.item || []
        if (items.length === 0) {
          lastNoDataError = new Error('NO_DATA')
          continue
        }

        // 시간별로 그룹핑
        const hourlyData = groupByTime(items)
        if (hourlyData.length > 0) {
          return {
            forecast: hourlyData,
            baseDate,
            baseTime,
          }
        }

        lastNoDataError = new Error('NO_DATA')
      } catch (error) {
        if (isNoDataError(error)) {
          lastNoDataError = error
          continue
        }
        throw error
      }
    }

    throw lastNoDataError || new Error('NO_DATA')
  } catch (error) {
    console.error('단기예보 API 호출 오류:', error)
    throw error
  }
}

// --- Internal helpers ---

// 날짜 포맷 (YYYYMMDD)
function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

function toYmdHm(date) {
  return {
    baseDate: formatDate(date),
    baseTime: `${String(date.getHours()).padStart(2, '0')}00`,
  }
}

function shiftMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000)
}

// 초단기실황 기준시각 계산 (매시각 발표, 대략 40분 이후 안정)
function getUltraSrtNcstBaseDateTime(now) {
  const effective = shiftMinutes(now, -ULTRA_SRT_NCST_DELAY_MIN)
  return toYmdHm(effective)
}

// 아이템에서 값 추출
function getItemValue(items, category) {
  const item = items.find((i) => i.category === category)
  if (!item) return null

  const value = parseFloat(item.obsrValue)
  return isNaN(value) ? null : value
}

// 단기예보 기준시각 계산 (02, 05, 08, 11, 14, 17, 20, 23시 발표, 약 10분 지연)
function getVilageFcstBaseDateTime(now) {
  const effective = shiftMinutes(now, -VILAGE_FCST_DELAY_MIN)
  const year = effective.getFullYear()
  const month = effective.getMonth()
  const day = effective.getDate()
  const hour = effective.getHours()

  let baseHour = null

  for (let i = VILAGE_BASE_HOURS.length - 1; i >= 0; i--) {
    if (hour >= VILAGE_BASE_HOURS[i]) {
      baseHour = VILAGE_BASE_HOURS[i]
      break
    }
  }

  if (baseHour === null) {
    const previousDayLastBase = new Date(year, month, day, 23, 0, 0, 0)
    previousDayLastBase.setDate(previousDayLastBase.getDate() - 1)
    return toYmdHm(previousDayLastBase)
  }

  return toYmdHm(new Date(year, month, day, baseHour, 0, 0, 0))
}

function isNoDataError(error) {
  const message = String(error?.message || '')
  return message.includes('NO_DATA') || message.includes('데이터없음')
}

async function fetchWeatherEndpoint(path, query) {
  const params = new URLSearchParams(query)
  const url = `${WEATHER_ENDPOINT}/${path}?${params}`
  const response = await fetch(url)
  const data = await response.json()

  if (data.response?.header?.resultCode !== '00') {
    throw new Error(data.response?.header?.resultMsg || 'API 호출 실패')
  }

  return data
}

// 시간별로 그룹핑
function groupByTime(items) {
  const grouped = {}

  items.forEach((item) => {
    const key = `${item.fcstDate}-${item.fcstTime}`

    if (!grouped[key]) {
      grouped[key] = {
        date: item.fcstDate,
        time: item.fcstTime,
        temp: null,
        pop: null, // 강수확률
        pty: null, // 강수형태
        sky: null, // 하늘상태
      }
    }

    // 카테고리별 값 할당
    const value = parseFloat(item.fcstValue)
    if (isNaN(value)) return

    switch (item.category) {
      case 'TMP': // 기온
        grouped[key].temp = value
        break
      case 'POP': // 강수확률
        grouped[key].pop = value
        break
      case 'PTY': // 강수형태
        grouped[key].pty = value
        break
      case 'SKY': // 하늘상태
        grouped[key].sky = value
        break
    }
  })

  // 시간별 예보 (API가 이미 3시간 간격, 최대 8개 = 24시간)
  return Object.values(grouped)
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
    .filter((item) => item.temp !== null)
    .slice(0, 8)
}
