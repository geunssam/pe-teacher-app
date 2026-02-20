// 차시 풀 — 두 가지 모드: pick(주에 추가) / manage(풀 관리) | 부모→WeeklyPlanView
import { useState, useMemo, useEffect } from 'react'
import Modal from '../common/Modal'
import AceBadge from './AceBadge'
import unitTemplatesData from '../../data/curriculum/unitTemplates.json'

const DOMAIN_DOT = {
  '운동': '#F57C7C',
  '스포츠': '#7C9EF5',
  '표현': '#A78BFA',
}

// ─────────────────────────────────────────────
// 모드 1: 주에 차시 추가 피커 (week "+"에서 열림)
// ─────────────────────────────────────────────
function PickMode({ groups, weekNum, onAssignToWeek, targetWeekKey, onSwitchToManage }) {
  if (groups.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="text-3xl mb-3">📭</div>
        <p className="text-sm text-gray-500 mb-1">배정 가능한 차시가 없습니다</p>
        <p className="text-xs text-gray-400 mb-4">
          먼저 차시 풀에서 교육과정을 가져오세요
        </p>
        <button
          onClick={onSwitchToManage}
          className="py-2 px-5 rounded-lg text-xs font-semibold text-white bg-primary"
        >
          차시 풀 관리로 이동
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* 안내 */}
      <div className="text-center text-[11px] text-primary bg-primary/5 rounded-lg px-3 py-2">
        탭하면 <span className="font-bold">W{weekNum}</span>에 바로 추가됩니다
      </div>

      {/* 단원별 그룹 — 미배정만 표시 */}
      {groups.map((group) => (
        <div key={group.key}>
          {/* 단원 헤더 */}
          <div className="flex items-center gap-2 mb-1.5 px-1">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: DOMAIN_DOT[group.domain] || '#8f8f8f' }}
            />
            <span className="text-[11px] font-semibold text-gray-500">{group.unitTitle}</span>
          </div>

          {/* 차시 카드 — 탭으로 바로 추가 */}
          <div className="space-y-1">
            {group.lessons.map((lp) => (
              <button
                key={lp.poolId}
                onClick={() => onAssignToWeek(lp.poolId, targetWeekKey)}
                className="w-full flex items-center gap-3 px-3 py-3 bg-white/60 rounded-xl border border-white/80 hover:bg-primary/5 hover:border-primary/30 active:bg-primary/10 transition-colors text-left"
              >
                <AceBadge phase={lp.acePhase} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-800">
                    {lp.lesson > 0 && (
                      <span className="text-gray-400 mr-1">{lp.lesson}.</span>
                    )}
                    {lp.title || '(제목 없음)'}
                  </div>
                </div>
                <span className="text-primary shrink-0">
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* 하단 관리 링크 */}
      <div className="text-center pt-2">
        <button
          onClick={onSwitchToManage}
          className="text-[11px] text-gray-400 hover:text-primary transition-colors"
        >
          차시 풀 관리 (추가/제외)
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 모드 2: 차시 풀 관리 (템플릿 가져오기 + 포함/제외)
// ─────────────────────────────────────────────
function ManageMode({
  pool,
  groups,
  assignedIds,
  gradeTemplates,
  addedTemplateIds,
  onImportTemplate,
  onRemoveTemplate,
  onToggleIncluded,
  onAddCustomLesson,
}) {
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customTitle, setCustomTitle] = useState('')
  const [customDomain, setCustomDomain] = useState('스포츠')
  const [customPhase, setCustomPhase] = useState('A')

  const includedCount = pool.filter((lp) => lp.included).length
  const excludedCount = pool.filter((lp) => !lp.included).length
  const assignedCount = pool.filter((lp) => lp.included && assignedIds.has(lp.poolId)).length

  const handleAddCustom = (e) => {
    e.preventDefault()
    if (!customTitle.trim()) return
    onAddCustomLesson({
      title: customTitle.trim(),
      domain: customDomain,
      acePhase: customPhase,
    })
    setCustomTitle('')
    setCustomDomain('스포츠')
    setCustomPhase('A')
    setShowCustomForm(false)
  }

  return (
    <div className="space-y-4">
      {/* 요약 */}
      <div className="flex items-center justify-center gap-4 text-xs py-2 bg-gray-50 rounded-xl">
        <span className="text-gray-500">포함 <span className="font-bold text-gray-700">{includedCount}</span></span>
        <span className="text-gray-300">|</span>
        <span className="text-gray-500">배정 <span className="font-bold text-primary">{assignedCount}</span></span>
        <span className="text-gray-300">|</span>
        <span className="text-gray-500">제외 <span className="font-bold text-gray-400">{excludedCount}</span></span>
      </div>

      {/* 설명 */}
      <div className="text-[11px] text-gray-400 bg-gray-50/50 rounded-lg px-3 py-2 leading-relaxed">
        여기서 <strong className="text-gray-600">교육과정을 가져오고</strong>, 올해 안 할 차시는 <strong className="text-gray-600">제외</strong>하세요.<br/>
        포함된 차시만 주간 타임라인에 배정할 수 있습니다.
      </div>

      {/* 템플릿 가져오기 */}
      {gradeTemplates.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-600 mb-2">교육과정 가져오기</h4>
          <div className="space-y-1">
            {gradeTemplates.map((tmpl) => {
              const isAdded = addedTemplateIds.has(tmpl.id)
              return (
                <div key={tmpl.id} className="flex items-center justify-between px-3 py-2.5 bg-white/40 rounded-xl border border-white/60">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: DOMAIN_DOT[tmpl.domain] || '#8f8f8f' }}
                    />
                    <span className="text-xs font-medium text-gray-700 truncate">{tmpl.title}</span>
                    <span className="text-[10px] text-gray-400 shrink-0">{tmpl.totalLessons}차시</span>
                  </div>
                  {isAdded ? (
                    <button
                      onClick={() => onRemoveTemplate(tmpl.id)}
                      className="text-[11px] font-semibold text-[#F57C7C] hover:bg-red-50 px-3 py-1 rounded-lg shrink-0"
                    >
                      제거
                    </button>
                  ) : (
                    <button
                      onClick={() => onImportTemplate(tmpl.id)}
                      className="text-[11px] font-semibold text-white bg-primary hover:bg-primary/80 px-3 py-1 rounded-lg shrink-0"
                    >
                      가져오기
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 차시 목록 — 포함/제외 토글 */}
      {groups.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-600 mb-2">차시 관리</h4>
          <div className="space-y-3">
            {groups.map((group) => (
              <div key={group.key}>
                {/* 단원 헤더 */}
                <div className="flex items-center gap-2 mb-1.5 px-1">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: DOMAIN_DOT[group.domain] || '#8f8f8f' }}
                  />
                  <span className="text-[11px] font-semibold text-gray-500">
                    {group.unitTitle}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {group.lessons.filter((l) => l.included).length}/{group.lessons.length}
                  </span>
                </div>

                {/* 차시 행 */}
                <div className="space-y-0.5">
                  {group.lessons.map((lp) => {
                    const isAssigned = assignedIds.has(lp.poolId)
                    return (
                      <div
                        key={lp.poolId}
                        className={`flex items-center gap-2 px-2.5 py-2 rounded-lg ${
                          !lp.included ? 'opacity-40' : ''
                        }`}
                      >
                        <AceBadge phase={lp.acePhase} />
                        <span className={`text-xs flex-1 min-w-0 truncate ${
                          !lp.included ? 'line-through text-gray-400' : 'text-gray-700'
                        }`}>
                          {lp.lesson > 0 && (
                            <span className="text-gray-400 mr-1">{lp.lesson}.</span>
                          )}
                          {lp.title || '(제목 없음)'}
                        </span>

                        {/* 배정 상태 */}
                        {lp.included && isAssigned && (
                          <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0">
                            배정됨
                          </span>
                        )}

                        {/* 포함/제외 버튼 */}
                        <button
                          onClick={() => onToggleIncluded(lp.poolId)}
                          className={`text-[10px] font-semibold px-2 py-1 rounded-lg shrink-0 transition-colors ${
                            lp.included
                              ? 'text-gray-400 hover:text-[#F57C7C] hover:bg-red-50'
                              : 'text-primary hover:bg-primary/10'
                          }`}
                        >
                          {lp.included ? '제외' : '포함'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 직접 추가 */}
      {!showCustomForm ? (
        <button
          onClick={() => setShowCustomForm(true)}
          className="w-full py-2.5 rounded-xl text-xs font-semibold border-2 border-dashed border-gray-200 text-gray-400 hover:border-primary/40 hover:text-primary transition-colors"
        >
          + 직접 차시 추가
        </button>
      ) : (
        <form onSubmit={handleAddCustom} className="p-3 bg-white/40 rounded-xl border border-white/60 space-y-2">
          <input
            type="text"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder="차시 제목"
            maxLength={40}
            className="w-full py-2 px-3 rounded-lg border border-gray-200 bg-white/60 text-sm focus:outline-none focus:border-primary/50"
            autoFocus
          />
          <div className="flex items-center gap-2">
            <select
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              className="flex-1 py-2 px-3 rounded-lg border border-gray-200 bg-white/60 text-sm focus:outline-none"
            >
              <option value="운동">운동</option>
              <option value="스포츠">스포츠</option>
              <option value="표현">표현</option>
            </select>
            <select
              value={customPhase}
              onChange={(e) => setCustomPhase(e.target.value)}
              className="w-20 py-2 px-3 rounded-lg border border-gray-200 bg-white/60 text-sm focus:outline-none"
            >
              <option value="A">A</option>
              <option value="C">C</option>
              <option value="E">E</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={!customTitle.trim()}
              className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-primary disabled:opacity-40"
            >
              추가
            </button>
            <button
              type="button"
              onClick={() => setShowCustomForm(false)}
              className="py-2 px-4 rounded-lg text-sm font-semibold text-gray-500 bg-gray-100"
            >
              취소
            </button>
          </div>
        </form>
      )}

      {/* 풀이 비었을 때 */}
      {pool.length === 0 && (
        <div className="text-center py-6 text-xs text-gray-400">
          위에서 교육과정을 가져오면 차시 목록이 나타납니다
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────
export default function LessonPoolPanel({
  open,
  onClose,
  plan,
  selectedGrade,
  targetWeekKey,
  onImportTemplate,
  onRemoveTemplate,
  onToggleIncluded,
  onAssignToWeek,
  onAddCustomLesson,
}) {
  const [mode, setMode] = useState(targetWeekKey ? 'pick' : 'manage')

  // 열릴 때 모드 결정
  useEffect(() => {
    if (open) {
      setMode(targetWeekKey ? 'pick' : 'manage')
    }
  }, [open, targetWeekKey])

  const pool = plan?.lessonPool || []

  // 배정 상태
  const assignedIds = useMemo(() => {
    const set = new Set()
    for (const ids of Object.values(plan?.weekSlots || {})) {
      for (const id of ids) set.add(id)
    }
    return set
  }, [plan?.weekSlots])

  // pick 모드용: 미배정 + 포함된 차시만 그룹핑
  const pickGroups = useMemo(() => {
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
  }, [pool, assignedIds])

  // manage 모드용: 전체 차시 그룹핑
  const manageGroups = useMemo(() => {
    const map = new Map()
    for (const lp of pool) {
      const key = lp.sourceTemplateId || `custom_${lp.unitTitle}`
      if (!map.has(key)) {
        map.set(key, { key, unitTitle: lp.unitTitle, domain: lp.domain, lessons: [] })
      }
      map.get(key).lessons.push(lp)
    }
    return Array.from(map.values())
  }, [pool])

  const gradeTemplates = useMemo(() => {
    return (unitTemplatesData?.templates || []).filter((t) => t.grade === selectedGrade)
  }, [selectedGrade])

  const addedTemplateIds = useMemo(() => {
    return new Set(pool.filter((lp) => lp.sourceTemplateId).map((lp) => lp.sourceTemplateId))
  }, [pool])

  if (!open) return null

  const weekNum = targetWeekKey ? targetWeekKey.split('-W')[1] : null

  const title = mode === 'pick'
    ? `W${weekNum}에 차시 추가`
    : '차시 풀 관리'

  return (
    <Modal onClose={onClose} maxWidth="max-w-lg" contentClassName="!p-0 max-h-[80vh] flex flex-col">
      {/* 헤더: 타이틀 + 닫기 */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="닫기"
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* 모드 전환 탭 (targetWeekKey가 있을 때만) */}
      {targetWeekKey && (
        <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1 mx-5 mb-3 shrink-0">
          <button
            onClick={() => setMode('pick')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              mode === 'pick'
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            W{weekNum}에 추가
          </button>
          <button
            onClick={() => setMode('manage')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              mode === 'manage'
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            풀 관리
          </button>
        </div>
      )}

      {/* 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto px-5 pb-5 custom-scroll">
        {mode === 'pick' ? (
          <PickMode
            groups={pickGroups}
            weekNum={weekNum}
            onAssignToWeek={onAssignToWeek}
            targetWeekKey={targetWeekKey}
            onSwitchToManage={() => setMode('manage')}
          />
        ) : (
          <ManageMode
            pool={pool}
            groups={manageGroups}
            assignedIds={assignedIds}
            gradeTemplates={gradeTemplates}
            addedTemplateIds={addedTemplateIds}
            onImportTemplate={onImportTemplate}
            onRemoveTemplate={onRemoveTemplate}
            onToggleIncluded={onToggleIncluded}
            onAddCustomLesson={onAddCustomLesson}
          />
        )}
      </div>
    </Modal>
  )
}
