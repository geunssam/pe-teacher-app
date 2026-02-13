import { latLonToGrid, DEFAULT_LOCATION, CITY_COORDS } from '../utils/gridConvert'

const API_KEY = import.meta.env.VITE_PUBLIC_DATA_API_KEY
const WEATHER_ENDPOINT = import.meta.env.VITE_WEATHER_API_ENDPOINT
const AIR_ENDPOINT = import.meta.env.VITE_AIR_API_ENDPOINT
const AIR_STATION_ENDPOINT =
  import.meta.env.VITE_AIR_STATION_API_ENDPOINT || 'https://apis.data.go.kr/B552584/MsrstnInfoInqireSvc'
const ULTRA_SRT_NCST_DELAY_MIN = 40
const VILAGE_FCST_DELAY_MIN = 10
const VILAGE_BASE_HOURS = [2, 5, 8, 11, 14, 17, 20, 23]
const STATION_LIST_CACHE = new Map()
const UMD_TM_CACHE = new Map()
const NEARBY_STATION_CACHE = new Map()

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
    
    const response = await fetch(url)
    const data = await response.json()

    if (data.response?.header?.resultCode !== '00') {
      throw new Error(data.response?.header?.resultMsg || 'API 호출 실패')
    }

    const item = data.response?.body?.items?.[0] || {}

    const airData = {
      stationName: item.stationName || stationName,
      dataTime: item.dataTime || new Date().toISOString(),
      pm10Value: parseInt(item.pm10Value) || 35,
      pm10Grade: parseInt(item.pm10Grade1h) || 1,
      pm25Value: parseInt(item.pm25Value) || 15,
      pm25Grade: parseInt(item.pm25Grade1h) || 1,
      uvIndex: 5, // 에어코리아에서는 제공 안 함
      uvGrade: 2,
    }

    return airData
  } catch (error) {
    console.error('에어코리아 API 호출 오류:', error)
    throw error
  }
}

/**
 * 유틸리티 함수들
 */

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

  // 오늘+내일 12시간치만 (3시간 간격)
  return Object.values(grouped)
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
    .filter((item) => item.temp !== null)
    .slice(0, 12)
    .filter((_, index) => index % 3 === 0) // 3시간 간격
}

function guessSidoName(address = '', lat, lon) {
  const normalized = String(address || '')
  const sidoCandidates = [
    '서울',
    '부산',
    '대구',
    '인천',
    '광주',
    '대전',
    '울산',
    '세종',
    '경기',
    '강원',
    '충북',
    '충남',
    '전북',
    '전남',
    '경북',
    '경남',
    '제주',
  ]

  const matched = sidoCandidates.find((sido) => normalized.includes(sido))
  if (matched) {
    return matched
  }

  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    let nearestCity = '대전'
    let nearestDistance = Number.POSITIVE_INFINITY

    Object.entries(CITY_COORDS).forEach(([cityName, coords]) => {
      const dLat = coords.lat - lat
      const dLon = coords.lon - lon
      const distance = dLat * dLat + dLon * dLon
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestCity = cityName
      }
    })

    return nearestCity
  }

  return '대전'
}

function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function getTmCoordsByNaver(lat, lon) {
  if (typeof window === 'undefined') {
    return null
  }

  const naver = window.naver
  if (!naver?.maps?.TransCoord || !naver.maps.LatLng) {
    return null
  }

  try {
    const latLng = new naver.maps.LatLng(lat, lon)
    const tmPoint = naver.maps.TransCoord.fromLatLngToUTMK(latLng)
    if (!Number.isFinite(tmPoint?.x) || !Number.isFinite(tmPoint?.y)) {
      return null
    }
    return { tmX: tmPoint.x, tmY: tmPoint.y }
  } catch (error) {
    console.warn('TM 좌표 변환 실패:', error)
    return null
  }
}

