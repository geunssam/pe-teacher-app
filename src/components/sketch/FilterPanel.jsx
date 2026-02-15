// 수업스케치 필터 — 교사 사고 흐름: 학년·장소 → 활동 방식 → FMS → 종목·기술 | 상수/상태→hooks/useRecommend.js, 부모→pages/SketchPage.jsx
import { useMemo, useState } from 'react'

const PHASE_LABELS = ['기본', '응용', '챌린지']
const SPORT_ICONS = {
  축구: '⚽', 농구: '🏀', 피구: '🤾', 배구: '🏐', 티볼: '⚾', 발야구: '🦶', 빅발리볼: '🎈', 플라잉디스크: '🥏', 줄넘기: '🪢',
  '공 터치 피구': '🤾', '컵 배구': '🥤', '손족구': '🤲', '가가볼': '🏓', '핑거 베이스볼': '👆', '핑거 발리볼': '👆',
  '술래 놀이': '🏃', '전래 놀이': '🎎', '컵 스태킹 놀이': '🥤',
}

const selectBase =
  'py-1.5 px-2 bg-white/70 border border-white/80 rounded-lg text-xs text-text font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow appearance-none cursor-pointer'

export default function FilterPanel({
  selectedGrade,
  setSelectedGrade,
  selectedDomain,
  setSelectedDomain,
  selectedSub,
  setSelectedSub,
  selectedSport,
  setSelectedSport,
  selectedFmsByCategory,
  toggleFmsFocus,
  clearFmsCategory,
  selectedSportSkills,
  sportSkillOptions,
  toggleSportSkill,
  selectedSpace,
  setSelectedSpace,
  selectedStructureIds,
  toggleStructure,
  durationMin,
  setDurationMin,
  availableEquipmentText,
  setAvailableEquipmentText,
  recommendAvailability,
  compatibleModuleCounts,
  fmsCurriculumGuide = [],
  isSixthSoccerSingleMode = false,
  GRADES,
  DOMAINS,
  SUB_DOMAINS_BY_DOMAIN,
  SPORTS,
  filteredSports,
  SPACES,
  DURATION_OPTIONS,
  FMS_CATEGORIES,
  FMS_OPTIONS_BY_CATEGORY,
  onRecommend,
}) {
  const [openSection, setOpenSection] = useState(null)
  const toggle = (key) => setOpenSection((prev) => (prev === key ? null : key))

  const gradeConfig = compatibleModuleCounts?.gradeConfig
  const allowedPhases = gradeConfig?.allowedPhases || []
  const maxModifierCount = gradeConfig?.maxModifierCount ?? 0

  const compatibleStructures = compatibleModuleCounts?.structures || []
  const structureCount = compatibleModuleCounts?.structureCount ?? 0
  const skillCount = compatibleModuleCounts?.skillCount ?? 0
  const modifierCount = compatibleModuleCounts?.modifierCount ?? 0
  const hasCompatible = recommendAvailability?.canRecommend
    ?? (structureCount > 0 && skillCount > 0)

  const structuresByPhase = useMemo(() => {
    const grouped = {}
    PHASE_LABELS.forEach((phase) => {
      grouped[phase] = []
    })
    compatibleStructures.forEach((s) => {
      if (grouped[s.suitablePhase]) grouped[s.suitablePhase].push(s)
    })
    return grouped
  }, [compatibleStructures])

  const selectedFmsCount = useMemo(
    () =>
      Object.values(selectedFmsByCategory || {}).reduce(
        (sum, list) => sum + (list?.length || 0),
        0
      ),
    [selectedFmsByCategory]
  )

  return (
    <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/80 shadow-glass-strong overflow-hidden">
      {/* ─── Header ─── */}
      <div className="px-4 pt-3 pb-1 flex items-center justify-between gap-2">
        <h3 className="text-body-bold text-text">추천 조건</h3>
        {isSixthSoccerSingleMode && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
            6학년 축구 전용 모드
          </span>
        )}
      </div>

      <div className="px-4 pb-1 space-y-3">
        {/* ═══ STEP 1: 학년 + 장소 ═══ */}
        <div>
          <SectionLabel num="1">학년 · 장소</SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className={selectBase}
            >
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            <select
              value={selectedSpace}
              onChange={(e) => setSelectedSpace(e.target.value)}
              className={selectBase}
            >
              {SPACES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1 flex-wrap mt-1.5">
            {PHASE_LABELS.map((phase) => {
              const active = allowedPhases.includes(phase)
              return (
                <span
                  key={phase}
                  className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                    active
                      ? 'bg-secondary/20 text-secondary'
                      : 'bg-black/[0.04] text-textDim'
                  }`}
                >
                  {active ? '●' : '○'} {phase}
                </span>
              )
            })}
            <span className="text-[10px] text-muted ml-0.5">
              · 변형 {maxModifierCount === 0 ? '없음' : `최대 ${maxModifierCount}개`}
            </span>
          </div>
        </div>

        <Divider />

        {/* ═══ STEP 2: 활동 방식 (아코디언 드롭다운) ═══ */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <SectionLabel num="2">활동 방식</SectionLabel>
            <span className="text-[10px] text-muted">
              {selectedStructureIds.length === 0
                ? `${structureCount}개 모두`
                : `${selectedStructureIds.length}개 선택`}
            </span>
          </div>

          <div className="space-y-1">
            {PHASE_LABELS.map((phase) => {
              const items = structuresByPhase[phase] || []
              const isAllowed = allowedPhases.includes(phase)
              const isOpen = openSection === `struct-${phase}`
              const selectedInPhase = items.filter((s) =>
                selectedStructureIds.includes(s.id)
              ).length

              return (
                <div key={phase}>
                  <button
                    onClick={() =>
                      isAllowed && items.length > 0 && toggle(`struct-${phase}`)
                    }
                    className={`w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg border text-xs font-semibold transition-all ${
                      !isAllowed || items.length === 0
                        ? 'bg-black/[0.03] border-black/[0.04] text-textDim cursor-default'
                        : isOpen
                          ? 'bg-primary/10 border-primary/20 text-primary'
                          : 'bg-white/70 border-white/80 text-text hover:bg-white'
                    }`}
                  >
                    <span>
                      {phase}
                      {(!isAllowed || items.length === 0) && (
                        <span className="text-[10px] font-normal ml-1 opacity-60">
                          {!isAllowed ? '미허용' : '없음'}
                        </span>
                      )}
                    </span>
                    {isAllowed && items.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        {selectedInPhase > 0 && (
                          <span className="text-[10px] bg-primary/20 text-primary px-1 rounded">
                            {selectedInPhase}
                          </span>
                        )}
                        <span className="text-[10px] text-muted">{items.length}개</span>
                        <Chevron open={isOpen} />
                      </div>
                    )}
                  </button>

                  {isOpen && (
                    <div className="mt-1 pl-1 flex flex-wrap gap-1">
                      {items.map((s) => {
                        const sel = selectedStructureIds.includes(s.id)
                        const anyMode = selectedStructureIds.length === 0
                        return (
                          <button
                            key={s.id}
                            onClick={() => toggleStructure(s.id)}
                            className={`py-1 px-2 rounded-lg text-[11px] font-semibold border transition-all active:scale-95 ${
                              sel
                                ? 'bg-primary text-white border-primary'
                                : anyMode
                                  ? 'bg-white/70 text-text border-white/80'
                                  : 'bg-white/50 text-muted border-white/60'
                            }`}
                          >
                            {s.name}
                            <span className="ml-0.5 text-[9px] opacity-60">
                              {s.groupSize}인
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {selectedStructureIds.length > 0 && (
            <button
              onClick={() => selectedStructureIds.forEach((id) => toggleStructure(id))}
              className="text-[10px] text-muted hover:text-text mt-1 underline underline-offset-2"
            >
              선택 해제
            </button>
          )}
        </div>

        <Divider />

        {/* ═══ STEP 3: FMS 포커스 (아코디언 드롭다운) ═══ */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <SectionLabel num="3">FMS 포커스</SectionLabel>
            <span className="text-[10px] text-muted">{selectedFmsCount}개 선택</span>
          </div>

          <div className="space-y-1">
            {FMS_CATEGORIES.map((category) => {
              const options = FMS_OPTIONS_BY_CATEGORY[category] || []
              const selected = selectedFmsByCategory[category] || []
              const isOpen = openSection === `fms-${category}`

              return (
                <div key={category}>
                  <button
                    onClick={() => toggle(`fms-${category}`)}
                    className={`w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg border text-xs font-semibold transition-all ${
                      isOpen
                        ? 'bg-primary/10 border-primary/20 text-primary'
                        : selected.length > 0
                          ? 'bg-white/80 border-primary/15 text-text'
                          : 'bg-white/70 border-white/80 text-text hover:bg-white'
                    }`}
                  >
                    <span>{category}</span>
                    <div className="flex items-center gap-1.5">
                      {selected.length > 0 && (
                        <span className="text-[10px] bg-primary/20 text-primary px-1 rounded">
                          {selected.length}
                        </span>
                      )}
                      <span className="text-[10px] text-muted">{options.length}개</span>
                      <Chevron open={isOpen} />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="mt-1 pl-1 flex flex-wrap gap-1">
                      {options.map((skill) => {
                        const sel = selected.includes(skill)
                        return (
                          <button
                            key={skill}
                            onClick={() => toggleFmsFocus(category, skill)}
                            className={`py-1 px-2 rounded-lg text-[11px] font-semibold border transition-all active:scale-95 ${
                              sel
                                ? 'bg-primary text-white border-primary'
                                : 'bg-white/70 text-text border-white/80'
                            }`}
                          >
                            {skill}
                          </button>
                        )
                      })}
                      {selected.length > 0 && (
                        <button
                          onClick={() => clearFmsCategory(category)}
                          className="py-1 px-2 rounded-lg text-[11px] text-muted border border-dashed border-black/10 hover:border-black/20 transition-colors"
                        >
                          초기화
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {fmsCurriculumGuide.length > 0 && (
            <div className="mt-1.5 p-2 bg-primary/5 rounded-lg border border-primary/10">
              <div className="text-[10px] font-semibold text-primary/70 mb-0.5">FMS 커리큘럼 가이드</div>
              <div className="text-[11px] text-text/70 leading-relaxed">
                {fmsCurriculumGuide[0].name}: {fmsCurriculumGuide[0].curriculumFocus}
              </div>
            </div>
          )}
        </div>

        <Divider />

        {/* ═══ STEP 4: 영역 > 종목 > 기술 ═══ */}
        <div>
          <SectionLabel num="4">영역 · 종목 · 기술</SectionLabel>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <select
              value={selectedDomain}
              onChange={(e) => {
                setSelectedDomain(e.target.value)
                const subs = SUB_DOMAINS_BY_DOMAIN[e.target.value] || []
                if (subs.length > 0) setSelectedSub(subs[0])
              }}
              className={selectBase}
            >
              {DOMAINS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select
              value={selectedSub}
              onChange={(e) => setSelectedSub(e.target.value)}
              className={selectBase}
            >
              {(SUB_DOMAINS_BY_DOMAIN[selectedDomain] || []).map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          <select
            value={selectedSport}
            onChange={(e) => setSelectedSport(e.target.value)}
            className={`${selectBase} w-full mb-2`}
          >
            {(filteredSports || SPORTS).map((s) => (
              <option key={s} value={s}>
                {SPORT_ICONS[s]} {s}
              </option>
            ))}
          </select>

          <div className="text-[11px] font-semibold text-text/50 mb-1">
            {selectedSport} 기술
          </div>
          <div className="flex flex-wrap gap-1.5">
            {sportSkillOptions.map((skill) => (
              <button
                key={skill}
                onClick={() => toggleSportSkill(skill)}
                className={`py-1 px-2 rounded-lg text-[11px] font-semibold border transition-all ${
                  selectedSportSkills.includes(skill)
                    ? 'bg-secondary/20 text-text border-secondary/40'
                    : 'bg-white/70 text-text border-white/80 hover:bg-white'
                }`}
              >
                {skill}
              </button>
            ))}
          </div>
        </div>

        <Divider />

        {/* ─── 부가 설정 ─── */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <SectionLabel>수업 시간</SectionLabel>
            <select
              value={durationMin}
              onChange={(e) => setDurationMin(Number(e.target.value))}
              className={`${selectBase} w-full`}
            >
              {DURATION_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m}분
                </option>
              ))}
            </select>
          </div>
          <div>
            <SectionLabel>보유 교구</SectionLabel>
            <input
              value={availableEquipmentText}
              onChange={(e) => setAvailableEquipmentText(e.target.value)}
              className="w-full py-1.5 px-2 bg-white/70 border border-white/80 rounded-lg text-xs text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
              placeholder="공, 콘, 조끼..."
            />
          </div>
        </div>
      </div>

      {/* ─── Footer: Module Stats + CTA ─── */}
      <div className="border-t border-black/[0.06] bg-white/30 px-4 py-3 mt-1">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-3">
            <ModuleStat label="활동" count={structureCount} />
            <span className="text-textDim text-[10px]">×</span>
            <ModuleStat label="기술" count={skillCount} />
            <span className="text-textDim text-[10px]">×</span>
            <ModuleStat label="변형" count={modifierCount} />
          </div>
          {!hasCompatible && (
            <span className="text-[10px] text-danger font-semibold">조합 불가</span>
          )}
        </div>

        <button
          onClick={onRecommend}
          disabled={!hasCompatible}
          className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.98] ${
            hasCompatible
              ? 'bg-primary text-white hover:opacity-90 shadow-sm'
              : 'bg-black/[0.06] text-muted cursor-not-allowed'
          }`}
        >
          {hasCompatible ? '수업 추천받기' : '호환 조합이 없습니다'}
        </button>
        {hasCompatible && !recommendAvailability?.moduleReady && (
          <span className="block text-center text-[10px] text-muted mt-1">
            {recommendAvailability?.csvReady ? 'CSV 활동 기반 추천' : '기본 활동 기반 추천'}
          </span>
        )}
      </div>
    </div>
  )
}

/* ─── Internal Sub-Components ─── */

function Divider() {
  return <div className="border-t border-black/[0.06]" />
}

function SectionLabel({ children, num }) {
  return (
    <div className="flex items-center gap-1.5 mb-1">
      {num && (
        <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
          {num}
        </span>
      )}
      <span className="text-[11px] font-semibold text-text/60 tracking-wide">
        {children}
      </span>
    </div>
  )
}

function Chevron({ open }) {
  return (
    <svg
      className={`w-3 h-3 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function ModuleStat({ label, count }) {
  return (
    <div className="flex items-center gap-1">
      <span
        className={`text-[12px] font-bold tabular-nums ${count > 0 ? 'text-primary' : 'text-danger'}`}
      >
        {count}
      </span>
      <span className="text-[10px] text-muted">{label}</span>
    </div>
  )
}
