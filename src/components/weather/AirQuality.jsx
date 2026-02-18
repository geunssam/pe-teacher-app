// 대기질 — 미세먼지/초미세먼지 수치 + 등급 표시 | 부모→pages/WeatherPage.jsx, API→services/weather/airQualityFetch.js, 등급→data/mockWeather.js(PM_GRADE)
import { useState } from 'react'
import { PM_GRADE } from '../../data/mockWeather'

const UV_INFO = {
  1: { text: '낮음', color: '#059669', bg: 'rgba(5, 150, 105, 0.08)' },
  2: { text: '보통', color: '#D97706', bg: 'rgba(217, 119, 6, 0.08)' },
  3: { text: '높음', color: '#EA580C', bg: 'rgba(234, 88, 12, 0.08)' },
  4: { text: '매우높음', color: '#DC2626', bg: 'rgba(220, 38, 38, 0.08)' },
  5: { text: '위험', color: '#991B1B', bg: 'rgba(153, 27, 27, 0.08)' },
}

// 미세먼지 등급 기준 (환경부 기준)
const PM_STANDARDS = {
  pm10: [
    { grade: '좋음', range: '0~30', color: '#059669', emoji: '😊' },
    { grade: '보통', range: '31~80', color: '#D97706', emoji: '😐' },
    { grade: '나쁨', range: '81~150', color: '#DC2626', emoji: '😷' },
    { grade: '매우나쁨', range: '151~', color: '#991B1B', emoji: '🤢' },
  ],
  pm25: [
    { grade: '좋음', range: '0~15', color: '#059669', emoji: '😊' },
    { grade: '보통', range: '16~35', color: '#D97706', emoji: '😐' },
    { grade: '나쁨', range: '36~75', color: '#DC2626', emoji: '😷' },
    { grade: '매우나쁨', range: '76~', color: '#991B1B', emoji: '🤢' },
  ],
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
 * 미세먼지 등급 기준 모달
 */
function PMStandardsModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-[#7CE0A3] to-[#7C9EF5] p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">🌫️ 미세먼지 등급 기준</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-white/90 mt-1">환경부 기준 (단위: μg/m³)</p>
        </div>

        {/* 내용 */}
        <div className="p-4 space-y-4">
          {/* PM-10 미세먼지 */}
          <div>
            <h4 className="text-base font-bold text-gray-800 mb-2 flex items-center gap-2">
              <span>미세먼지</span>
              <span className="text-sm font-normal text-gray-500">PM-10</span>
            </h4>
            <div className="space-y-1.5">
              {PM_STANDARDS.pm10.map((item) => (
                <div
                  key={item.grade}
                  className="flex items-center gap-2 p-2 rounded-lg border"
                  style={{ borderColor: `${item.color}40`, backgroundColor: `${item.color}08` }}
                >
                  <span className="text-xl shrink-0">{item.emoji}</span>
                  <span className="text-sm font-bold shrink-0 w-20" style={{ color: item.color }}>
                    {item.grade}
                  </span>
                  <span className="text-sm text-gray-700 font-medium">
                    {item.range} μg/m³
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* PM-2.5 초미세먼지 */}
          <div>
            <h4 className="text-base font-bold text-gray-800 mb-2 flex items-center gap-2">
              <span>초미세먼지</span>
              <span className="text-sm font-normal text-gray-500">PM-2.5</span>
            </h4>
            <div className="space-y-1.5">
              {PM_STANDARDS.pm25.map((item) => (
                <div
                  key={item.grade}
                  className="flex items-center gap-2 p-2 rounded-lg border"
                  style={{ borderColor: `${item.color}40`, backgroundColor: `${item.color}08` }}
                >
                  <span className="text-xl shrink-0">{item.emoji}</span>
                  <span className="text-sm font-bold shrink-0 w-20" style={{ color: item.color }}>
                    {item.grade}
                  </span>
                  <span className="text-sm text-gray-700 font-medium">
                    {item.range} μg/m³
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="bg-gray-50 px-4 py-3 text-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gradient-to-r from-[#7CE0A3] to-[#7C9EF5] text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * 대기질 정보 카드 - 3열 그리드
 */
export default function AirQuality({ air }) {
  const [showStandards, setShowStandards] = useState(false)

  if (!air) return null

  const pm10Info = PM_GRADE[air.pm10Grade] || PM_GRADE[1]
  const pm25Info = PM_GRADE[air.pm25Grade] || PM_GRADE[1]
  const uvInfo = UV_INFO[air.uvGrade] || UV_INFO[2]

  return (
    <>
      <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-xl border border-white/80 shadow-glass-strong">
        <div className="flex items-center justify-between mb-md">
          <h3 className="text-card-title">대기질 정보</h3>
          <button
            onClick={() => setShowStandards(true)}
            className="w-8 h-8 rounded-full bg-white/60 hover:bg-white/80 border border-white/80 flex items-center justify-center transition-all hover:scale-110"
            title="등급 기준 보기"
          >
            <span className="text-base">ℹ️</span>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <InfoCard bg={pm10Info.bg} emoji={pm10Info.emoji} title="미세먼지" value={pm10Info.text} valueColor={pm10Info.color} detail={`${air.pm10Value}㎍/㎥`} />
          <InfoCard bg={pm25Info.bg} emoji={pm25Info.emoji} title="초미세먼지" value={pm25Info.text} valueColor={pm25Info.color} detail={`${air.pm25Value}㎍/㎥`} />
          <InfoCard bg={uvInfo.bg} emoji="☀️" title="자외선" value={uvInfo.text} valueColor={uvInfo.color} detail={`${air.uvIndex}/11+`} />
        </div>
      </div>

      {/* 등급 기준 모달 */}
      {showStandards && <PMStandardsModal onClose={() => setShowStandards(false)} />}
    </>
  )
}
