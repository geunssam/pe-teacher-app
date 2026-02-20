// 주간 수업 배치 — 캘린더+차시카드 분할 뷰 (드래그앤드롭+탭) | 부모→CurriculumPage
import { useState, useMemo, useCallback } from 'react'
import AnnualDomainChart from './AnnualDomainChart'
import AceBadge from './AceBadge'
import LessonPoolPanel from './LessonPoolPanel'

const GRADE_OPTIONS = ['3학년', '4학년', '5학년', '6학년']

const DOMAIN_DOT = {
  '운동': '#F57C7C',
  '스포츠': '#7C9EF5',
  '표현': '#A78BFA',
}

export default function WeeklyPlanView({
  plans,
  teachableWeeks,
  calendarYear,
  weeklyPEHours,
  onCreatePlan,
  onDeletePlan,
  onImportTemplate,
  onRemoveTemplate,
  onAddCustomLesson,
  onToggleIncluded,
  onAssignToWeek,
  onRemoveLessonFromWeek,
  onReorderWeekLessons,
  onMoveLessonToWeek,
  onAutoFillWeeks,
  getDomainDistribution,
  getPlanSummary,
  getLessonsForWeek,
}) {
  const [selectedGrade, setSelectedGrade] = useState('5학년')
  const [manageOpen, setManageOpen] = useState(false)
  const [dragOverWeek, setDragOverWeek] = useState(null)
  const [selectedWeekKey, setSelectedWeekKey] = useState(null) // 모바일용
  const [showChart, setShowChart] = useState(false)

  const currentPlan = useMemo(
    () => (plans || []).find((p) => p.grade === selectedGrade) || null,
    [plans, selectedGrade]
  )

  const distribution = currentPlan ? getDomainDistribution(currentPlan.id) : {}
  const summary = currentPlan ? getPlanSummary(currentPlan.id) : null
  const weeks = teachableWeeks || []

  // 1학기/2학기 분리
  const semester1 = useMemo(
    () => weeks.filter((w) => {
      const m = parseInt(w.mondayDate?.split('-')[1], 10)
      return m >= 3 && m <= 7
    }), [weeks]
  )
  const semester2 = useMemo(
    () => weeks.filter((w) => {
      const m = parseInt(w.mondayDate?.split('-')[1], 10)
      return m >= 8 || m <= 2
    }), [weeks]
  )

  // 미배정 차시 (오른쪽 패널용)
  const unassignedGroups = useMemo(() => {
    if (!currentPlan) return []
    const pool = currentPlan.lessonPool || []
    const assignedIds = new Set()
    for (const ids of Object.values(currentPlan.weekSlots || {})) {
      for (const id of ids) assignedIds.add(id)
    }
    const unassigned = pool.filter((lp) => lp.included && !assignedIds.has(lp.poolId))

    const map = new Map()
    for (const lp of unassigned) {
      const key = lp.sourceTemplateId || `custom_${lp.unitTitle}`
      if (!map.has(key)) {
        map.set(key, { key, unitTitle: lp.unitTitle, domain: lp.domain, lessons: [] })
      }
      map.get(key).lessons.push(lp)
    }
    return Array.from(map.values())
  }, [currentPlan])

  // 첫 열릴 때 첫 번째 주 선택 (모바일용)
  useMemo(() => {
    if (weeks.length > 0 && !selectedWeekKey) {
      setSelectedWeekKey(weeks[0].weekKey)
    }
  }, [weeks.length])

  // 모바일에서 선택된 주의 차시
  const selectedWeekLessons = useMemo(() => {
    if (!currentPlan || !selectedWeekKey) return []
    return getLessonsForWeek(currentPlan.id, selectedWeekKey)
  }, [currentPlan, selectedWeekKey, getLessonsForWeek])

  const selectedWeekInfo = useMemo(
    () => weeks.find((w) => w.weekKey === selectedWeekKey),
    [weeks, selectedWeekKey]
  )

  // --- 드래그앤드롭 핸들러 ---

  const handleDragStart = useCallback((e, poolId) => {
    e.dataTransfer.setData('text/plain', poolId)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragOver = useCallback((e, weekKey) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverWeek(weekKey)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverWeek(null)
  }, [])

  const handleDrop = useCallback((e, weekKey) => {
    e.preventDefault()
    const poolId = e.dataTransfer.getData('text/plain')
    if (poolId && currentPlan) {
      onAssignToWeek(currentPlan.id, poolId, weekKey)
    }
    setDragOverWeek(null)
  }, [currentPlan, onAssignToWeek])

  // 모바일: 탭하여 선택된 주에 추가
  const handleTapAssign = useCallback((poolId) => {
    if (!currentPlan || !selectedWeekKey) return
    onAssignToWeek(currentPlan.id, poolId, selectedWeekKey)
  }, [currentPlan, selectedWeekKey, onAssignToWeek])

  // --- 주 블록 렌더 (데스크톱 타임라인용) ---
  const renderWeekRow = (w) => {
    const lessons = currentPlan ? getLessonsForWeek(currentPlan.id, w.weekKey) : []
    const weekNum = w.weekKey.split('-W')[1]
    const isDragOver = dragOverWeek === w.weekKey

    return (
      <div
        key={w.weekKey}
        onDragOver={(e) => handleDragOver(e, w.weekKey)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, w.weekKey)}
        className={`p-2.5 rounded-xl border transition-all ${
          isDragOver
            ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
            : 'border-white/60 bg-white/40'
        }`}
      >
        {/* 주 헤더 */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-bold text-gray-600">W{weekNum}</span>
          <span className="text-[10px] text-gray-400">
            {w.mondayDate?.slice(5)}~{w.fridayDate?.slice(5)}
          </span>
          {lessons.length > 0 && (
            <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full ml-auto">
              {lessons.length}시간
            </span>
          )}
        </div>

        {/* 배정된 차시 */}
        {lessons.length > 0 ? (
          <div className="space-y-0.5">
            {lessons.map((lp) => (
              <div key={lp.poolId} className="flex items-center gap-1.5 pl-1 group">
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: DOMAIN_DOT[lp.domain] || '#8f8f8f' }}
                />
                <AceBadge phase={lp.acePhase} />
                <span className="text-[11px] text-gray-700 truncate flex-1">
                  {lp.title}
                </span>
                <button
                  onClick={() => onRemoveLessonFromWeek(currentPlan.id, lp.poolId, w.weekKey)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-300 hover:text-[#F57C7C] transition-all shrink-0"
                  title="제거"
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className={`text-center py-2 text-[10px] rounded-lg border-2 border-dashed transition-colors ${
            isDragOver
              ? 'border-primary/40 text-primary'
              : 'border-gray-200/60 text-gray-300'
          }`}>
            {isDragOver ? '여기에 놓기' : '차시를 드래그하세요'}
          </div>
        )}
      </div>
    )
  }

  // --- 차시 카드 렌더 (오른쪽 풀 패널용) ---
  const renderPoolCard = (lp, isMobile = false) => (
    <div
      key={lp.poolId}
      draggable={!isMobile}
      onDragStart={!isMobile ? (e) => handleDragStart(e, lp.poolId) : undefined}
      onClick={isMobile ? () => handleTapAssign(lp.poolId) : undefined}
      className={`flex items-center gap-2.5 px-3 py-2.5 bg-white/70 rounded-xl border border-white/80 transition-all ${
        isMobile
          ? 'active:bg-primary/10 active:border-primary/30 cursor-pointer'
          : 'cursor-grab active:cursor-grabbing hover:shadow-md hover:border-primary/30'
      }`}
    >
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: DOMAIN_DOT[lp.domain] || '#8f8f8f' }}
      />
      <AceBadge phase={lp.acePhase} />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-800 truncate">
          {lp.lesson > 0 && <span className="text-gray-400 mr-0.5">{lp.lesson}.</span>}
          {lp.title || '(제목 없음)'}
        </div>
      </div>
      {isMobile ? (
        <span className="text-primary shrink-0">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </span>
      ) : (
        <span className="text-gray-300 shrink-0" title="드래그">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="6" cy="4" r="1.2"/><circle cx="10" cy="4" r="1.2"/>
            <circle cx="6" cy="8" r="1.2"/><circle cx="10" cy="8" r="1.2"/>
            <circle cx="6" cy="12" r="1.2"/><circle cx="10" cy="12" r="1.2"/>
          </svg>
        </span>
      )}
    </div>
  )

  return (
    <div>
      {/* 학년 탭 */}
      <div className="flex items-center gap-2 mb-3">
        {GRADE_OPTIONS.map((g) => (
          <button
            key={g}
            onClick={() => setSelectedGrade(g)}
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

      {/* 계획 없을 때 */}
      {!currentPlan && (
        <div className="p-6 text-center bg-white/40 rounded-xl border border-white/60">
          <p className="text-sm text-gray-500 mb-4">
            {selectedGrade} 연간 수업 계획이 아직 없습니다
          </p>
          <button
            onClick={() => onCreatePlan({ year: calendarYear, grade: selectedGrade })}
            className="py-2.5 px-5 rounded-lg text-sm font-semibold text-white bg-[#7C9EF5] hover:bg-[#6B8DE4] transition-colors"
          >
            연간 계획 만들기
          </button>
        </div>
      )}

      {/* 계획 있을 때 */}
      {currentPlan && (
        <div className="space-y-3">
          {/* 요약 + 액션 */}
          <div className="flex items-center gap-2">
            {summary && (
              <div className="flex items-center gap-3 text-xs flex-1">
                <span className="text-gray-500">총 <span className="font-bold text-gray-800">{summary.totalLessons}</span></span>
                <span className="text-primary">배정 <span className="font-bold">{summary.assignedCount}</span></span>
                <span className="text-gray-400">미배정 <span className="font-bold">{summary.unassignedCount}</span></span>
              </div>
            )}
            <button
              onClick={() => setShowChart(!showChart)}
              className="text-[10px] text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg"
            >
              {showChart ? '차트 닫기' : '영역분포'}
            </button>
          </div>

          {/* 영역 분포 (토글) */}
          {showChart && (
            <div className="p-3 bg-white/40 rounded-xl border border-white/60">
              <AnnualDomainChart distribution={distribution} />
            </div>
          )}

          {/* 액션 버튼 */}
          <div className="flex items-center gap-2">
            {weeks.length > 0 && (
              <button
                onClick={() => onAutoFillWeeks(currentPlan.id, weeks, weeklyPEHours || 3)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
              >
                자동 배정
              </button>
            )}
            <button
              onClick={() => setManageOpen(true)}
              className="flex-1 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-600 bg-white/40 hover:bg-white/70 transition-colors"
            >
              차시 풀 관리
            </button>
          </div>

          {weeks.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-400">
              설정에서 학사 일정을 등록하면<br/>주차별 타임라인이 표시됩니다
            </div>
          ) : (
            <>
              {/* ─── 데스크톱: 분할 뷰 (sm 이상) ─── */}
              <div className="hidden sm:flex gap-3" style={{ height: '55vh' }}>
                {/* 왼쪽: 주차 타임라인 */}
                <div className="w-1/2 overflow-y-auto pr-1 space-y-4 custom-scroll">
                  {semester1.length > 0 && (
                    <div>
                      <div className="sticky top-0 z-10 flex items-center gap-2 mb-2 py-1 bg-white/80 backdrop-blur-sm">
                        <span className="text-[11px] font-bold text-gray-600">1학기</span>
                        <div className="flex-1 h-px bg-gray-200" />
                      </div>
                      <div className="space-y-1.5">{semester1.map(renderWeekRow)}</div>
                    </div>
                  )}
                  {semester2.length > 0 && (
                    <div>
                      <div className="sticky top-0 z-10 flex items-center gap-2 mb-2 py-1 bg-white/80 backdrop-blur-sm">
                        <span className="text-[11px] font-bold text-gray-600">2학기</span>
                        <div className="flex-1 h-px bg-gray-200" />
                      </div>
                      <div className="space-y-1.5">{semester2.map(renderWeekRow)}</div>
                    </div>
                  )}
                </div>

                {/* 오른쪽: 미배정 차시 풀 */}
                <div className="w-1/2 overflow-y-auto pl-1 custom-scroll">
                  <div className="sticky top-0 z-10 flex items-center gap-2 mb-2 py-1 bg-white/80 backdrop-blur-sm">
                    <span className="text-[11px] font-bold text-gray-600">미배정 차시</span>
                    <span className="text-[10px] text-primary font-semibold">
                      {summary?.unassignedCount || 0}개
                    </span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>

                  {unassignedGroups.length > 0 ? (
                    <div className="space-y-3">
                      {unassignedGroups.map((group) => (
                        <div key={group.key}>
                          <div className="flex items-center gap-1.5 mb-1.5 px-1">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: DOMAIN_DOT[group.domain] || '#8f8f8f' }}
                            />
                            <span className="text-[10px] font-semibold text-gray-500">{group.unitTitle}</span>
                          </div>
                          <div className="space-y-1">
                            {group.lessons.map((lp) => renderPoolCard(lp, false))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-xs text-gray-400">
                      모든 차시가 배정되었습니다
                    </div>
                  )}
                </div>
              </div>

              {/* ─── 모바일: 주차 스트립 + 선택 주 + 차시 카드 ─── */}
              <div className="sm:hidden space-y-3">
                {/* 주차 가로 스크롤 */}
                <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
                  {weeks.map((w) => {
                    const weekNum = w.weekKey.split('-W')[1]
                    const count = currentPlan
                      ? (currentPlan.weekSlots?.[w.weekKey]?.length || 0)
                      : 0
                    const isSelected = selectedWeekKey === w.weekKey

                    return (
                      <button
                        key={w.weekKey}
                        onClick={() => setSelectedWeekKey(w.weekKey)}
                        className={`shrink-0 flex flex-col items-center px-2.5 py-1.5 rounded-xl text-[10px] border transition-colors ${
                          isSelected
                            ? 'bg-primary text-white border-primary'
                            : count > 0
                              ? 'bg-primary/10 text-primary border-primary/20'
                              : 'bg-white/40 text-gray-400 border-white/60'
                        }`}
                      >
                        <span className="font-bold">W{weekNum}</span>
                        {count > 0 && <span className="text-[8px]">{count}시간</span>}
                      </button>
                    )
                  })}
                </div>

                {/* 선택된 주 상세 */}
                {selectedWeekKey && selectedWeekInfo && (
                  <div className="p-3 bg-white/40 rounded-xl border border-primary/20">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-gray-700">
                        W{selectedWeekKey.split('-W')[1]}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {selectedWeekInfo.mondayDate?.slice(5)}~{selectedWeekInfo.fridayDate?.slice(5)}
                      </span>
                      <span className="text-[10px] font-semibold text-primary ml-auto">
                        {selectedWeekLessons.length}시간
                      </span>
                    </div>

                    {selectedWeekLessons.length > 0 ? (
                      <div className="space-y-1">
                        {selectedWeekLessons.map((lp) => (
                          <div key={lp.poolId} className="flex items-center gap-2 px-2 py-1.5 bg-white/60 rounded-lg">
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: DOMAIN_DOT[lp.domain] || '#8f8f8f' }}
                            />
                            <AceBadge phase={lp.acePhase} />
                            <span className="text-[11px] text-gray-700 truncate flex-1">{lp.title}</span>
                            <button
                              onClick={() => onRemoveLessonFromWeek(currentPlan.id, lp.poolId, selectedWeekKey)}
                              className="p-1 text-gray-300 hover:text-[#F57C7C]"
                            >
                              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-3 text-[10px] text-gray-300">
                        아래에서 차시를 탭하여 추가하세요
                      </div>
                    )}
                  </div>
                )}

                {/* 미배정 차시 카드 */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[11px] font-bold text-gray-600">미배정 차시</span>
                    {selectedWeekKey && (
                      <span className="text-[10px] text-primary">
                        탭 → W{selectedWeekKey.split('-W')[1]}에 추가
                      </span>
                    )}
                  </div>

                  {unassignedGroups.length > 0 ? (
                    <div className="space-y-3">
                      {unassignedGroups.map((group) => (
                        <div key={group.key}>
                          <div className="flex items-center gap-1.5 mb-1 px-1">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: DOMAIN_DOT[group.domain] || '#8f8f8f' }}
                            />
                            <span className="text-[10px] font-semibold text-gray-500">{group.unitTitle}</span>
                          </div>
                          <div className="space-y-1">
                            {group.lessons.map((lp) => renderPoolCard(lp, true))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-xs text-gray-400">
                      모든 차시가 배정되었습니다
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* 계획 삭제 */}
          <div className="text-center pt-2">
            <button
              onClick={() => onDeletePlan(currentPlan.id)}
              className="text-[11px] text-gray-300 hover:text-[#F57C7C] transition-colors"
            >
              연간 계획 삭제
            </button>
          </div>
        </div>
      )}

      {/* 차시 풀 관리 모달 (관리 모드 전용) */}
      <LessonPoolPanel
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        plan={currentPlan}
        selectedGrade={selectedGrade}
        targetWeekKey={null}
        onImportTemplate={(templateId) => onImportTemplate(currentPlan?.id, templateId)}
        onRemoveTemplate={(templateId) => onRemoveTemplate(currentPlan?.id, templateId)}
        onToggleIncluded={(poolId) => onToggleIncluded(currentPlan?.id, poolId)}
        onAssignToWeek={(poolId, weekKey) => onAssignToWeek(currentPlan?.id, poolId, weekKey)}
        onAddCustomLesson={(data) => onAddCustomLesson(currentPlan?.id, data)}
      />
    </div>
  )
}
