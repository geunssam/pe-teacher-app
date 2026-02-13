import { CITY_COORDS } from '../utils/gridConvert'
import { loadNaverMapScript } from '../utils/loadNaverMapScript'

// 프록시 엔드포인트 (CORS 우회)
// 개발: Vite proxy → openapi.naver.com
// 배포: Netlify Function → openapi.naver.com
const SEARCH_PROXY_ENDPOINT = '/api/naver-search'

const SCHOOL_KEYWORDS = {
  elementary: '초등학교',
  middle: '중학교',
  high: '고등학교',
}

const SCHOOL_FALLBACK_OFFSETS = [
  { lat: 0.0042, lon: 0.0017 },
  { lat: -0.0038, lon: 0.0022 },
  { lat: 0.0029, lon: -0.0031 },
  { lat: -0.0026, lon: -0.0024 },
  { lat: 0.0051, lon: -0.0014 },
  { lat: -0.0047, lon: 0.0011 },
  { lat: 0.0019, lon: 0.0048 },
  { lat: -0.0017, lon: -0.0049 },
  { lat: 0.0036, lon: 0.0034 },
  { lat: -0.0033, lon: -0.0038 },
  { lat: 0.0049, lon: -0.0041 },
  { lat: -0.005, lon: 0.0035 },
]

const SCHOOL_QUERY_PATTERN = /(학교|초등|중학교|고등|초$|중$|고$)/
const BROAD_ADDRESS_PATTERN = /(시|군|구|읍|면|동|리)$/
const SCHOOL_ENTITY_PATTERN = /(학교|초등학교|중학교|고등학교)/

function stripHtml(text = '') {
  return String(text).replace(/<[^>]*>/g, '').trim()
}

function parseNaverItem(item) {
  const mapx = Number(item.mapx)
  const mapy = Number(item.mapy)

  const lon = Number.isFinite(mapx) ? mapx / 1e7 : null
  const lat = Number.isFinite(mapy) ? mapy / 1e7 : null

  return {
    name: stripHtml(item.title),
    address: item.address || item.roadAddress || '',
    roadAddress: item.roadAddress || item.address || '',
    category: item.category || '',
    lat,
    lon,
  }
}

function parseNaverGeocodeItem(item, fallbackName = '') {
  const roadAddress = stripHtml(item.roadAddress || '')
  const jibunAddress = stripHtml(item.jibunAddress || '')
  const lat = Number(item.y)
  const lon = Number(item.x)

  return {
    name: roadAddress || jibunAddress || fallbackName,
    address: jibunAddress || roadAddress || '',
    roadAddress: roadAddress || jibunAddress || '',
    category: '지도 검색',
    lat,
    lon,
  }
}

function isSchoolLikeQuery(query = '') {
  const compact = String(query || '').replace(/\s+/g, '')
  return SCHOOL_QUERY_PATTERN.test(compact)
}

function normalizeSearchText(text = '') {
  return String(text || '').toLowerCase().replace(/\s+/g, '')
}

