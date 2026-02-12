import { useState, useEffect } from 'react'
import WeatherDetail from '../components/weather/WeatherDetail'
import AirQuality from '../components/weather/AirQuality'
import HourlyForecast from '../components/weather/HourlyForecast'
import OutdoorJudge from '../components/weather/OutdoorJudge'
import {
  getCurrentWeather,
  getAirQuality,
  getHourlyForecast,
  judgeOutdoorClass
} from '../data/mockWeather'

/**
 * 날씨 탭 메인 페이지
 * Mock 데이터로 프로토타입 구현
 * Phase 2에서 실제 API 연동 예정
 */
export default function WeatherPage() {
  const [weather, setWeather] = useState(null)
  const [air, setAir] = useState(null)
  const [hourly, setHourly] = useState([])
  const [judgment, setJudgment] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWeatherData()

    // 1시간마다 자동 갱신 (실제 API 연동 시에도 유용)
    const interval = setInterval(() => {
      loadWeatherData()
    }, 60 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  const loadWeatherData = () => {
    setLoading(true)

    // Mock 데이터 로드 (실제로는 API 호출)
    setTimeout(() => {
      const weatherData = getCurrentWeather()
      const airData = getAirQuality()
      const hourlyData = getHourlyForecast()
      const judgmentData = judgeOutdoorClass(weatherData, airData)

      setWeather(weatherData)
      setAir(airData)
      setHourly(hourlyData)
      setJudgment(judgmentData)
      setLoading(false)
    }, 500)
  }

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
          onClick={loadWeatherData}
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

      {/* Mock 데이터 안내 */}
      <div className="mb-lg p-md bg-primary/10 rounded-xl border border-primary/30">
        <div className="flex items-start gap-2">
          <span className="text-xl">💡</span>
          <div className="flex-1">
            <div className="text-body font-semibold text-primary mb-xs">
              프로토타입 Mock 데이터
            </div>
            <div className="text-caption text-text">
              현재는 Mock 데이터로 동작합니다. Phase 2에서 기상청·에어코리아 API를 연동할 예정입니다.
            </div>
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
