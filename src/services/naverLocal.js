import { CITY_COORDS } from '../utils/gridConvert'

const NAVER_CLIENT_ID = import.meta.env.VITE_NAVER_CLIENT_ID
const NAVER_CLIENT_SECRET = import.meta.env.VITE_NAVER_CLIENT_SECRET

const NAVER_LOCAL_SEARCH_ENDPOINT = 'https://openapi.naver.com/v1/search/local.json'

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

function hasNaverCredentials() {
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    return false
  }

  if (NAVER_CLIENT_ID.includes('YOUR_') || NAVER_CLIENT_SECRET.includes('YOUR_')) {
    return false
  }

  return true
}

/**
 * 학교/장소 검색
 * - 우선 Naver Local API 시도
 * - 키가 없거나 API 실패 시, 도시 좌표 기반 fallback
 */
export async function searchPlace(query) {
  const trimmed = String(query || '').trim()
  if (!trimmed) {
    return []
  }

  if (!hasNaverCredentials()) {
    return buildFallbackResults(trimmed)
  }

  try {
    const params = new URLSearchParams({
      query: trimmed,
      display: '10',
      start: '1',
      sort: 'random',
    })

    const response = await fetch(`${NAVER_LOCAL_SEARCH_ENDPOINT}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'X-Naver-Client-Id': NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
      },
    })

    if (!response.ok) {
      throw new Error(`Naver API failed: ${response.status}`)
    }

    const data = await response.json()
    const parsed = (data.items || [])
      .map(parseNaverItem)
      .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lon))

    if (parsed.length > 0) {
      return parsed
    }

    return buildFallbackResults(trimmed)
  } catch (error) {
    console.error('Naver local search failed. fallback enabled:', error)
    return buildFallbackResults(trimmed)
  }
}
