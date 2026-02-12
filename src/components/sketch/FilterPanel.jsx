/**
 * 수업스케치 필터 패널
 * 학년 → 영역 → 세부영역 3단 캐스케이드
 */
export default function FilterPanel({
  selectedGrade,
  selectedDomain,
  selectedSub,
  weatherFilter,
  setSelectedGrade,
  setSelectedDomain,
  setSelectedSub,
  setWeatherFilter,
  getSubDomains,
  GRADES,
  DOMAINS,
  onRecommend
}) {
  const subDomains = selectedDomain ? getSubDomains(selectedDomain) : []

  const handleDomainChange = (domain) => {
    setSelectedDomain(domain)
    setSelectedSub('') // 영역 변경 시 세부영역 초기화
  }

  return (
    <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-xl border border-white/80 shadow-glass-strong">
      <h3 className="text-card-title mb-lg">🎯 활동 필터</h3>

      {/* 학년 선택 */}
      <div className="mb-lg">
        <div className="text-body font-semibold text-text mb-sm">학년</div>
        <div className="grid grid-cols-4 gap-sm">
          {GRADES.map((grade) => (
            <button
              key={grade}
              onClick={() => setSelectedGrade(grade)}
              className={`
                py-2 px-3 rounded-lg font-semibold text-sm transition-all border
                ${
                  selectedGrade === grade
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white/60 text-text border-white/80 hover:bg-white/80'
                }
              `}
            >
              {grade.replace('학년', '')}
            </button>
          ))}
        </div>
      </div>

      {/* 영역 선택 */}
      <div className="mb-lg">
        <div className="text-body font-semibold text-text mb-sm">영역</div>
        <div className="grid grid-cols-3 gap-sm">
          {DOMAINS.map((domain) => {
            const emoji = domain === '운동' ? '💪' : domain === '스포츠' ? '⚽' : '🎭'
            return (
              <button
                key={domain}
                onClick={() => handleDomainChange(domain)}
                className={`
                  py-2 px-3 rounded-lg font-semibold text-sm transition-all border
                  ${
                    selectedDomain === domain
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white/60 text-text border-white/80 hover:bg-white/80'
                  }
                `}
              >
                {emoji} {domain}
              </button>
            )
          })}
        </div>
      </div>

      {/* 세부영역 선택 */}
      {selectedDomain && subDomains.length > 0 && (
        <div className="mb-lg">
          <div className="text-body font-semibold text-text mb-sm">세부영역</div>
          <div className="grid grid-cols-2 gap-sm">
            <button
              onClick={() => setSelectedSub('')}
              className={`
                py-2 px-3 rounded-lg font-semibold text-sm transition-all border
                ${
                  selectedSub === ''
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white/60 text-text border-white/80 hover:bg-white/80'
                }
              `}
            >
              전체
            </button>
            {subDomains.map((sub) => (
              <button
                key={sub}
                onClick={() => setSelectedSub(sub)}
                className={`
                  py-2 px-3 rounded-lg font-semibold text-sm transition-all border
                  ${
                    selectedSub === sub
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white/60 text-text border-white/80 hover:bg-white/80'
                  }
                `}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 날씨 자동 필터 */}
      <div className="mb-lg p-md bg-white/40 rounded-lg border border-white/60">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={weatherFilter}
            onChange={(e) => setWeatherFilter(e.target.checked)}
            className="w-4 h-4 rounded accent-primary"
          />
          <span className="text-body text-text">
            {weatherFilter ? '🌧️ 실내 활동만 표시' : '☀️ 날씨 필터 없음'}
          </span>
        </label>
      </div>

      {/* 추천받기 버튼 */}
      <button
        onClick={onRecommend}
        className="w-full py-3 px-4 bg-primary text-white rounded-xl font-semibold hover:opacity-90 transition-all"
      >
        🎲 추천받기
      </button>
    </div>
  )
}
