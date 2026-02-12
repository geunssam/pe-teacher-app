import { latLonToGrid, DEFAULT_LOCATION } from '../utils/gridConvert'

const API_KEY = import.meta.env.VITE_PUBLIC_DATA_API_KEY
const WEATHER_ENDPOINT = import.meta.env.VITE_WEATHER_API_ENDPOINT
const AIR_ENDPOINT = import.meta.env.VITE_AIR_API_ENDPOINT

/**
 * 기상청 단기예보 API 호출
 * 초단기실황 조회 (getUltraSrtNcst)
 */
export async function fetchWeatherData(location = DEFAULT_LOCATION) {
  try {
    const { nx, ny } = latLonToGrid(location.lat, location.lon)
    
    // 현재 시간 기준으로 base_date, base_time 생성
    const now = new Date()
    const baseDate = formatDate(now)
    const baseTime = getBaseTime(now)

    const params = new URLSearchParams({
      serviceKey: API_KEY,
      pageNo: '1',
      numOfRows: '100',
      dataType: 'JSON',
      base_date: baseDate,
      base_time: baseTime,
      nx: nx.toString(),
      ny: ny.toString(),
    })

    const url = `${WEATHER_ENDPOINT}/getUltraSrtNcst?${params}`
    
    const response = await fetch(url)
    const data = await response.json()

    if (data.response?.header?.resultCode !== '00') {
      throw new Error(data.response?.header?.resultMsg || 'API 호출 실패')
    }

    const items = data.response?.body?.items?.item || []
    
    // 데이터 파싱
    const weatherData = {
      baseDate,
      baseTime,
      t1h: getItemValue(items, 'T1H') || 20, // 기온
      rn1: getItemValue(items, 'RN1') || 0, // 1시간 강수량
      reh: getItemValue(items, 'REH') || 50, // 습도
      pty: getItemValue(items, 'PTY') || 0, // 강수형태
      sky: 1, // 초단기실황에는 없으므로 기본값
      pop: 10, // 강수확률도 단기예보에서만 제공
      wsd: getItemValue(items, 'WSD') || 2.5, // 풍속
    }

    return weatherData
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

    // 현재 시간 기준으로 base_date, base_time 생성
    const now = new Date()
    const baseDate = formatDate(now)
    const baseTime = getForecastBaseTime(now)

    const params = new URLSearchParams({
      serviceKey: API_KEY,
      pageNo: '1',
      numOfRows: '300', // 시간당 12개 항목 * 24시간
      dataType: 'JSON',
      base_date: baseDate,
      base_time: baseTime,
      nx: nx.toString(),
      ny: ny.toString(),
    })

    const url = `${WEATHER_ENDPOINT}/getVilageFcst?${params}`

    const response = await fetch(url)
    const data = await response.json()

    if (data.response?.header?.resultCode !== '00') {
      throw new Error(data.response?.header?.resultMsg || 'API 호출 실패')
    }

    const items = data.response?.body?.items?.item || []

    // 시간별로 그룹핑
    const hourlyData = groupByTime(items)

    return hourlyData
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

// 기준시각 계산 (매시간 30분에 발표, 10분 딜레이)
function getBaseTime(date) {
  const hours = date.getHours()
  const minutes = date.getMinutes()
  
  // 현재 시각이 40분 이전이면 이전 시각 사용
  let baseHour = minutes < 40 ? hours - 1 : hours
  if (baseHour < 0) baseHour = 23
  
  return String(baseHour).padStart(2, '0') + '00'
}

// 아이템에서 값 추출
function getItemValue(items, category) {
  const item = items.find((i) => i.category === category)
  if (!item) return null

  const value = parseFloat(item.obsrValue)
  return isNaN(value) ? null : value
}

// 단기예보 기준시각 계산 (02, 05, 08, 11, 14, 17, 20, 23시 발표)
function getForecastBaseTime(date) {
  const hours = date.getHours()

  // 가장 최근 발표 시각 찾기
  const baseTimes = [2, 5, 8, 11, 14, 17, 20, 23]
  let baseHour = 23 // 기본값

  for (let i = baseTimes.length - 1; i >= 0; i--) {
    if (hours >= baseTimes[i]) {
      baseHour = baseTimes[i]
      break
    }
  }

  return String(baseHour).padStart(2, '0') + '00'
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
    .filter((item) => item.temp !== null)
    .slice(0, 12)
    .filter((_, index) => index % 3 === 0) // 3시간 간격
}

/**
 * 좌표 기반 가장 가까운 측정소 찾기
 * 에어코리아 근접측정소 목록 조회
 */
export async function findNearestStation(lat, lon) {
  try {
    // WGS84 → TM 좌표 변환 (간단한 근사)
    const tmX = Math.round((lon - 125) * 200000 + 200000)
    const tmY = Math.round((lat - 38) * 200000 + 500000)

    const params = new URLSearchParams({
      serviceKey: API_KEY,
      returnType: 'json',
      tmX: tmX.toString(),
      tmY: tmY.toString(),
      ver: '1.0',
    })

    const url = `${AIR_ENDPOINT}/getNearbyMsrstnList?${params}`

    const response = await fetch(url)
    const data = await response.json()

    if (data.response?.header?.resultCode !== '00') {
      throw new Error(data.response?.header?.resultMsg || 'API 호출 실패')
    }

    const items = data.response?.body?.items || []

    if (items.length === 0) {
      // Fallback: 기본 측정소 반환
      return { stationName: '대전', distance: null }
    }

    // 가장 가까운 측정소 (첫 번째)
    const nearest = items[0]
    return {
      stationName: nearest.stationName,
      distance: parseFloat(nearest.tm) / 1000, // m → km
    }
  } catch (error) {
    console.error('측정소 조회 오류:', error)
    // 에러 시 기본 측정소 반환
    return { stationName: '대전', distance: null }
  }
}
