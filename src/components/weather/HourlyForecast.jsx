// 시간별 예보 — 24시간 시간대별 기상 예보 표시 | 부모→pages/WeatherPage.jsx, 상수→data/mockWeather.js(SKY_CODE/PTY_CODE)
import { SKY_CODE, PTY_CODE } from '../../data/mockWeather'

/**
 * 시간별 예보 (가로 스크롤)
 */
export default function HourlyForecast({ forecast }) {
  if (!forecast || forecast.length === 0) return null

  return (
    <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-xl border border-white/80 shadow-glass-strong">
      <h3 className="text-card-title mb-md">시간별 예보</h3>

      <div className="overflow-x-auto -mx-xl px-xl scrollbar-hide">
        <div className="flex gap-sm min-w-max pb-xs">
          {forecast.map((hour, index) => {
            const skyInfo = SKY_CODE[hour.sky] || SKY_CODE[1]
            const ptyInfo = PTY_CODE[hour.pty] || PTY_CODE[0]

            // 강수가 있으면 강수 정보 우선 표시
            const displayEmoji = hour.pty !== 0 ? ptyInfo.emoji : skyInfo.emoji

            return (
              <div
                key={index}
                className="bg-white/40 rounded-xl p-md border border-white/60 flex-shrink-0 w-20 text-center"
              >
                {/* 시간 */}
                <div className="text-caption font-semibold text-text mb-xs">
                  {hour.time}
                </div>

                {/* 날씨 아이콘 */}
                <div className="text-3xl mb-xs">{displayEmoji}</div>

                {/* 기온 */}
                <div className="text-body-lg font-bold text-text mb-xs">
                  {hour.temp}°
                </div>

                {/* 강수확률 */}
                <div className="text-caption text-primary">💧 {hour.pop ?? 0}%</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 스크롤 인디케이터 */}
      <div className="mt-md w-full h-1 rounded-full bg-gradient-to-r from-primary/20 via-primary/50 to-primary/20" />
    </div>
  )
}
