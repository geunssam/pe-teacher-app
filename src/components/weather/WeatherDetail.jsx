import { SKY_CODE, PTY_CODE, PM_GRADE } from '../../data/mockWeather'

// 기온 범위별 색상
function getTempInfo(temp) {
  if (temp <= -5) return { color: '#1D4ED8', bg: 'rgba(29, 78, 216, 0.08)' }
  if (temp <= 5)  return { color: '#0891B2', bg: 'rgba(8, 145, 178, 0.08)' }
  if (temp <= 15) return { color: '#059669', bg: 'rgba(5, 150, 105, 0.08)' }
  if (temp <= 25) return { color: '#D97706', bg: 'rgba(217, 119, 6, 0.08)' }
  if (temp <= 33) return { color: '#EA580C', bg: 'rgba(234, 88, 12, 0.08)' }
  return { color: '#DC2626', bg: 'rgba(220, 38, 38, 0.08)' }
}

// 강수확률 범위별 색상
function getPopInfo(pop) {
  if (pop <= 20) return { color: '#059669', bg: 'rgba(5, 150, 105, 0.08)' }
  if (pop <= 50) return { color: '#D97706', bg: 'rgba(217, 119, 6, 0.08)' }
  return { color: '#DC2626', bg: 'rgba(220, 38, 38, 0.08)' }
}


/** 카드 내부 공통 레이아웃 */
function InfoCard({ bg, emoji, title, value, valueColor, detail }) {
  return (
    <div
      className="rounded-xl py-3 px-2 border border-white/60 flex items-center justify-center"
      style={{ backgroundColor: bg }}
    >
      <span className="text-2xl shrink-0 mr-2">{emoji}</span>
      <div>
        <div className="text-sm font-bold text-text/70">{title}</div>
        <div className="text-base font-bold" style={{ color: valueColor }}>{value}</div>
        <div className="text-sm text-muted">{detail}</div>
      </div>
    </div>
  )
}

/**
 * 기상 종합 카드
 * 6개 항목을 3x2 그리드 배치, 모든 카드 3줄 통일
 */
export default function WeatherDetail({ weather, air, judgment }) {
  if (!weather) return null

  const skyInfo = SKY_CODE[weather.sky] || SKY_CODE[1]
  const ptyInfo = PTY_CODE[weather.pty] || PTY_CODE[0]

  const displayEmoji = weather.pty !== 0 ? ptyInfo.emoji : skyInfo.emoji
  const displayText = weather.pty !== 0 ? ptyInfo.text : skyInfo.text
  const displayColor = weather.pty !== 0 ? ptyInfo.color : skyInfo.color
  const displayBg = `${displayColor}14`

  const pm10Info = air ? (PM_GRADE[air.pm10Grade] || PM_GRADE[1]) : null
  const pm25Info = air ? (PM_GRADE[air.pm25Grade] || PM_GRADE[1]) : null
  const tempInfo = getTempInfo(weather.t1h)
  const popInfo = getPopInfo(weather.pop)

  const judgmentLabel = judgment
    ? (judgment.status === 'optimal' ? '야외 최적' : judgment.status === 'caution' ? '주의' : '실내 권장')
    : ''

  return (
    <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-xl border border-white/80 shadow-glass-strong">
      <h3 className="text-card-title mb-md">기상 종합</h3>

      <div className="grid grid-cols-3 gap-2">
        <InfoCard bg={displayBg} emoji={displayEmoji} title="날씨" value={displayText} valueColor={displayColor} detail={`습도 ${weather.reh}%`} />
        <InfoCard bg={tempInfo.bg} emoji="🌡️" title="기온" value={`${weather.t1h}°C`} valueColor={tempInfo.color} detail={`풍속 ${weather.wsd}m/s`} />
        <InfoCard bg={popInfo.bg} emoji="🌧️" title="강수확률" value={`${weather.pop}%`} valueColor={popInfo.color} detail={`강수량 ${weather.rn1 || 0}mm`} />

        {pm10Info && (
          <InfoCard bg={pm10Info.bg} emoji={pm10Info.emoji} title="미세먼지" value={pm10Info.text} valueColor={pm10Info.color} detail={`${air.pm10Value}㎍/㎥`} />
        )}
        {pm25Info && (
          <InfoCard bg={pm25Info.bg} emoji={pm25Info.emoji} title="초미세먼지" value={pm25Info.text} valueColor={pm25Info.color} detail={`${air.pm25Value}㎍/㎥`} />
        )}
        {judgment && (
          <InfoCard bg={`${judgment.color}14`} emoji={judgment.emoji} title="수업 권장" value={judgmentLabel} valueColor={judgment.color} detail={judgment.reason || '양호'} />
        )}
      </div>
    </div>
  )
}
