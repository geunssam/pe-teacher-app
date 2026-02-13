import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import WeatherDetail from '../components/weather/WeatherDetail'
import AirQuality from '../components/weather/AirQuality'
import HourlyForecast from '../components/weather/HourlyForecast'
import OutdoorJudge from '../components/weather/OutdoorJudge'
import { fetchWeatherData, fetchAirQualityData, fetchHourlyForecast } from '../services/weatherApi'
import { judgeOutdoorClass } from '../data/mockWeather'
import { useSettings } from '../hooks/useSettings'
import toast from 'react-hot-toast'

/**
 * 날씨 탭 메인 페이지
 * Mock 데이터로 프로토타입 구현
 * Phase 2에서 실제 API 연동 예정
 */
export default function WeatherPage() {
  const { location } = useSettings()
  const [weather, setWeather] = useState(null)
  const [air, setAir] = useState(null)
  const [hourly, setHourly] = useState([])
  const [judgment, setJudgment] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadWeatherData = useCallback(async (silent = false) => {
    setLoading(true)

    try {
      // 실제 API 호출 (저장된 위치 사용)
      const weatherData = await fetchWeatherData(location)
      const airData = await fetchAirQualityData(location.stationName)
      const hourlyResult = await fetchHourlyForecast(location)
      const hourlyData = Array.isArray(hourlyResult)
        ? hourlyResult
        : hourlyResult?.forecast || []
      const normalizedHourly = hourlyData.map((item) => ({
        ...item,
        time: `${String(item.time).slice(0, 2)}시`,
      }))
      const judgmentData = judgeOutdoorClass(weatherData, airData)

      setWeather(weatherData)
      setAir(airData)
      setHourly(normalizedHourly)
      setJudgment(judgmentData)
      if (!silent) {
        toast.success('날씨 정보를 업데이트했습니다')
      }
    } catch (error) {
      console.error('날씨 데이터 로드 실패:', error)
      if (!silent) {
        toast.error('날씨 정보를 불러오는데 실패했습니다')
      }
    } finally {
      setLoading(false)
    }
  }, [location.lat, location.lon, location.stationName])

  useEffect(() => {
    loadWeatherData(true)

    // 1시간마다 자동 갱신 (실제 API 연동 시에도 유용)
    const interval = setInterval(() => {
      loadWeatherData(true)
    }, 60 * 60 * 1000)

    return () => clearInterval(interval)
  }, [loadWeatherData])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl mb-md">🌤️</div>
          <div className="text-body text-muted">날씨 정보를 불러오는 중...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-md py-lg max-w-2xl">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-lg">
        <h1 className="text-page-title">🌤️ 날씨</h1>
        <button
          onClick={() => loadWeatherData(false)}
          className="p-2 bg-white/60 hover:bg-white/80 rounded-lg transition-all border border-white/80"
          title="새로고침"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
        </button>
      </div>

      {/* 위치 정보 안내 */}
      <div className="mb-lg p-md bg-success/10 rounded-xl border border-success/30">
        <div className="flex items-start gap-2">
          <span className="text-xl">✅</span>
          <div className="flex-1">
            <div className="text-body font-semibold text-success mb-xs">
              {location.name || '실시간 날씨 정보'}
            </div>
            <div className="text-caption text-text">
              📍 {location.address || '대전 지역'} 날씨를 제공합니다.
              {!location.address && (
                <>
                  <br />
                  <Link to="/settings" className="text-primary underline">
                    ⚙️ 설정에서 학교 위치를 등록하세요
                  </Link>
                </>
              )}
            </div>
            <div className="mt-sm">
              <Link
                to="/settings"
                className="inline-flex items-center gap-1 py-1 px-2 bg-primary/10 text-primary rounded-lg border border-primary/30 text-caption font-semibold hover:bg-primary/20 transition-all"
              >
                🗺️ 지도에서 위치 설정
              </Link>
            </div>
            {location.address && (
              <div className="text-caption text-text-muted mt-xs">
                🌫️ 대기질 측정소: {location.stationName}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 컨텐츠 */}
      <div className="space-y-lg">
        {/* 현재 날씨 */}
        <WeatherDetail weather={weather} />

        {/* 야외수업 판단 */}
        <OutdoorJudge judgment={judgment} />

        {/* 대기질 정보 */}
        <AirQuality air={air} />

        {/* 시간별 예보 */}
        <HourlyForecast forecast={hourly} />
      </div>
    </div>
  )
}