function extractAreaPrefixes({ hintAddress = '', hintLat, hintLon } = {}) {
  const prefixes = []
  const seen = new Set()

  const push = (value) => {
    const normalized = String(value || '').trim()
    if (!normalized || seen.has(normalized)) {
      return
    }
    seen.add(normalized)
    prefixes.push(normalized)
  }

  const tokens = String(hintAddress || '')
    .replace(/[,_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)

  if (tokens.length >= 1) {
    push(tokens[0])
  }
  if (tokens.length >= 2) {
    push(`${tokens[0]} ${tokens[1]}`)
  }
  if (tokens.length >= 3) {
    push(`${tokens[0]} ${tokens[1]} ${tokens[2]}`)
  }

  if (Number.isFinite(hintLat) && Number.isFinite(hintLon)) {
    push(findNearestCityName(hintLat, hintLon))
  }

  return prefixes.slice(0, 4)
}

function expandSchoolSuffix(compact) {
  if (/초$/.test(compact) && !compact.includes('초등학교')) {
    return compact.replace(/초$/, '초등학교')
  }
  if (/중$/.test(compact) && !compact.includes('중학교')) {
    return compact.replace(/중$/, '중학교')
  }
  if (/고$/.test(compact) && !compact.includes('고등학교')) {
    return compact.replace(/고$/, '고등학교')
  }
  if (compact.includes('초등') && !compact.includes('초등학교')) {
    return compact.replace('초등', '초등학교')
  }
  return null
}

function buildGeocodeQueries(query = '', options = {}) {
  const { hintLat, hintLon, hintAddress = '' } = options
  const trimmed = String(query || '').trim()
  const compact = trimmed.replace(/\s+/g, '')
  const variants = []
  const seen = new Set()

  const pushVariant = (value) => {
    const normalized = String(value || '').trim()
    if (!normalized || seen.has(normalized)) {
      return
    }
    seen.add(normalized)
    variants.push(normalized)
  }

  pushVariant(trimmed)
  pushVariant(compact)

  // 학교 약어 확장 (동서초 → 동서초등학교)
  const expanded = expandSchoolSuffix(compact)
  if (expanded) {
    pushVariant(expanded)
  }

  // 지역 힌트 접두사
  const areaPrefixes = extractAreaPrefixes({ hintAddress, hintLat, hintLon })
  const baseVariants = [...variants]

  areaPrefixes.forEach((prefix) => {
    baseVariants.forEach((value) => {
      pushVariant(`${prefix} ${value}`)
    })
  })

  return variants.slice(0, 12)
}

function isBroadAreaResult(item) {
  const address = String(item?.roadAddress || item?.address || '').trim()
  const name = String(item?.name || '').trim()
  const target = address || name
  if (!target) {
    return true
  }

  if (/\d/.test(target)) {
    return false
  }

  if (/(학교|측정소|센터|역|터미널|공원|병원|아파트)/.test(target)) {
    return false
  }

  const tokens = target.split(/\s+/).filter(Boolean)
  const lastToken = tokens[tokens.length - 1] || target
  return BROAD_ADDRESS_PATTERN.test(lastToken)
}

function scoreSearchResult(item, query) {
  const queryCompact = normalizeSearchText(query)
  const tokens = String(query || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => normalizeSearchText(token))
    .filter(Boolean)

  const name = normalizeSearchText(item?.name)
  const roadAddress = normalizeSearchText(item?.roadAddress)
  const address = normalizeSearchText(item?.address)
  const merged = `${name} ${roadAddress} ${address}`

  let score = 0
  if (queryCompact && merged.includes(queryCompact)) {
    score += 90
  }
  if (queryCompact && name.includes(queryCompact)) {
    score += 60
  }

  tokens.forEach((token, index) => {
    if (name.includes(token)) {
      score += index < 2 ? 25 : 14
    }
    if (roadAddress.includes(token) || address.includes(token)) {
      score += index < 2 ? 18 : 10
    }
  })

  if (SCHOOL_ENTITY_PATTERN.test(`${item?.name || ''} ${item?.roadAddress || ''} ${item?.address || ''}`)) {
    score += 20
  }

  if (/\d/.test(`${item?.roadAddress || ''} ${item?.address || ''}`)) {
    score += 8
  }

  if (isBroadAreaResult(item)) {
    score -= 120
  }

  return score
}

function rankSearchResults(items, query) {
  return [...items].sort((a, b) => scoreSearchResult(b, query) - scoreSearchResult(a, query))
}

async function waitForReverseGeocode(maxRetry = 30, intervalMs = 100) {
  if (window.naver?.maps?.Service?.reverseGeocode) {
    return true
  }

  await new Promise((resolve) => {
    let count = 0
    const timer = setInterval(() => {
      count += 1
      if (window.naver?.maps?.Service?.reverseGeocode || count >= maxRetry) {
        clearInterval(timer)
        resolve()
      }
    }, intervalMs)
  })

  return Boolean(window.naver?.maps?.Service?.reverseGeocode)
}

/**
 * 좌표 -> 주소 reverse geocode
 * 지도 SDK 로딩 실패 시 null 반환 (호출 측 fallback 유도)
 */
export async function reverseGeocodeLatLon(lat, lon) {
  if (typeof window === 'undefined') {
    return null
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null
  }

  try {
    await loadNaverMapScript()
    const ready = await waitForReverseGeocode()
    if (!ready) {
      return null
    }

    return await new Promise((resolve) => {
      window.naver.maps.Service.reverseGeocode(
        { coords: new window.naver.maps.LatLng(lat, lon) },
        (status, response) => {
          if (status !== window.naver.maps.Service.Status.OK) {
            resolve(null)
            return
          }

          const addr = response.v2?.address
          if (addr?.roadAddress || addr?.jibunAddress) {
            resolve(addr.roadAddress || addr.jibunAddress)
            return
          }

          const region = response.v2?.results?.[0]?.region
          if (region) {
            const parts = [
              region.area1?.name,
              region.area2?.name,
              region.area3?.name,
              region.area4?.name,
            ].filter(Boolean)
            resolve(parts.length ? parts.join(' ') : null)
            return
          }

          resolve(null)
        }
      )
    })
  } catch (error) {
    console.warn('reverseGeocodeLatLon 실패:', error)
    return null
  }
}

/**
 * 네이버 지도 SDK geocoder로 검색 (클라이언트 사이드)
 * 주소 기반 검색이므로 장소명은 잘 안 될 수 있음
 */
async function geocodeByMapService(query, options = {}) {
  const { excludeBroad = false, hintLat, hintLon, hintAddress = '' } = options
  if (typeof window === 'undefined') {
    return []
  }

  try {
    await loadNaverMapScript()
  } catch (error) {
    return []
  }

  const naver = window.naver
  if (!naver?.maps?.Service?.geocode) {
    return []
  }

  const queries = buildGeocodeQueries(query, { hintLat, hintLon, hintAddress })
  const merged = []
  const dedupe = new Set()

  // 좌표 힌트 (근처 결과 우선)
  const hasCoordHint = Number.isFinite(hintLon) && Number.isFinite(hintLat)
  const coordinateStr = hasCoordHint ? `${hintLon},${hintLat}` : undefined

  for (const q of queries) {
    const rows = await Promise.race([
      new Promise((resolve) => {
        try {
          const opts = { query: q }
          if (coordinateStr) {
            opts.coordinate = coordinateStr
          }
          naver.maps.Service.geocode(opts, (status, response) => {
            if (status !== naver.maps.Service.Status.OK) {
              resolve([])
              return
            }

            const parsed = (response?.v2?.addresses || [])
              .map((addr) => parseNaverGeocodeItem(addr, q))
              .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lon))

            resolve(parsed)
          })
        } catch (e) {
          resolve([])
        }
      }),
      // 타임아웃: geocoder 내부 에러로 콜백이 안 오는 경우 대비
      new Promise((resolve) => setTimeout(() => resolve([]), 4000)),
    ])

    rows.forEach((item) => {
      const key = `${item.lat.toFixed(6)}:${item.lon.toFixed(6)}:${item.address}`
      if (dedupe.has(key)) {
        return
      }
      dedupe.add(key)
      merged.push(item)
    })

    if (merged.length >= 10) {
      break
    }
  }

  if (!merged.length) {
    return []
  }

  const ranked = rankSearchResults(merged, query)
  const strictMode = excludeBroad || isSchoolLikeQuery(query)
  if (!strictMode) {
    return ranked.slice(0, 10)
  }

  const filtered = ranked.filter((item) => !isBroadAreaResult(item))
  if (filtered.length > 0) {
    return filtered.slice(0, 10)
  }

  // strict 모드에서도 결과가 없으면 전체 결과 반환
  return ranked.slice(0, 10)
}

