import { SKY_CODE, PTY_CODE } from '../../data/mockWeather'

/**
 * 현재 날씨 상세 - 대형 표시
 */
export default function WeatherDetail({ weather }) {
  if (!weather) return null

  const skyInfo = SKY_CODE[weather.sky] || SKY_CODE[1]
  const ptyInfo = PTY_CODE[weather.pty] || PTY_CODE[0]

  // 강수가 있으면 강수 정보 우선 표시
  const displayEmoji = weather.pty !== 0 ? ptyInfo.emoji : skyInfo.emoji
  const displayText = weather.pty !== 0 ? ptyInfo.text : skyInfo.text
  const displayColor = weather.pty !== 0 ? ptyInfo.color : skyInfo.color

  return (
    <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-xl border border-white/80 shadow-glass-strong">
      {/* 대형 이모지 + 상태 */}
      <div className="text-center mb-lg">
        <div className="text-7xl mb-sm">{displayEmoji}</div>
        <div
          className="text-card-title font-bold"
          style={{ color: displayColor }}
        >
          {displayText}
        </div>
      </div>

      {/* 기온 */}
      <div className="text-center mb-lg">
        <div className="text-6xl font-black text-text mb-xs">
          {weather.t1h}°
        </div>
        <div className="text-caption text-muted">현재 기온</div>
      </div>

      {/* 상세 정보 그리드 */}
      <div className="grid grid-cols-2 gap-md">
        <div className="bg-white/40 rounded-xl p-md text-center">
          <div className="text-caption text-muted mb-xs">강수확률</div>
          <div className="text-body-lg font-bold text-text">{weather.pop}%</div>
        </div>

        <div className="bg-white/40 rounded-xl p-md text-center">
          <div className="text-caption text-muted mb-xs">습도</div>
          <div className="text-body-lg font-bold text-text">{weather.reh}%</div>
        </div>

        {weather.pty !== 0 && weather.rn1 > 0 && (
          <div className="bg-white/40 rounded-xl p-md text-center col-span-2">
            <div className="text-caption text-muted mb-xs">1시간 강수량</div>
            <div className="text-body-lg font-bold text-text">{weather.rn1}mm</div>
          </div>
        )}

        <div className="bg-white/40 rounded-xl p-md text-center col-span-2">
          <div className="text-caption text-muted mb-xs">풍속</div>
          <div className="text-body-lg font-bold text-text">{weather.wsd} m/s</div>
        </div>
      </div>

      {/* 업데이트 시간 */}
      <div className="text-caption text-textMuted text-center mt-md">
        업데이트: {weather.baseTime.slice(0, 2)}시 {weather.baseTime.slice(2, 4)}분
      </div>
    </div>
  )
}
