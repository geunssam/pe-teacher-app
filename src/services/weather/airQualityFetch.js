// 에어코리아 API — 대기오염(미세먼지/초미세먼지) 데이터 fetch | 사용처→WeatherPage, 측정소→stationSearch.js, API키→.env.local
const API_KEY = import.meta.env.VITE_PUBLIC_DATA_API_KEY
const AIR_ENDPOINT = import.meta.env.VITE_AIR_API_ENDPOINT

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

    return airData
  } catch (error) {
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