function buildFallbackResults(query) {
  const normalized = String(query || '').toLowerCase().trim()

  const cityMatches = Object.entries(CITY_COORDS)
    .filter(([name]) => name.toLowerCase().includes(normalized))
    .slice(0, 8)
    .map(([name, coords]) => ({
      name: `${name} 중심`,
      address: name,
      roadAddress: name,
      category: '지역',
      lat: coords.lat,
      lon: coords.lon,
    }))

  if (cityMatches.length > 0) {
    return cityMatches
  }

  if (!normalized) {
    return []
  }

  return Object.entries(CITY_COORDS)
    .slice(0, 6)
    .map(([name, coords]) => ({
      name: `${name} ${query}`,
      address: name,
      roadAddress: name,
      category: '검색 추천',
      lat: coords.lat,
      lon: coords.lon,
    }))
}

function findNearestCityName(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return Object.keys(CITY_COORDS)[0] || '대전'
  }

  let nearestCity = null
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

  return nearestCity || '대전'
}

function getCenterCoords(lat, lon, cityName) {
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    return { lat, lon }
  }

  return CITY_COORDS[cityName] || CITY_COORDS.대전 || { lat: 36.3504, lon: 127.3845 }
}

function buildSchoolFallbackResults({ lat, lon, schoolLevel, limit = 12, cityName }) {
  const schoolKeyword = SCHOOL_KEYWORDS[schoolLevel] || SCHOOL_KEYWORDS.elementary
  const nearestCityName = cityName || findNearestCityName(lat, lon)
  const center = getCenterCoords(lat, lon, nearestCityName)

  return SCHOOL_FALLBACK_OFFSETS
    .slice(0, Math.max(1, Math.min(limit, SCHOOL_FALLBACK_OFFSETS.length)))
    .map((offset, index) => ({
      name: `${nearestCityName} ${index + 1}${schoolKeyword}`,
      address: nearestCityName,
      roadAddress: nearestCityName,
      category: '학교',
      lat: center.lat + offset.lat,
      lon: center.lon + offset.lon,
    }))
}

