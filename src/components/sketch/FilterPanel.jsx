import { useMemo, useState } from 'react'

/**
 * 수업스케치 필터 패널
 * 생성형 추천 조건 입력 (컴팩트 가로 레이아웃)
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
      <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-md border border-white/80 shadow-glass-strong">
        <div className="flex items-center justify-between gap-sm mb-sm flex-wrap">
          <div>
            <h3 className="text-body-bold text-text">🎯 추천 조건</h3>
            <div className="text-caption text-muted">스포츠 · 전략형 (고정)</div>
          </div>
          <button
            onClick={onRecommend}
            className="py-2 px-4 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-all"
          >
            🧩 후보 생성
          </button>
        </div>

        <div className="grid lg:grid-cols-12 gap-sm">
          <div className="lg:col-span-3 bg-white/45 rounded-lg border border-white/70 p-sm">
            <div className="text-caption font-semibold text-text mb-xs">학년</div>
            <div className="flex flex-wrap gap-1.5 mb-sm">
              {GRADES.map((grade) => (
                <button
                  key={grade}
                  onClick={() => setSelectedGrade(grade)}
                  className={`py-1.5 px-2.5 rounded-md text-xs font-semibold border transition-all ${
                    selectedGrade === grade
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white/70 text-text border-white/80 hover:bg-white'
                  }`}
                >
                  {grade}
                </button>
              ))}
            </div>

            <div className="text-caption font-semibold text-text mb-xs">종목</div>
            <div className="flex flex-wrap gap-1.5">
              {SPORTS.map((sport) => (
                <button
                  key={sport}
                  onClick={() => setSelectedSport(sport)}
                  className={`py-1.5 px-2.5 rounded-md text-xs font-semibold border transition-all ${
                    selectedSport === sport
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white/70 text-text border-white/80 hover:bg-white'
                  }`}
                >
                  {sport}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 bg-white/45 rounded-lg border border-white/70 p-sm">
            <div className="flex items-center justify-between gap-sm mb-xs">
              <div className="text-caption font-semibold text-text">FMS</div>
              <div className="text-caption text-muted">{selectedFmsCount}개</div>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-xs">
              {FMS_CATEGORIES.map((category) => {
                const count = selectedFmsByCategory[category]?.length || 0
                return (
                  <button
                    key={category}
                    onClick={() => setOpenFmsCategory(category)}
                    className="py-1.5 px-2.5 rounded-md text-xs font-semibold border bg-white/70 text-text border-white/80 hover:bg-white transition-all"
                  >
                    {category} ({count})
                  </button>
                )
              })}
            </div>

            {selectedFmsFocus.length > 0 ? (
              <div className="flex flex-wrap gap-1 max-h-14 overflow-y-auto pr-1">
                {selectedFmsFocus.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] px-2 py-0.5 bg-primary/10 text-primary rounded-md border border-primary/20"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-muted">카테고리를 눌러 선택</div>
            )}
          </div>

          <div className="lg:col-span-3 bg-white/45 rounded-lg border border-white/70 p-sm">
            <div className="flex items-center justify-between gap-sm mb-xs">
              <div className="text-caption font-semibold text-text">종목기술</div>
              <div className="text-[11px] text-muted">{selectedSport}</div>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pr-1">
              {sportSkillOptions.map((skill) => (
                <button
                  key={skill}
                  onClick={() => toggleSportSkill(skill)}
                  className={`py-1.5 px-2.5 rounded-md text-xs font-semibold border transition-all ${
                    selectedSportSkills.includes(skill)
                      ? 'bg-secondary/25 text-text border-secondary/40'
                      : 'bg-white/70 text-text border-white/80 hover:bg-white'
                  }`}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white/45 rounded-lg border border-white/70 p-sm">
            <div className="text-caption font-semibold text-text mb-xs">장소/시간</div>
            <div className="flex flex-wrap gap-1.5 mb-xs">
              {LOCATIONS.map((location) => (
                <button
                  key={location}
                  onClick={() => setSelectedLocation(location)}
                  className={`py-1.5 px-2 rounded-md text-xs font-semibold border transition-all ${
                    selectedLocation === location
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white/70 text-text border-white/80 hover:bg-white'
                  }`}
                >
                  {location}
                </button>
              ))}
            </div>

            <input
              type="range"
              min={25}
              max={40}
              step={5}
              value={durationMin}
              onChange={(e) => setDurationMin(Number(e.target.value))}
              className="w-full accent-primary mb-xs"
            />
            <div className="text-[11px] text-muted mb-xs">{durationMin}분</div>

            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-text mb-xs">
              <input
                type="checkbox"
                checked={weatherFilter}
                onChange={(e) => setWeatherFilter(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-primary"
              />
              실내 우선
            </label>

            <input
              value={availableEquipmentText}
              onChange={(e) => setAvailableEquipmentText(e.target.value)}
              className="w-full py-1.5 px-2 bg-white/70 border border-white/80 rounded-md text-xs text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="교구(쉼표)"
            />
          </div>
        </div>
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
