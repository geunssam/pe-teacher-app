import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchHourlyForecast, fetchAirQualityData } from '../../services/weatherApi'
import { PTY_CODE } from '../../data/mockWeather'

/**
 * 홈 탭의 시간별 날씨 요약
 * 핵심 정보: 기온, 비, 미세먼지, 초미세먼지
 */
export default function HourlyWeatherSummary() {
  const [hourlyData, setHourlyData] = useState([])
  const [airData, setAirData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHourlyData()

    // 1시간마다 자동 갱신
    const interval = setInterval(() => {
      loadHourlyData()
    }, 60 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  const loadHourlyData = async () => {
    try {
      const forecast = await fetchHourlyForecast()
      const air = await fetchAirQualityData('대전')

      setHourlyData(forecast.slice(0, 4)) // 4개 시간대만 (3시간 간격 = 12시간)
      setAirData(air)
      setLoading(false)
    } catch (error) {
      console.error('시간별 날씨 로드 실패:', error)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-md">
          <h2 className="text-card-title">🌤️ 시간별 날씨</h2>
          <Link to="/weather" className="btn btn-sm btn-ghost">
            상세보기 →
          </Link>
        </div>
        <div className="text-body text-muted">날씨 정보 로딩 중...</div>
      </div>
    )
  }

  if (!hourlyData || hourlyData.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-md">
          <h2 className="text-card-title">🌤️ 시간별 날씨</h2>
          <Link to="/weather" className="btn btn-sm btn-ghost">
            상세보기 →
          </Link>
        </div>
        <div className="text-body text-muted">날씨 정보를 불러올 수 없습니다</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-md">
        <h2 className="text-card-title">🌤️ 시간별 날씨</h2>
        <Link to="/weather" className="btn btn-sm btn-ghost">
          상세보기 →
        </Link>
      </div>

      {/* 대기질 현황 (상단 고정) */}
      {airData && (
        <div className="mb-md p-md bg-white/40 rounded-lg border border-white/60">
          <div className="grid grid-cols-2 gap-md text-center">
            <div>
              <div className="text-caption text-muted mb-xs">미세먼지</div>
              <div
                className="text-body-bold"
                style={{
                  color:
                    airData.pm10Grade === 1
                      ? '#7CE0A3'
                      : airData.pm10Grade === 2
                      ? '#F5E07C'
                      : '#F57C7C',
                }}
              >
                {airData.pm10Value}㎍/㎥
              </div>
            </div>
            <div>
              <div className="text-caption text-muted mb-xs">초미세먼지</div>
              <div
                className="text-body-bold"
                style={{
                  color:
                    airData.pm25Grade === 1
                      ? '#7CE0A3'
                      : airData.pm25Grade === 2
                      ? '#F5E07C'
                      : '#F57C7C',
                }}
              >
                {airData.pm25Value}㎍/㎥
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 시간별 예보 (가로 스크롤) */}
      <div className="overflow-x-auto -mx-md px-md">
        <div className="flex gap-sm min-w-max pb-xs">
          {hourlyData.map((hour, index) => {
            const timeStr = hour.time.slice(0, 2) + '시'
            const ptyInfo = PTY_CODE[hour.pty] || PTY_CODE[0]
            const hasRain = hour.pty > 0

            return (
              <div
                key={index}
                className="bg-white/40 rounded-lg p-md border border-white/60 flex-shrink-0 w-28"
              >
                {/* 시간 */}
                <div className="text-caption font-semibold text-text text-center mb-xs">
                  {timeStr}
                </div>

                {/* 기온 */}
                <div className="text-2xl font-black text-text text-center mb-xs">
                  {Math.round(hour.temp)}°
                </div>

                {/* 강수 정보 */}
                {hasRain ? (
                  <div className="text-center mb-xs">
                    <div className="text-xl">{ptyInfo.emoji}</div>
                    <div className="text-caption text-primary font-semibold">
                      {hour.pop}%
                    </div>
                  </div>
                ) : (
                  <div className="text-center mb-xs">
                    <div className="text-caption text-muted">강수 {hour.pop}%</div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