/**
 * 프록시를 통한 네이버 지역 검색 API 호출
 * CORS 문제 없음 (같은 오리진 요청)
 */
async function requestNaverLocalSearch(query, display = 10, sort = 'comment') {
  const params = new URLSearchParams({
    query,
    display: String(display),
    start: '1',
    sort,
  })

  const response = await fetch(`${SEARCH_PROXY_ENDPOINT}?${params.toString()}`)

  if (!response.ok) {
    throw new Error(`Search proxy failed: ${response.status}`)
  }

  const data = await response.json()

  // 프록시에서 에러 반환 시 (인증 실패 등)
  if (data._proxyError) {
    console.warn('Naver search proxy:', data._proxyError)
    return []
  }

  return (data.items || [])
    .map(parseNaverItem)
    .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lon))
}

/**
 * 장소 검색 (학교, 건물, 지역 등)
 *
 * 검색 순서:
 * 1. 네이버 지역검색 API (프록시 경유) - 장소명 검색에 최적
 * 2. 네이버 지도 geocoder - 주소 검색에 최적
 * 3. 도시 좌표 기반 fallback
 */
export async function searchPlace(query, options = {}) {
  const {
    enableFallback = true,
    excludeBroad = false,
    hintLat,
    hintLon,
    hintAddress = '',
  } = options
  const trimmed = String(query || '').trim()
  if (!trimmed) {
    return []
  }

  // 1단계: 네이버 지역검색 API (프록시 경유)
  try {
    const localResults = await requestNaverLocalSearch(trimmed, 10, 'random')
    if (localResults.length > 0) {
      const ranked = rankSearchResults(localResults, trimmed)
      const filtered = excludeBroad
        ? ranked.filter((item) => !isBroadAreaResult(item))
        : ranked
      if (filtered.length > 0) {
        return filtered.slice(0, 10)
      }
      if (ranked.length > 0) {
        return ranked.slice(0, 10)
      }
    }
  } catch (error) {
    console.warn('Local search via proxy failed, trying geocoder:', error.message)
  }

  // 2단계: 네이버 지도 geocoder (주소 기반)
  const mapResults = await geocodeByMapService(trimmed, {
    excludeBroad,
    hintLat,
    hintLon,
    hintAddress,
  })
  if (mapResults.length > 0) {
    return mapResults
  }

  // 3단계: 도시 좌표 기반 fallback
  return enableFallback && !excludeBroad ? buildFallbackResults(trimmed) : []
}

/**
 * 지도 중심 기준 학교급 검색
 */
export async function searchSchoolsByType({
  lat,
  lon,
  schoolLevel = 'elementary',
  limit = 12,
} = {}) {
  const normalizedLevel = SCHOOL_KEYWORDS[schoolLevel] ? schoolLevel : 'elementary'
  const schoolKeyword = SCHOOL_KEYWORDS[normalizedLevel]
  const nearestCity = findNearestCityName(lat, lon)
  const query = `${nearestCity} ${schoolKeyword}`

  try {
    const parsed = await requestNaverLocalSearch(query, Math.max(5, Math.min(limit, 20)), 'random')
    const schoolsOnly = parsed.filter((item) => {
      const merged = `${item.name} ${item.category}`
      return merged.includes('학교')
    })

    const source = schoolsOnly.length > 0 ? schoolsOnly : parsed
    const seen = new Set()
    const deduped = []

    source.forEach((item) => {
      if (deduped.length >= limit) {
        return
      }

      const key = `${item.name}-${item.lat.toFixed(5)}-${item.lon.toFixed(5)}`
      if (seen.has(key)) {
        return
      }
      seen.add(key)
      deduped.push(item)
    })

    if (deduped.length > 0) {
      return deduped
    }
  } catch (error) {
    console.warn('School search via proxy failed:', error.message)
  }

  return buildSchoolFallbackResults({
    lat,
    lon,
    schoolLevel: normalizedLevel,
    limit,
    cityName: nearestCity,
  })
}
