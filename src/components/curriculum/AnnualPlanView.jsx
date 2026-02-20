// 연간 계획 메인 뷰 — 학년별 단원 배치 + 영역 분포 | 부모→CurriculumPage, 훅→useAnnualPlan
import { useState, useMemo } from 'react'
import AnnualUnitCard from './AnnualUnitCard'
import AnnualDomainChart from './AnnualDomainChart'
import unitTemplatesData from '../../data/curriculum/unitTemplates.json'

const GRADE_OPTIONS = ['3학년', '4학년', '5학년', '6학년']

export default function AnnualPlanView({
  plans,
  teachableWeeks,
  onCreatePlan,
  onDeletePlan,
  onAddUnitFromTemplate,
  onAddCustomUnit,
  onUpdateUnit,
  onRemoveUnit,
  onAssignUnitWeeks,
  onAutoAssignWeeks,
  onReorderUnits,
  onUpdateLesson,
  getDomainDistribution,
  getPlanSummary,
  calendarYear,
  weeklyPEHours,
}) {
  const [selectedGrade, setSelectedGrade] = useState('5학년')
  const [showAddForm, setShowAddForm] = useState(false)

  // 현재 학년의 계획
  const currentPlan = useMemo(
    () => (plans || []).find((p) => p.grade === selectedGrade) || null,
    [plans, selectedGrade]
  )
  const distribution = currentPlan ? getDomainDistribution(currentPlan.id) : {}
  const summary = currentPlan ? getPlanSummary(currentPlan.id) : null

  // 해당 학년의 템플릿 필터
  const gradeTemplates = useMemo(() => {
    const templates = unitTemplatesData?.templates || []
    return templates.filter((t) => t.grade === selectedGrade)
  }, [selectedGrade])

  // 단원 추가 폼 상태
  const [newTitle, setNewTitle] = useState('')
  const [newDomain, setNewDomain] = useState('스포츠')
  const [newLessons, setNewLessons] = useState(8)

  const handleCreatePlan = () => {
    onCreatePlan({
      year: calendarYear,
      grade: selectedGrade,
      title: `${selectedGrade} 연간 수업 계획`,
    })
  }

  const handleAddCustomUnit = (e) => {
    e.preventDefault()
    if (!currentPlan || !newTitle.trim()) return
    onAddCustomUnit(currentPlan.id, {
      title: newTitle.trim(),
      domain: newDomain,
      totalLessons: newLessons,
    })
    setNewTitle('')
    setNewDomain('스포츠')
    setNewLessons(8)
    setShowAddForm(false)
  }

  const handleAddFromTemplate = (templateId) => {
    if (!currentPlan) return
    onAddUnitFromTemplate(currentPlan.id, templateId)
  }

  const handleRemoveUnit = (unitId) => {
    if (!currentPlan) return
    onRemoveUnit(currentPlan.id, unitId)
  }

  const handleUpdateUnit = (unitId, updates) => {
    if (!currentPlan) return
    onUpdateUnit(currentPlan.id, unitId, updates)
  }

  const handleAssignWeeks = (unitId, weeks) => {
    if (!currentPlan) return
    onAssignUnitWeeks(currentPlan.id, unitId, weeks)
  }

  const handleMoveUnit = (unitId, direction) => {
    if (!currentPlan?.units) return
    const units = currentPlan.units
    const idx = units.findIndex((u) => u.id === unitId)
    if (idx < 0) return
    const newIdx = idx + direction
    if (newIdx < 0 || newIdx >= units.length) return
    const newIds = units.map((u) => u.id)
    ;[newIds[idx], newIds[newIdx]] = [newIds[newIdx], newIds[idx]]
    onReorderUnits(currentPlan.id, newIds)
  }

  return (
    <div>
      {/* 학년 탭 */}
      <div className="flex items-center gap-2 mb-4">
        {GRADE_OPTIONS.map((g) => (
          <button
            key={g}
            onClick={() => {
              setSelectedGrade(g)
              setShowAddForm(false)
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
              selectedGrade === g
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* 계획 없을 때: 생성 버튼 */}
      {!currentPlan && (
        <div className="p-6 text-center bg-white/40 rounded-xl border border-white/60">
          <p className="text-sm text-gray-500 mb-4">
            {selectedGrade} 연간 수업 계획이 아직 없습니다
          </p>
          <button
            onClick={handleCreatePlan}
            className="py-2.5 px-5 rounded-lg text-sm font-semibold text-white bg-[#7C9EF5] hover:bg-[#6B8DE4] transition-colors"
          >
            연간 계획 만들기
          </button>
        </div>
      )}

      {/* 계획 있을 때 */}
      {currentPlan && (
        <div className="space-y-4">
          {/* 요약 카드 */}
          {summary && (
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 bg-white/40 rounded-xl text-center border border-white/60">
                <div className="text-lg font-bold text-text">{summary.totalUnits}</div>
                <div className="text-[10px] text-gray-400">단원 수</div>
              </div>
              <div className="p-3 bg-white/40 rounded-xl text-center border border-white/60">
                <div className="text-lg font-bold text-text">{summary.totalLessons}</div>
                <div className="text-[10px] text-gray-400">총 차시</div>
              </div>
              <div className="p-3 bg-white/40 rounded-xl text-center border border-white/60">
                <div className="text-lg font-bold text-text">{summary.assignedWeeks ?? 0}</div>
                <div className="text-[10px] text-gray-400">배정 주수</div>
              </div>
            </div>
          )}

          {/* 영역 분포 차트 */}
          <div className="p-4 bg-white/40 rounded-xl border border-white/60">
            <h3 className="text-xs font-semibold text-gray-500 mb-3">영역 분포</h3>
            <AnnualDomainChart distribution={distribution} />
          </div>

          {/* 자동 주차 배정 버튼 */}
          {currentPlan.units && currentPlan.units.length > 0 && teachableWeeks?.length > 0 && (
            <button
              onClick={() => onAutoAssignWeeks(currentPlan.id, teachableWeeks, weeklyPEHours || 3)}
              className="w-full py-2.5 rounded-xl text-xs font-semibold border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
            >
              전체 단원 자동 주차 배정 (주 {weeklyPEHours || 3}시간 기준)
            </button>
          )}

          {/* 단원 카드 리스트 */}
          {currentPlan.units && currentPlan.units.length > 0 ? (
            <div className="space-y-3">
              {currentPlan.units.map((unit, idx) => (
                <AnnualUnitCard
                  key={unit.id}
                  unit={unit}
                  index={idx}
                  totalCount={currentPlan.units.length}
                  onUpdate={(unitId, updates) => handleUpdateUnit(unitId, updates)}
                  onRemove={handleRemoveUnit}
                  onAssignWeeks={(unitId, weeks) => handleAssignWeeks(unitId, weeks)}
                  onMoveUp={(unitId) => handleMoveUnit(unitId, -1)}
                  onMoveDown={(unitId) => handleMoveUnit(unitId, 1)}
                  teachableWeeks={teachableWeeks}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-gray-400">
              아직 등록된 단원이 없습니다
            </div>
          )}

          {/* 단원 추가 영역 */}
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full py-3 rounded-xl text-sm font-semibold border-2 border-dashed border-gray-200 text-gray-400 hover:border-[#7C9EF5]/50 hover:text-[#7C9EF5] transition-colors"
            >
              + 단원 추가
            </button>
          ) : (
            <div className="p-4 bg-white/40 rounded-xl border border-white/60">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">단원 추가</h3>

              {/* 템플릿에서 추가 */}
              {gradeTemplates.length > 0 && (
                <div className="mb-4">
                  <label className="text-xs font-semibold text-gray-500 mb-2 block">교육과정 템플릿에서 추가</label>
                  <div className="space-y-1.5">
                    {gradeTemplates.map((tmpl) => {
                      const alreadyAdded = currentPlan.units?.some((u) => u.sourceTemplateId === tmpl.id)
                      return (
                        <button
                          key={tmpl.id}
                          onClick={() => handleAddFromTemplate(tmpl.id)}
                          disabled={alreadyAdded}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs border transition-colors text-left ${
                            alreadyAdded
                              ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                              : 'bg-white/40 text-gray-700 border-white/60 hover:border-[#7C9EF5]/50'
                          }`}
                        >
                          <span className="font-medium">{tmpl.title}</span>
                          <span className="text-gray-400 shrink-0 ml-2">
                            {alreadyAdded ? '추가됨' : `${tmpl.totalLessons}차시`}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 직접 추가 폼 */}
              <div className="pt-3 border-t border-gray-100">
                <label className="text-xs font-semibold text-gray-500 mb-2 block">직접 추가</label>
                <form onSubmit={handleAddCustomUnit} className="space-y-2">
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="단원명"
                    maxLength={40}
                    className="w-full py-2 px-3 rounded-lg border border-gray-200 bg-white/60 text-sm focus:outline-none focus:border-[#7C9EF5]/50"
                  />
                  <div className="flex items-center gap-2">
                    <select
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                      className="flex-1 py-2 px-3 rounded-lg border border-gray-200 bg-white/60 text-sm focus:outline-none"
                    >
                      <option value="운동">운동</option>
                      <option value="스포츠">스포츠</option>
                      <option value="표현">표현</option>
                    </select>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={newLessons}
                        onChange={(e) => setNewLessons(Math.max(1, parseInt(e.target.value) || 1))}
                        min={1}
                        max={30}
                        className="w-16 py-2 px-2 rounded-lg border border-gray-200 bg-white/60 text-sm text-center focus:outline-none focus:border-[#7C9EF5]/50"
                      />
                      <span className="text-xs text-gray-400">차시</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={!newTitle.trim()}
                      className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-[#7C9EF5] disabled:opacity-40 transition-all"
                    >
                      추가
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="py-2 px-4 rounded-lg text-sm font-semibold text-gray-500 bg-gray-100 transition-all"
                    >
                      취소
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 계획 삭제 */}
          <div className="text-center pt-2">
            <button
              onClick={() => onDeletePlan(currentPlan.id)}
              className="text-[11px] text-gray-300 hover:text-danger transition-colors"
            >
              연간 계획 삭제
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