function extractUmdName(addressHint = '') {
  const tokens = String(addressHint || '')
    .replace(/[,_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((token) => token.replace(/[0-9.-]/g, ''))
    .filter(Boolean)

  const umdTokens = tokens.filter((token) => /(동|읍|면|리)$/.test(token))
  return umdTokens[umdTokens.length - 1] || ''
}

async function fetchTmCoordByUmdName(umdName, addressHint = '') {
  const normalized = String(umdName || '').trim()
  if (!normalized) {
    return null
  }

  const cacheKey = `${normalized}:${addressHint}`
  if (UMD_TM_CACHE.has(cacheKey)) {
    return UMD_TM_CACHE.get(cacheKey)
  }

  const params = new URLSearchParams({
    serviceKey: API_KEY,
    returnType: 'json',
    pageNo: '1',
    numOfRows: '20',
    umdName: normalized,
  })

  const url = `${AIR_STATION_ENDPOINT}/getTMStdrCrdnt?${params}`
  const response = await fetch(url)
  const text = await response.text()

  if (!response.ok) {
    throw new Error(`TM 좌표 변환 조회 실패: HTTP ${response.status}`)
  }

  if (!text || text.startsWith('Forbidden')) {
    throw new Error('TM 좌표 변환 조회 권한 없음')
  }

  let data = null
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('TM 좌표 변환 응답 파싱 실패')
  }

  if (data.response?.header?.resultCode !== '00') {
    throw new Error(data.response?.header?.resultMsg || 'TM 좌표 변환 실패')
  }

  const items = data.response?.body?.items || []
  if (!items.length) {
    UMD_TM_CACHE.set(cacheKey, null)
    return null
  }

  // 동일 읍면동이 여러 도시에 있을 수 있으므로 주소 힌트로 매칭
  let best = items[0]
  if (items.length > 1 && addressHint) {
    const hintLower = addressHint.toLowerCase()
    const matched = items.find((item) => {
      const sido = String(item.sidoName || '').toLowerCase()
      const sgg = String(item.sggName || '').toLowerCase()
      return hintLower.includes(sido) || hintLower.includes(sgg)
    })
    if (matched) {
      best = matched
    }
  }

  const tmX = Number(best?.tmX)
  const tmY = Number(best?.tmY)

  if (!Number.isFinite(tmX) || !Number.isFinite(tmY)) {
    UMD_TM_CACHE.set(cacheKey, null)
    return null
  }

  const value = { tmX, tmY }
  UMD_TM_CACHE.set(cacheKey, value)
  return value
}

async function fetchNearbyStationsByTm(tmX, tmY) {
  const params = new URLSearchParams({
    serviceKey: API_KEY,
    returnType: 'json',
    tmX: String(tmX),
    tmY: String(tmY),
    ver: '1.1',
  })

  const url = `${AIR_STATION_ENDPOINT}/getNearbyMsrstnList?${params}`
  const response = await fetch(url)
  const text = await response.text()

  if (!response.ok) {
    throw new Error(`근접 측정소 조회 실패: HTTP ${response.status}`)
  }

  if (!text || text.startsWith('Forbidden')) {
    throw new Error('근접 측정소 조회 권한 없음')
  }

  const data = JSON.parse(text)
  if (data.response?.header?.resultCode !== '00') {
    throw new Error(data.response?.header?.resultMsg || '근접 측정소 조회 실패')
  }

  return data.response?.body?.items || []
}

async function findNearestStationByTm(tmX, tmY) {
  if (!Number.isFinite(tmX) || !Number.isFinite(tmY)) {
    return null
  }

  const cacheKey = `${Math.round(tmX)}:${Math.round(tmY)}`
  if (NEARBY_STATION_CACHE.has(cacheKey)) {
    return NEARBY_STATION_CACHE.get(cacheKey)
  }

  const nearbyItems = await fetchNearbyStationsByTm(tmX, tmY)
  if (!nearbyItems.length) {
    NEARBY_STATION_CACHE.set(cacheKey, null)
    return null
  }

  const nearest = nearbyItems[0]
  const value = {
    stationName: nearest.stationName,
    distance: Number.isFinite(parseFloat(nearest.tm)) ? parseFloat(nearest.tm) : null,
  }
  NEARBY_STATION_CACHE.set(cacheKey, value)
  return value
}

function isValidKoreaLatLon(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= 32 && lat <= 40 && lon >= 124 && lon <= 132
}

function convertTm128ToLatLon(tmX, tmY) {
  if (typeof window === 'undefined') {
    return null
  }

  const naver = window.naver
  if (!naver?.maps?.TransCoord || !naver.maps.Point) {
    return null
  }

  const convert = (x, y) => {
    try {
      const tmPoint = new naver.maps.Point(x, y)
      const latLng = naver.maps.TransCoord.fromTM128ToLatLng(tmPoint)
      const lat =
        typeof latLng?.lat === 'function'
          ? latLng.lat()
          : Number(latLng?.y ?? latLng?.lat ?? NaN)
      const lon =
        typeof latLng?.lng === 'function'
          ? latLng.lng()
          : Number(latLng?.x ?? latLng?.lng ?? latLng?.lon ?? NaN)

      if (isValidKoreaLatLon(lat, lon)) {
        return { lat, lon }
      }
      return null
    } catch {
      return null
    }
  }

  return convert(tmX, tmY) || convert(tmY, tmX)
}

function parseStationCoord(item = {}) {
  const latLonPairs = [
    [Number(item.lat), Number(item.lon)],
    [Number(item.latitude), Number(item.longitude)],
    [Number(item.dmY), Number(item.dmX)],
    [Number(item.tmY), Number(item.tmX)],
  ]

  for (const [lat, lon] of latLonPairs) {
    if (isValidKoreaLatLon(lat, lon)) {
      return { lat, lon }
    }

    if (isValidKoreaLatLon(lon, lat)) {
      return { lat: lon, lon: lat }
    }
  }

  const tmPairs = [
    [Number(item.tmX), Number(item.tmY)],
    [Number(item.dmX), Number(item.dmY)],
  ]

  for (const [tmX, tmY] of tmPairs) {
    if (!Number.isFinite(tmX) || !Number.isFinite(tmY)) {
      continue
    }

    const converted = convertTm128ToLatLon(tmX, tmY)
    if (converted) {
      return converted
    }
  }

  return null
}

function normalizeStationItem(item = {}) {
  const coord = parseStationCoord(item)
  return {
    stationName: String(item.stationName || '').trim(),
    addr: String(item.addr || '').trim(),
    lat: coord?.lat ?? null,
    lon: coord?.lon ?? null,
  }
}

function extractAddressTokens(addressHint = '') {
  return String(addressHint || '')
    .replace(/[,_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
}

function buildStationSearchKeywords(addressHint = '', lat, lon) {
  const tokens = extractAddressTokens(addressHint)
  const keywords = []
  const seen = new Set()

  const push = (value) => {
    const normalized = String(value || '').trim()
    if (!normalized || seen.has(normalized)) {
      return
    }
    seen.add(normalized)
    keywords.push(normalized)
  }

  if (tokens.length >= 4) {
    push(`${tokens[0]} ${tokens[1]} ${tokens[2]} ${tokens[3]}`)
  }
  if (tokens.length >= 3) {
    push(`${tokens[0]} ${tokens[1]} ${tokens[2]}`)
  }
  if (tokens.length >= 2) {
    push(`${tokens[0]} ${tokens[1]}`)
  }
  if (tokens.length >= 1) {
    push(tokens[0])
  }

  tokens
    .filter((token) => /(시|군|구|읍|면|동|리)$/.test(token))
    .forEach((token) => push(token))

  const guessedSido = guessSidoName(addressHint, lat, lon)
  push(guessedSido)

  return keywords.slice(0, 5)
}

async function fetchStationsByAddress(addrKeyword) {
  const query = String(addrKeyword || '').trim()
  if (!query) {
    return []
  }

  if (STATION_LIST_CACHE.has(query)) {
    return STATION_LIST_CACHE.get(query)
  }

  const params = new URLSearchParams({
    serviceKey: API_KEY,
    returnType: 'json',
    numOfRows: '500',
    pageNo: '1',
    addr: query,
    ver: '1.1',
  })

  const url = `${AIR_STATION_ENDPOINT}/getMsrstnList?${params}`
  const response = await fetch(url)
  const text = await response.text()

  if (!response.ok) {
    throw new Error(`측정소 목록 조회 실패: HTTP ${response.status}`)
  }

  if (!text || text.startsWith('Forbidden')) {
    throw new Error('측정소 목록 조회 권한 없음')
  }

  let data = null
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('측정소 목록 응답 파싱 실패')
  }

  if (data.response?.header?.resultCode !== '00') {
    throw new Error(data.response?.header?.resultMsg || '측정소 목록 조회 실패')
  }

  const items = (data.response?.body?.items || [])
    .map((item) => normalizeStationItem(item))
    .filter((item) => item.stationName)

  STATION_LIST_CACHE.set(query, items)
  return items
}

function pickNearestStationByDistance(stations = [], lat, lon) {
  const nearest = stations
    .filter((item) => isValidKoreaLatLon(item.lat, item.lon))
    .map((item) => ({
      stationName: item.stationName,
      distance: haversineDistanceKm(lat, lon, item.lat, item.lon),
    }))
    .sort((a, b) => a.distance - b.distance)[0]

  return nearest || null
}

function scoreStationNameByAddress(stationName, addressHint = '') {
  const target = String(stationName || '')
  const tokens = extractAddressTokens(addressHint)
  let score = 0

  tokens.forEach((token, index) => {
    if (!token) {
      return
    }
    if (target.includes(token)) {
      score += index < 3 ? 24 : 12
    }
    if (token.includes(target)) {
      score += 10
    }
  })

  if (/(동|읍|면|리)$/.test(target)) {
    score += 6
  }

  return score
}

function pickNearestStationByName(stations = [], addressHint = '') {
  const ranked = stations
    .map((item) => ({
      stationName: item.stationName,
      score: scoreStationNameByAddress(item.stationName, addressHint),
    }))
    .sort((a, b) => b.score - a.score)

  if (!ranked.length || ranked[0].score <= 0) {
    return null
  }

  return {
    stationName: ranked[0].stationName,
    distance: null,
  }
}

async function findNearestStationByAddressList(lat, lon, addressHint = '') {
  const keywords = buildStationSearchKeywords(addressHint, lat, lon)
  const merged = []
  const dedupe = new Set()

  for (const keyword of keywords) {
    let items = []
    try {
      items = await fetchStationsByAddress(keyword)
    } catch (error) {
      console.warn(`측정소 목록 조회 실패 (${keyword})`, error)
      continue
    }

    items.forEach((item) => {
      const key = `${item.stationName}:${item.addr}`
      if (dedupe.has(key)) {
        return
      }
      dedupe.add(key)
      merged.push(item)
    })
  }

  if (!merged.length) {
    return null
  }

  const nearest = pickNearestStationByDistance(merged, lat, lon)
  if (nearest) {
    return nearest
  }

  const byName = pickNearestStationByName(merged, addressHint)
  if (byName) {
    return byName
  }

  return { stationName: merged[0].stationName, distance: null }
}

async function inferNearestStationBySido(lat, lon, addressHint = '') {
  const sidoName = guessSidoName(addressHint, lat, lon)
  const params = new URLSearchParams({
    serviceKey: API_KEY,
    returnType: 'json',
    numOfRows: '100',
    pageNo: '1',
    sidoName,
    ver: '1.0',
  })

  const url = `${AIR_ENDPOINT}/getCtprvnRltmMesureDnsty?${params}`
  const response = await fetch(url)
  const data = await response.json()

  if (data.response?.header?.resultCode !== '00') {
    throw new Error(data.response?.header?.resultMsg || '시도별 측정소 조회 실패')
  }

  const stationNames = Array.from(
    new Set((data.response?.body?.items || []).map((item) => item.stationName).filter(Boolean))
  )

  if (!stationNames.length) {
    return null
  }

  const direct = stationNames.find((name) => String(addressHint).includes(name))
  if (direct) {
    return { stationName: direct, distance: null }
  }

  const districtToken = extractAddressTokens(addressHint).find((token) => /(동|읍|면|리)$/.test(token))
  if (districtToken) {
    const partial = stationNames.find(
      (station) => station.includes(districtToken) || districtToken.includes(station)
    )
    if (partial) {
      return { stationName: partial, distance: null }
    }
  }

  return { stationName: stationNames[0], distance: null }
}

/**
 * 좌표 기반 가장 가까운 측정소 찾기
 * - 1순위: 에어코리아 근접 측정소 API (TM 좌표 필요)
 * - 2순위: 시도별 측정소 목록 + 위치 기반 추론
 */
export async function findNearestStation(lat, lon, addressHint = '') {
  const umdName = extractUmdName(addressHint)

  try {
    if (umdName) {
      const tmCoord = await fetchTmCoordByUmdName(umdName, addressHint)
      if (tmCoord) {
        const nearestByUmd = await findNearestStationByTm(tmCoord.tmX, tmCoord.tmY)
        if (nearestByUmd) {
          return nearestByUmd
        }
      }
    }
  } catch (error) {
    console.warn('TM 기준좌표 변환 API fallback 전환:', error)
  }

  // 참고: naver.maps.TransCoord는 TM128/UTMK만 지원하며
  // 에어코리아 API가 기대하는 TM 중부원점 좌표계와 달라서 사용하지 않음.
  // UMD 기반 검색(1순위)이나 주소 기반 검색(3순위)이 더 정확함.

  try {
    const stationByList = await findNearestStationByAddressList(lat, lon, addressHint)
    if (stationByList) {
      return stationByList
    }
  } catch (error) {
    console.warn('주소 기반 측정소 조회 fallback 전환:', error)
  }

  try {
    const inferred = await inferNearestStationBySido(lat, lon, addressHint)
    if (inferred) {
      return inferred
    }
  } catch (error) {
    console.error('시도 기반 측정소 추론 실패:', error)
  }

  return { stationName: guessSidoName(addressHint, lat, lon), distance: null }
}
