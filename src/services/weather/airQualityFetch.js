// 에어코리아 API — 대기오염(미세먼지/초미세먼지) 데이터 fetch | 사용처→WeatherPage, 측정소→stationSearch.js, API키→.env.local
const API_KEY = import.meta.env.VITE_PUBLIC_DATA_API_KEY
const AIR_ENDPOINT = import.meta.env.VITE_AIR_API_ENDPOINT
const AIR_CACHE_TTL_MS = 1000 * 60 * 5
const AIR_STALE_TTL_MS = 1000 * 60 * 60 * 24
const AIR_CACHE = new Map()
const AIR_INFLIGHT = new Map()
const AIR_STALE_CACHE = new Map()
const limitText = (value, length = 180) => String(value).slice(0, length)
const looksLikeJson = (value) => {
  const trimmed = String(value || '').trim()
  return trimmed.startsWith('{') || trimmed.startsWith('[')
}

const getAirCacheKey = (stationName) =>
  `station:${String(stationName || '').trim().toLowerCase()}`

function getAirQualityFallback(stationName) {
  const cacheStationKey = getAirCacheKey(stationName)
  const fallback = AIR_STALE_CACHE.get(cacheStationKey)

  if (!fallback) {
    return null
  }

  if (Date.now() - fallback.updatedAt > AIR_STALE_TTL_MS) {
    AIR_STALE_CACHE.delete(cacheStationKey)
    return null
  }

  return fallback
}

export function getAirQualityFallbackData(stationName) {
  return getAirQualityFallback(stationName)?.data || null
}

/**
 * 에어코리아 대기오염정보 API 호출
 * 측정소별 실시간 측정정보 조회
 */
export async function fetchAirQualityData(stationName = '대전') {
  try {
    const params = new URLSearchParams({
      serviceKey: API_KEY,
      returnType: 'json',
      numOfRows: '1',
      pageNo: '1',
      stationName: stationName,
      dataTerm: 'DAILY',
      ver: '1.0',
    })

    const url = `${AIR_ENDPOINT}/getMsrstnAcctoRltmMesureDnsty?${params}`
    const cacheKey = url
    const cacheStationKey = getAirCacheKey(stationName)

    const cachedItem = AIR_CACHE.get(cacheKey)
    if (cachedItem && Date.now() - cachedItem.updatedAt < AIR_CACHE_TTL_MS) {
      return cachedItem.data
    }

    const inflight = AIR_INFLIGHT.get(cacheKey)
    if (inflight) {
      return inflight
    }

    const request = (async () => {
      try {
        const response = await fetch(url)
        const responseText = await response.text()

        if (!looksLikeJson(responseText)) {
          const preview = limitText(responseText || response.statusText || '요청 실패')
          throw new Error(`API 응답 형식 오류: ${preview}`)
        }

        if (!response.ok) {
          const preview = limitText(responseText || response.statusText || '요청 실패')
          throw new Error(`HTTP ${response.status}: ${preview}`)
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

        const item = data.response?.body?.items?.[0] || {}
        const pm10Val = parseInt(item.pm10Value) || 0
        const pm25Val = parseInt(item.pm25Value) || 0

        const airData = {
          stationName: item.stationName || stationName,
          dataTime: item.dataTime || new Date().toISOString(),
          pm10Value: pm10Val,
          pm10Grade: calcPm10Grade(pm10Val),
          pm25Value: pm25Val,
          pm25Grade: calcPm25Grade(pm25Val),
          uvIndex: 5, // 에어코리아에서는 제공 안 함
          uvGrade: 2,
        }

        AIR_CACHE.set(cacheKey, { data: airData, updatedAt: Date.now() })
        AIR_STALE_CACHE.set(cacheStationKey, {
          data: { ...airData, _stale: true },
          updatedAt: Date.now(),
        })

        return airData
      } catch (error) {
        const fallback = getAirQualityFallback(stationName)
        if (fallback) {
          return fallback.data
        }
        throw error
      }
    })()

    AIR_INFLIGHT.set(cacheKey, request)
    try {
      return await request
    } finally {
      AIR_INFLIGHT.delete(cacheKey)
    }
  } catch (error) {
    const fallback = getAirQualityFallback(stationName)
    if (fallback) {
      return fallback.data
    }

    console.error('에어코리아 API 호출 오류:', error)
    throw error
  }
}

// --- Internal helpers ---

// PM10 등급 계산 (환경부 기준: 0-30 좋음, 31-80 보통, 81-150 나쁨, 151+ 매우나쁨)
function calcPm10Grade(value) {
  if (value <= 30) return 1
  if (value <= 80) return 2
  if (value <= 150) return 3
  return 4
}

// PM2.5 등급 계산 (환경부 기준: 0-15 좋음, 16-35 보통, 36-75 나쁨, 76+ 매우나쁨)
function calcPm25Grade(value) {
  if (value <= 15) return 1
  if (value <= 35) return 2
  if (value <= 75) return 3
  return 4
}
