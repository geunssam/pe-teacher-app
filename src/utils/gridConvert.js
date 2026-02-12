/**
 * 위경도 → 기상청 격자 좌표 변환
 * 
 * 기상청 API는 위경도가 아닌 격자 좌표(nx, ny)를 사용
 * LCC(Lambert Conformal Conic) 투영법 기반
 */

const RE = 6371.00877 // 지구 반경(km)
const GRID = 5.0 // 격자 간격(km)
const SLAT1 = 30.0 // 투영 위도1(degree)
const SLAT2 = 60.0 // 투영 위도2(degree)
const OLON = 126.0 // 기준점 경도(degree)
const OLAT = 38.0 // 기준점 위도(degree)
const XO = 43 // 기준점 X좌표(GRID)
const YO = 136 // 기준점 Y좌표(GRID)

const DEGRAD = Math.PI / 180.0
const RADDEG = 180.0 / Math.PI

const re = RE / GRID
const slat1 = SLAT1 * DEGRAD
const slat2 = SLAT2 * DEGRAD
const olon = OLON * DEGRAD
const olat = OLAT * DEGRAD

let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5)
sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn)
let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5)
sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn
let ro = Math.tan(Math.PI * 0.25 + olat * 0.5)
ro = (re * sf) / Math.pow(ro, sn)

/**
 * 위경도를 격자 좌표로 변환
 * @param {number} lat - 위도
 * @param {number} lon - 경도
 * @returns {Object} { nx, ny } - 격자 좌표
 */
export function latLonToGrid(lat, lon) {
  let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5)
  ra = (re * sf) / Math.pow(ra, sn)
  let theta = lon * DEGRAD - olon
  if (theta > Math.PI) theta -= 2.0 * Math.PI
  if (theta < -Math.PI) theta += 2.0 * Math.PI
  theta *= sn

  const nx = Math.floor(ra * Math.sin(theta) + XO + 0.5)
  const ny = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5)

  return { nx, ny }
}

/**
 * 주요 도시 좌표 (참고용)
 */
export const CITY_COORDS = {
  서울: { lat: 37.5665, lon: 126.9780 },
  부산: { lat: 35.1796, lon: 129.0756 },
  대구: { lat: 35.8714, lon: 128.6014 },
  인천: { lat: 37.4563, lon: 126.7052 },
  광주: { lat: 35.1595, lon: 126.8526 },
  대전: { lat: 36.3504, lon: 127.3845 },
  울산: { lat: 35.5384, lon: 129.3114 },
  세종: { lat: 36.4800, lon: 127.2890 },
}

// 기본값: 대전 (PRD 기준)
export const DEFAULT_LOCATION = {
  name: '대전',
  lat: 36.3504,
  lon: 127.3845,
}
