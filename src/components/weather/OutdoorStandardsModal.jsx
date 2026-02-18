// 야외수업 기준 안내 모달 — 미세먼지, 자외선, 온도 기준을 한눈에 표시 | 부모→pages/WeatherPage.jsx

/**
 * 야외수업 판단 기준 통합 안내 모달
 */
export default function OutdoorStandardsModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="bg-white/60 backdrop-blur-xl p-4 sticky top-0 z-10 border-b border-white/80">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-800">📋 기상 수치별 야외수업 권고치</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/60 hover:bg-white/80 flex items-center justify-center transition-colors border border-white/80"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">교육부 권고 기준 (2021년 기준)</p>
        </div>

        {/* 내용 */}
        <div className="p-4 space-y-3">
          {/* 상단: 미세먼지 + 초미세먼지 */}
          <div className="grid grid-cols-2 gap-3">
            {/* 1. 미세먼지 기준 */}
            <div>
              <h4 className="text-sm font-bold text-gray-800 mb-1.5 flex items-center gap-1">
                <span>🌫️ 미세먼지</span>
                <span className="text-xs font-normal text-gray-500">교육부</span>
              </h4>
              <div className="grid grid-cols-2 gap-1.5">
                <CompactCard emoji="😊" grade="좋음" range="0~30㎍/㎥" color="#059669" />
                <CompactCard emoji="😐" grade="보통" range="31~80㎍/㎥" color="#D97706" />
                <CompactCard emoji="😷" grade="나쁨" range="81~150㎍/㎥" color="#EA580C" />
                <CompactCard emoji="🤢" grade="매우나쁨" range="151~㎍/㎥" color="#DC2626" />
              </div>
            </div>

            {/* 2. 초미세먼지 기준 */}
            <div>
              <h4 className="text-sm font-bold text-gray-800 mb-1.5 flex items-center gap-1">
                <span>🌫️ 초미세먼지</span>
                <span className="text-xs font-normal text-gray-500">교육부</span>
              </h4>
              <div className="grid grid-cols-2 gap-1.5">
                <CompactCard emoji="😊" grade="좋음" range="0~15㎍/㎥" color="#059669" />
                <CompactCard emoji="😐" grade="보통" range="16~35㎍/㎥" color="#D97706" />
                <CompactCard emoji="😷" grade="주의" range="36~75㎍/㎥" color="#EA580C" />
                <CompactCard emoji="🤢" grade="나쁨" range="76~㎍/㎥" color="#DC2626" />
              </div>
            </div>
          </div>

          {/* 하단: 자외선 + 기온 */}
          <div className="grid grid-cols-2 gap-3">
            {/* 3. 자외선 기준 */}
            <div>
              <h4 className="text-sm font-bold text-gray-800 mb-1.5 flex items-center gap-1">
                <span>☀️ 자외선 지수</span>
                <span className="text-xs font-normal text-gray-500">기상청</span>
              </h4>
              <div className="space-y-1.5">
                <div className="grid grid-cols-2 gap-1.5">
                  <CompactCard emoji="😊" grade="낮음" range="0~2" color="#059669" />
                  <CompactCard emoji="😐" grade="보통" range="3~5" color="#D97706" />
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <CompactCard emoji="😎" grade="높음" range="6~7" color="#EA580C" />
                  <CompactCard emoji="🥵" grade="매우높음" range="8~10" color="#DC2626" />
                </div>
                <CompactCard emoji="🔥" grade="위험" range="11~" color="#991B1B" fullWidth />
              </div>
            </div>

            {/* 4. 기온 기준 */}
            <div>
              <h4 className="text-sm font-bold text-gray-800 mb-1.5 flex items-center gap-1">
                <span>🌡️ 기온</span>
                <span className="text-xs font-normal text-gray-500">학교</span>
              </h4>
              <div className="space-y-1.5">
                <div className="grid grid-cols-2 gap-1.5">
                  <CompactCard emoji="🥶" grade="한파" range="-5°C↓" color="#991B1B" />
                  <CompactCard emoji="❄️" grade="추위" range="0°C↓" color="#EA580C" />
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <CompactCard emoji="😊" grade="최적" range="10~25°C" color="#059669" />
                  <CompactCard emoji="🌡️" grade="더위" range="28°C↑" color="#EA580C" />
                </div>
                <CompactCard emoji="🔥" grade="폭염" range="33°C↑" color="#DC2626" fullWidth />
              </div>
            </div>
          </div>

          {/* 참고사항 */}
          <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-xs font-semibold text-gray-800 mb-1">💡 참고사항</div>
            <div className="text-xs text-gray-600 leading-relaxed space-y-0.5">
              <div>• 미세먼지/초미세먼지 중 <strong>더 나쁜 등급</strong> 기준</div>
              <div>• 강수 예보 시 자동 실내활동 권장</div>
            </div>
          </div>

          {/* 지역 교육청 안내 */}
          <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200">
            <div className="text-xs font-semibold text-amber-900 mb-1">⚠️ 지역별 차이</div>
            <div className="text-xs text-amber-800 leading-relaxed">
              위 기준은 교육부 권고사항입니다. <strong>해당 시·도교육청의 세부 지침</strong>을 반드시 확인하세요.
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="bg-gray-50 px-4 py-3 text-center border-t">
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
 * 컴팩트 카드 (개별 항목)
 */
function CompactCard({ emoji, grade, range, color, fullWidth = false }) {
  return (
    <div
      className={`rounded-lg p-1.5 border ${fullWidth ? 'col-span-2' : ''}`}
      style={{
        borderColor: `${color}40`,
        backgroundColor: `${color}08`,
      }}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-lg shrink-0">{emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold truncate" style={{ color }}>
            {grade}
          </div>
          <div className="text-[10px] text-gray-600 truncate">{range}</div>
        </div>
      </div>
    </div>
  )
}
