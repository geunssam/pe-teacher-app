// 모둠 편집 모달 — PEPick class-team-modal 이식 | 부모→ClassesPage.jsx, 데이터→useClassManager
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Modal from '../common/Modal'
import { useClassManager } from '../../hooks/useClassManager'
import StudentPill from './StudentPill'
import toast from 'react-hot-toast'

export default function TeamEditModal({ classInfo, onClose }) {
  const {
    getRoster,
    getTeams,
    saveTeams,
    setTeamCount: hookSetTeamCount,
    setTeamNames: hookSetTeamNames,
    assignStudent: hookAssignStudent,
    unassignStudent: hookUnassignStudent,
    getUnassigned: hookGetUnassigned,
    resetTeams: hookResetTeams,
  } = useClassManager()

  const roster = getRoster(classInfo.id)
  const rosterMap = useMemo(() => {
    const map = {}
    roster.forEach((s) => { map[s.id] = s })
    return map
  }, [roster])

  // 로컬 상태 (저장 전까지 로컬에서만 관리)
  const [teamCount, setTeamCount] = useState(4)
  const [teamNames, setTeamNames] = useState([])
  const [assignments, setAssignments] = useState([])
  const [activeGroup, setActiveGroup] = useState(-1) // 탭 배정용 활성 모둠

  // 드래그앤드롭
  const dragRef = useRef({ studentId: null, fromGroup: -1, fromRow: -1 })

  // 초기 로드
  useEffect(() => {
    const existing = getTeams(classInfo.id)
    if (existing) {
      setTeamCount(existing.teamCount)
      setTeamNames([...existing.teamNames])
      setAssignments(existing.assignments.map((g) => [...g]))
    } else {
      const count = 4
      setTeamCount(count)
      setTeamNames(Array.from({ length: count }, (_, i) => `${i + 1}모둠`))
      setAssignments(Array.from({ length: count }, () => []))
    }
  }, [classInfo.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // 미배정 학생 계산
  const assignedSet = useMemo(() => {
    const set = new Set()
    assignments.forEach((g) => g.forEach((id) => set.add(id)))
    return set
  }, [assignments])

  const unassignedStudents = useMemo(() =>
    roster.filter((s) => !assignedSet.has(s.id)),
    [roster, assignedSet]
  )

  // 모둠당 최대 인원 (균등 분배 기준)
  const maxPerGroup = Math.ceil(roster.length / teamCount)

  // 모둠 수 변경
  const handleTeamCountChange = (delta) => {
    const newCount = Math.max(2, Math.min(8, teamCount + delta))
    setTeamCount(newCount)
    setTeamNames((prev) =>
      Array.from({ length: newCount }, (_, i) => prev[i] || `${i + 1}모둠`)
    )
    setAssignments((prev) => {
      // 초과 모둠의 학생은 풀로 되돌림
      const next = Array.from({ length: newCount }, (_, i) => prev[i] ? [...prev[i]] : [])
      return next
    })
  }

  // 모둠 이름 변경
  const handleNameChange = (index, value) => {
    setTeamNames((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  // 드래그 시작
  const handleDragStart = (studentId, fromGroup = -1, fromRow = -1) => (e) => {
    dragRef.current = { studentId, fromGroup, fromRow }
    e.dataTransfer.effectAllowed = 'move'
  }

  // 셀에 드롭
  const handleDropToCell = (groupIndex, rowIndex = -1) => (e) => {
    e.preventDefault()
    const { studentId, fromGroup } = dragRef.current
    if (!studentId) return

    setAssignments((prev) => {
      const next = prev.map((g) => g.filter((id) => id !== studentId))
      if (rowIndex >= 0 && rowIndex <= next[groupIndex].length) {
        next[groupIndex].splice(rowIndex, 0, studentId)
      } else {
        next[groupIndex].push(studentId)
      }
      return next
    })
    dragRef.current = { studentId: null, fromGroup: -1, fromRow: -1 }
  }

  // 미배정 풀에 드롭
  const handleDropToPool = (e) => {
    e.preventDefault()
    const { studentId } = dragRef.current
    if (!studentId) return
    setAssignments((prev) => prev.map((g) => g.filter((id) => id !== studentId)))
    dragRef.current = { studentId: null, fromGroup: -1, fromRow: -1 }
  }

  // 탭 배정: 미배정 학생 클릭 → 활성 모둠에 배치
  const handleUnassignedClick = (studentId) => {
    if (activeGroup >= 0) {
      setAssignments((prev) => {
        const next = prev.map((g) => [...g])
        next[activeGroup].push(studentId)
        return next
      })
    }
  }

  // 배치 해제
  const handleUnassign = (studentId) => {
    setAssignments((prev) => prev.map((g) => g.filter((id) => id !== studentId)))
  }

  // 초기화
  const handleReset = () => {
    setAssignments(Array.from({ length: teamCount }, () => []))
    toast.success('모둠 배치가 초기화되었습니다')
  }

  // 저장
  const handleSave = () => {
    saveTeams(classInfo.id, { teamCount, teamNames, assignments })
    toast.success('모둠이 저장되었습니다')
    onClose()
  }

  // 모둠 테이블의 최대 행 수
  const maxRows = Math.max(maxPerGroup, ...assignments.map((g) => g.length), 1)

  return (
    <Modal onClose={onClose} maxWidth="max-w-2xl" contentClassName="!p-0 max-h-[85vh] flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-5 border-b border-primary/15">
        <div>
          <h2 className="text-card-title">
            {classInfo.grade}학년 {classInfo.classNum}반 — 모둠 편집
          </h2>
          <p className="text-caption text-muted mt-0.5">
            학생 {roster.length}명 · 미배정 {unassignedStudents.length}명
          </p>
        </div>
        <button onClick={onClose} className="btn-icon hover:bg-danger/10">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto p-5">
        {/* 모둠 설정 */}
        <div className="flex flex-wrap items-center gap-4 mb-4">
          {/* 모둠 수 스테퍼 */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">모둠 수</span>
            <div className="flex items-center gap-1 bg-white/80 rounded-lg border border-gray-200/60 px-1">
              <button onClick={() => handleTeamCountChange(-1)} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-primary transition-colors font-bold">−</button>
              <span className="w-8 text-center font-semibold text-sm">{teamCount}</span>
              <button onClick={() => handleTeamCountChange(1)} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-primary transition-colors font-bold">+</button>
            </div>
          </div>

          {/* 모둠당 인원 표시 */}
          <span className="text-xs text-muted">
            모둠당 약 {Math.floor(roster.length / teamCount)}~{Math.ceil(roster.length / teamCount)}명
          </span>
        </div>

        {/* 모둠 이름 입력 그리드 */}
        <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: `repeat(${Math.min(teamCount, 4)}, 1fr)` }}>
          {teamNames.map((name, i) => (
            <input
              key={i}
              type="text"
              value={name}
              onChange={(e) => handleNameChange(i, e.target.value)}
              className="py-1.5 px-2 bg-white/80 border border-gray-200/60 rounded-lg text-xs text-center font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          ))}
        </div>

        {/* 미배정 학생 풀 */}
        <div
          className="p-3 rounded-lg border border-primary/20 bg-primary/[0.03] mb-4 min-h-[48px]"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDropToPool}
        >
          <div className="text-xs font-semibold text-gray-500 mb-2">
            미배정 ({unassignedStudents.length}명)
            {activeGroup >= 0 && (
              <span className="ml-2 text-primary">
                — 클릭하면 [{teamNames[activeGroup]}]에 배정
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
            {unassignedStudents.map((student) => (
              <StudentPill
                key={student.id}
                student={student}
                draggable
                onClick={() => handleUnassignedClick(student.id)}
                onDragStart={handleDragStart(student.id)}
              />
            ))}
            {unassignedStudents.length === 0 && (
              <span className="text-xs text-muted py-1">모든 학생이 배정되었습니다</span>
            )}
          </div>
        </div>

        {/* 모둠별 배치 테이블 */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {teamNames.map((name, gi) => (
                  <th
                    key={gi}
                    onClick={() => setActiveGroup(activeGroup === gi ? -1 : gi)}
                    className={`px-2 py-2 text-xs font-semibold cursor-pointer transition-all border-b-2 ${
                      activeGroup === gi
                        ? 'text-primary border-primary'
                        : 'text-gray-600 border-transparent hover:text-primary/70'
                    }`}
                    style={activeGroup === gi ? { backgroundColor: 'rgba(124,158,245,0.08)' } : { backgroundColor: 'rgba(124,158,245,0.03)' }}
                  >
                    {name}
                    <span className="block text-[10px] font-normal text-gray-400">
                      {assignments[gi]?.length || 0}명
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: maxRows }, (_, rowIdx) => (
                <tr key={rowIdx}>
                  {assignments.map((group, gi) => {
                    const studentId = group[rowIdx]
                    const student = studentId ? rosterMap[studentId] : null

                    return (
                      <td
                        key={gi}
                        className="p-1 text-center align-top"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDropToCell(gi, rowIdx)}
                      >
                        {student ? (
                          <div className="relative group/cell">
                            <StudentPill
                              student={student}
                              draggable
                              onDragStart={handleDragStart(student.id, gi, rowIdx)}
                              onRemove={() => handleUnassign(student.id)}
                            />
                          </div>
                        ) : (
                          <div
                            className="h-7 border border-dashed border-gray-200/60 rounded-lg flex items-center justify-center text-gray-300 text-[10px]"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDropToCell(gi, rowIdx)}
                          >
                            +
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="flex gap-2 p-5 border-t border-primary/15">
        <button
          onClick={handleReset}
          className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-red-200 text-red-500 hover:bg-red-50 transition-all"
        >
          초기화
        </button>
        <div className="flex-1" />
        <button
          onClick={onClose}
          className="px-5 py-2.5 rounded-xl text-xs font-semibold transition-all hover:brightness-[0.94]"
          style={{ backgroundColor: '#fce4ec', color: '#c0392b' }}
        >
          취소
        </button>
        <button
          onClick={handleSave}
          className="px-5 py-2.5 rounded-xl text-xs font-semibold transition-all hover:brightness-[0.94]"
          style={{ backgroundColor: '#d6eaf8', color: '#2471a3' }}
        >
          저장
        </button>
      </div>
    </Modal>
  )
}
