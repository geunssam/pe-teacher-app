// 기상청 API — 단기예보 데이터 fetch + 파싱 | 사용처→WeatherPage/HomePage, 좌표변환→utils/gridConvert.js, API키→.env.local
import { latLonToGrid, DEFAULT_LOCATION } from '../../utils/gridConvert'
import { getCurrentWeather as getMockCurrentWeather, getHourlyForecast as getMockHourlyForecast } from '../../data/mockWeather'

const API_KEY = import.meta.env.VITE_PUBLIC_DATA_API_KEY
const WEATHER_ENDPOINT = import.meta.env.VITE_WEATHER_API_ENDPOINT
const ULTRA_SRT_NCST_DELAY_MIN = 40
const VILAGE_FCST_DELAY_MIN = 10
const VILAGE_BASE_HOURS = [2, 5, 8, 11, 14, 17, 20, 23]
const WEATHER_CACHE_TTL_MS = 1000 * 60 * 3
const WEATHER_STALE_TTL_MS = 1000 * 60 * 60 * 24
const WEATHER_CACHE = new Map()
const WEATHER_INFLIGHT = new Map()
const WEATHER_STALE_CACHE = new Map()

const limitText = (value, length = 180) =>
  String(value).slice(0, length)

const looksLikeJson = (value) => {
  const trimmed = String(value || '').trim()
  return trimmed.startsWith('{') || trimmed.startsWith('[')
}

const isRateLimitError = (error) => {
  const message = String(error?.message || '').toLowerCase()
  return (
    message.includes('429') ||
    message.includes('too many requests') ||
    message.includes('rate limit') ||
    message.includes('api rate') ||
    message.includes('요청횟수')
  )
}

const isRateLimitResponseText = (value) => {
  const text = String(value || '').toLowerCase()
  return (
    text.includes('api rate') ||
    text.includes('too many requests') ||
    text.includes('rate limit') ||
    text.includes('429') ||
    text.includes('요청횟수')
  )
}

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
      const query = {
        serviceKey: API_KEY,
        pageNo: '1',
        numOfRows: '100',
        dataType: 'JSON',
        base_date: baseDate,
        base_time: baseTime,
        nx: nx.toString(),
        ny: ny.toString(),
      }

      try {
        const data = await fetchWeatherEndpoint('getUltraSrtNcst', query)
        const weatherResult = buildCurrentWeatherResult(data, baseDate, baseTime)

        if (!weatherResult) {
          lastNoDataError = new Error('NO_DATA')
          continue
        }

        return weatherResult
      } catch (error) {
        if (isNoDataError(error)) {
          lastNoDataError = error
          continue
        }

        if (isRateLimitError(error)) {
          return {
            ...getMockCurrentWeather(),
            baseDate,
            baseTime,
            isMock: true,
            isStale: true,
          }
        }

        const fallback = getWeatherFallbackData(query)
        const fallbackWeather = buildCurrentWeatherResult(
          fallback,
          baseDate,
          baseTime
        )
        if (fallbackWeather) {
          return { ...fallbackWeather, isStale: true }
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
      const query = {
        serviceKey: API_KEY,
        pageNo: '1',
        numOfRows: '600',
        dataType: 'JSON',
        base_date: baseDate,
        base_time: baseTime,
        nx: nx.toString(),
        ny: ny.toString(),
      }

      try {
        const data = await fetchWeatherEndpoint('getVilageFcst', query)
        const forecastResult = buildHourlyForecastResult(data, baseDate, baseTime)

        if (!forecastResult) {
          lastNoDataError = new Error('NO_DATA')
          continue
        }

        return forecastResult
      } catch (error) {
        if (isNoDataError(error)) {
          lastNoDataError = error
          continue
        }

        if (isRateLimitError(error)) {
          return {
            forecast: getMockHourlyForecast(),
            baseDate,
            baseTime,
            isMock: true,
            isStale: true,
          }
        }

        const fallback = getWeatherFallbackData(query)
        const fallbackForecast = buildHourlyForecastResult(
          fallback,
          baseDate,
          baseTime
        )
        if (fallbackForecast) {
          return { ...fallbackForecast, isStale: true }
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

function buildCurrentWeatherResult(data, baseDate, baseTime) {
  const items = data.response?.body?.items?.item || []
  if (items.length === 0) {
    return null
  }

  return {
    baseDate,
    baseTime,
    t1h: getItemValue(items, 'T1H') || 20,
    rn1: getItemValue(items, 'RN1') || 0,
    reh: getItemValue(items, 'REH') || 50,
    pty: getItemValue(items, 'PTY') || 0,
    sky: 1,
    pop: 10,
    wsd: getItemValue(items, 'WSD') || 2.5,
  }
}

function buildHourlyForecastResult(data, baseDate, baseTime) {
  const items = data.response?.body?.items?.item || []
  const hourlyData = groupByTime(items)

  if (hourlyData.length === 0) {
    return null
  }

  return {
    forecast: hourlyData,
    baseDate,
    baseTime,
  }
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
  const cacheKey = url
  const fallbackKey = makeFallbackCacheKey(query)

  const cachedItem = WEATHER_CACHE.get(cacheKey)
  if (cachedItem && Date.now() - cachedItem.updatedAt < WEATHER_CACHE_TTL_MS) {
    return cachedItem.data
  }

  const inFlight = WEATHER_INFLIGHT.get(cacheKey)
  if (inFlight) {
    return inFlight
  }

  const request = (async () => {
    const response = await fetch(url)
    const responseText = await response.text()

    if (!response.ok) {
      const preview = limitText(responseText || response.statusText || '요청 실패')
      throw new Error(`HTTP ${response.status}: ${preview}`)
    }

    if (!looksLikeJson(responseText)) {
      if (isRateLimitResponseText(responseText)) {
        throw new Error('API 응답 형식 오류: API rate limit exceeded')
      }
      const preview = limitText(responseText || response.statusText || '요청 실패')
      throw new Error(`API 응답 형식 오류: ${preview}`)
    }

    let data
    try {
      data = JSON.parse(responseText)
    } catch (error) {
      const preview = limitText(responseText)
      throw new Error(`API 응답 형식 오류: ${preview}`)
    }

    if (data.response?.header?.resultCode !== '00') {
      const resultCode = data.response?.header?.resultCode || 'UNKNOWN'
      const resultMsg = data.response?.header?.resultMsg || 'API 호출 실패'
      throw new Error(`API 호출 실패 [${resultCode}] ${resultMsg}`)
    }

    WEATHER_CACHE.set(cacheKey, { data, updatedAt: Date.now() })
    WEATHER_STALE_CACHE.set(fallbackKey, {
      data,
      updatedAt: Date.now(),
    })
    return data
  })()

  WEATHER_INFLIGHT.set(cacheKey, request)
  try {
    return await request
  } finally {
    WEATHER_INFLIGHT.delete(cacheKey)
  }
}

function makeFallbackCacheKey(query) {
  const params = new URLSearchParams(query)
  params.delete('base_date')
  params.delete('base_time')
  return params.toString()
}

function getWeatherFallbackData(query) {
  const fallbackKey = makeFallbackCacheKey(query)
  const fallback = WEATHER_STALE_CACHE.get(fallbackKey)

  if (!fallback) {
    return null
  }

  if (Date.now() - fallback.updatedAt > WEATHER_STALE_TTL_MS) {
    WEATHER_STALE_CACHE.delete(fallbackKey)
    return null
  }

  return {
    ...fallback.data,
    _stale: true,
  }
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
