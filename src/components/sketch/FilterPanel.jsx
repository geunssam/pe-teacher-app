import { useMemo, useState } from 'react'

/**
 * 수업스케치 필터 패널
 * 생성형 추천 조건 입력
 */
export default function FilterPanel({
  selectedGrade,
  setSelectedGrade,
  selectedSport,
  setSelectedSport,
  selectedFmsByCategory,
  selectedFmsFocus,
  toggleFmsFocus,
  clearFmsCategory,
  selectedSportSkills,
  sportSkillOptions,
  toggleSportSkill,
  selectedLocation,
  setSelectedLocation,
  durationMin,
  setDurationMin,
  weatherFilter,
  setWeatherFilter,
  availableEquipmentText,
  setAvailableEquipmentText,
  GRADES,
  SPORTS,
  LOCATIONS,
  FMS_CATEGORIES,
  FMS_OPTIONS_BY_CATEGORY,
  onRecommend,
}) {
  const [openFmsCategory, setOpenFmsCategory] = useState(null)

  const selectedFmsCount = useMemo(
    () => Object.values(selectedFmsByCategory || {}).reduce((sum, list) => sum + (list?.length || 0), 0),
    [selectedFmsByCategory]
  )

  const modalOptions = openFmsCategory ? FMS_OPTIONS_BY_CATEGORY[openFmsCategory] || [] : []
  const selectedInModalCategory = openFmsCategory ? selectedFmsByCategory[openFmsCategory] || [] : []

  return (
    <>
      <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-xl border border-white/80 shadow-glass-strong">
        <h3 className="text-card-title mb-lg">🎯 생성형 추천 필터</h3>

        <div className="mb-lg p-md bg-white/40 rounded-lg border border-white/60">
          <div className="text-caption text-muted mb-xs">영역</div>
          <div className="text-body-bold text-text">스포츠 · 전략형 (고정)</div>
        </div>

        <div className="mb-lg">
          <div className="text-body font-semibold text-text mb-sm">학년</div>
          <div className="grid grid-cols-2 gap-sm">
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
                {grade}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-lg">
          <div className="text-body font-semibold text-text mb-sm">종목</div>
          <div className="grid grid-cols-2 gap-sm">
            {SPORTS.map((sport) => (
              <button
                key={sport}
                onClick={() => setSelectedSport(sport)}
                className={`
                  py-2 px-3 rounded-lg font-semibold text-sm transition-all border
                  ${
                    selectedSport === sport
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white/60 text-text border-white/80 hover:bg-white/80'
                  }
                `}
              >
                {sport}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-lg">
          <div className="flex items-center justify-between gap-sm mb-sm">
            <div className="text-body font-semibold text-text">FMS 포커스</div>
            <div className="text-caption text-muted">선택 {selectedFmsCount}개</div>
          </div>
          <div className="grid grid-cols-3 gap-sm mb-sm">
            {FMS_CATEGORIES.map((category) => {
              const count = selectedFmsByCategory[category]?.length || 0
              return (
                <button
                  key={category}
                  onClick={() => setOpenFmsCategory(category)}
                  className="py-2 px-2 rounded-lg font-semibold text-sm transition-all border bg-white/60 text-text border-white/80 hover:bg-white/80"
                >
                  {category}
                  <span className="ml-1 text-caption text-muted">({count})</span>
                </button>
              )
            })}
          </div>

          {selectedFmsFocus.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedFmsFocus.map((tag) => (
                <span
                  key={tag}
                  className="text-caption px-2 py-1 bg-primary/10 text-primary rounded-lg border border-primary/20"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-caption text-muted">카테고리를 눌러 FMS를 선택하세요.</div>
          )}
        </div>

        <div className="mb-lg">
          <div className="flex items-center justify-between gap-sm mb-sm">
            <div className="text-body font-semibold text-text">종목기술</div>
            <div className="text-caption text-muted">{selectedSport}</div>
          </div>
          <div className="grid grid-cols-2 gap-sm">
            {sportSkillOptions.map((skill) => (
              <button
                key={skill}
                onClick={() => toggleSportSkill(skill)}
                className={`
                  py-2 px-3 rounded-lg font-semibold text-sm transition-all border text-left
                  ${
                    selectedSportSkills.includes(skill)
                      ? 'bg-secondary/25 text-text border-secondary/40'
                      : 'bg-white/60 text-text border-white/80 hover:bg-white/80'
                  }
                `}
              >
                {skill}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-lg">
          <div className="text-body font-semibold text-text mb-sm">장소</div>
          <div className="grid grid-cols-2 gap-sm mb-sm">
            {LOCATIONS.map((location) => (
              <button
                key={location}
                onClick={() => setSelectedLocation(location)}
                className={`
                  py-2 px-3 rounded-lg font-semibold text-sm transition-all border
                  ${
                    selectedLocation === location
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white/60 text-text border-white/80 hover:bg-white/80'
                  }
                `}
              >
                {location}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-caption text-text">
            <input
              type="checkbox"
              checked={weatherFilter}
              onChange={(e) => setWeatherFilter(e.target.checked)}
              className="w-4 h-4 rounded accent-primary"
            />
            비/미세먼지 상황 가정 (실내 우선)
          </label>
        </div>

        <div className="mb-lg">
          <div className="text-body font-semibold text-text mb-sm">수업 시간 (분)</div>
          <input
            type="range"
            min={25}
            max={40}
            step={5}
            value={durationMin}
            onChange={(e) => setDurationMin(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="text-caption text-muted mt-xs">{durationMin}분 내 운영 가능한 활동만 생성</div>
        </div>

        <div className="mb-lg">
          <div className="text-body font-semibold text-text mb-sm">사용 가능 교구 (쉼표 구분)</div>
          <textarea
            value={availableEquipmentText}
            onChange={(e) => setAvailableEquipmentText(e.target.value)}
            rows={2}
            className="w-full p-md bg-white/60 border border-white/80 rounded-lg text-body text-text placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
            placeholder="예: 축구공, 콘, 조끼, 호루라기"
          />
        </div>

        <button
          onClick={onRecommend}
          className="w-full py-3 px-4 bg-primary text-white rounded-xl font-semibold hover:opacity-90 transition-all"
        >
          🧩 후보 3개 생성
        </button>
      </div>

      {openFmsCategory && (
        <div
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm p-md flex items-center justify-center"
          onClick={() => setOpenFmsCategory(null)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-2xl border border-white/80 shadow-glass-strong p-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-md">
              <h4 className="text-card-title">{openFmsCategory} FMS 선택</h4>
              <button
                onClick={() => setOpenFmsCategory(null)}
                className="py-1 px-2 rounded-lg text-caption bg-white/70 border border-white/80 hover:bg-white"
              >
                닫기
              </button>
            </div>

            <div className="text-caption text-muted mb-sm">
              선택 {selectedInModalCategory.length}개 / {modalOptions.length}개
            </div>

            <div className="max-h-[48vh] overflow-y-auto grid grid-cols-2 gap-sm mb-md pr-1">
              {modalOptions.map((skill) => {
                const selected = selectedInModalCategory.includes(skill)
                return (
                  <button
                    key={skill}
                    onClick={() => toggleFmsFocus(openFmsCategory, skill)}
                    className={`
                      py-2 px-3 rounded-lg font-semibold text-sm transition-all border text-left
                      ${
                        selected
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white/60 text-text border-white/80 hover:bg-white/80'
                      }
                    `}
                  >
                    {skill}
                  </button>
                )
              })}
            </div>

            <div className="flex justify-between gap-sm">
              <button
                onClick={() => clearFmsCategory(openFmsCategory)}
                className="py-2 px-4 rounded-lg font-semibold text-sm bg-white/70 text-text border border-white/80 hover:bg-white"
              >
                {openFmsCategory} 전체 해제
              </button>
              <button
                onClick={() => setOpenFmsCategory(null)}
                className="py-2 px-4 rounded-lg font-semibold text-sm bg-primary text-white hover:opacity-90"
              >
                적용
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
