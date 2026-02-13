import { PM_GRADE } from '../../data/mockWeather'

const UV_INFO = {
  1: { text: '낮음', color: '#059669', bg: 'rgba(5, 150, 105, 0.08)' },
  2: { text: '보통', color: '#D97706', bg: 'rgba(217, 119, 6, 0.08)' },
  3: { text: '높음', color: '#EA580C', bg: 'rgba(234, 88, 12, 0.08)' },
  4: { text: '매우높음', color: '#DC2626', bg: 'rgba(220, 38, 38, 0.08)' },
  5: { text: '위험', color: '#991B1B', bg: 'rgba(153, 27, 27, 0.08)' },
}

function InfoCard({ bg, emoji, title, value, valueColor, detail }) {
  return (
    <div
      className="rounded-xl py-3 px-2 border border-white/60 flex items-center justify-center"
      style={{ backgroundColor: bg }}
    >
      <span className="text-2xl shrink-0 mr-2">{emoji}</span>
      <div>
        <div className="text-base text-black" style={{ fontWeight: 650 }}>{title}</div>
        <div className="text-xl" style={{ color: valueColor, fontWeight: 750 }}>{value}</div>
        <div className="text-base text-black" style={{ fontWeight: 650 }}>{detail}</div>
      </div>
    </div>
  )
}

/**
 * 대기질 정보 카드 - 3열 그리드
 */
export default function AirQuality({ air }) {
  if (!air) return null

  const pm10Info = PM_GRADE[air.pm10Grade] || PM_GRADE[1]
  const pm25Info = PM_GRADE[air.pm25Grade] || PM_GRADE[1]
  const uvInfo = UV_INFO[air.uvGrade] || UV_INFO[2]

  return (
    <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-xl border border-white/80 shadow-glass-strong">
      <h3 className="text-card-title mb-md">대기질 정보</h3>

      <div className="grid grid-cols-3 gap-2">
        <InfoCard bg={pm10Info.bg} emoji={pm10Info.emoji} title="미세먼지" value={pm10Info.text} valueColor={pm10Info.color} detail={`${air.pm10Value}㎍/㎥`} />
        <InfoCard bg={pm25Info.bg} emoji={pm25Info.emoji} title="초미세먼지" value={pm25Info.text} valueColor={pm25Info.color} detail={`${air.pm25Value}㎍/㎥`} />
        <InfoCard bg={uvInfo.bg} emoji="☀️" title="자외선" value={uvInfo.text} valueColor={uvInfo.color} detail={`${air.uvIndex}/11+`} />
      </div>
    </div>
  )
}
