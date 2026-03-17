// 모둠 관리 훅 — 모둠 CRUD + 학생 배치 | 부모→useClassManager에서 compose
import { useCallback } from 'react'

/**
 * @param {object} deps
 * @param {object} deps.teams - 전체 모둠 상태 { [classId]: { teamCount, teamNames, assignments } }
 * @param {function} deps.setTeams - 모둠 setter
 * @param {function} deps.syncTeamsToFirestore - Firestore 동기화
 */
export function useTeamManager({ teams, setTeams, syncTeamsToFirestore }) {
  const getTeams = (classId) => {
    return teams[classId] || null
  }

  const saveTeams = useCallback((classId, data) => {
    setTeams((prev) => {
      const next = { ...prev, [classId]: data }
      syncTeamsToFirestore(classId, data)
      return next
    })
  }, [setTeams, syncTeamsToFirestore])

  const setTeamCount = useCallback((classId, count) => {
    const current = teams[classId] || { teamCount: 2, teamNames: [], assignments: [] }
    const clamped = Math.max(2, Math.min(8, count))
    const names = Array.from({ length: clamped }, (_, i) =>
      current.teamNames?.[i] || `${i + 1}모둠`
    )
    // 초과 모둠의 학생은 미배정으로 되돌림
    const assignments = Array.from({ length: clamped }, (_, i) =>
      current.assignments?.[i] || []
    )
    saveTeams(classId, { teamCount: clamped, teamNames: names, assignments })
  }, [teams, saveTeams])

  const setTeamNames = useCallback((classId, names) => {
    const current = teams[classId]
    if (!current) return
    saveTeams(classId, { ...current, teamNames: names })
  }, [teams, saveTeams])

  const assignStudent = useCallback((classId, studentId, groupIndex, rowIndex = -1) => {
    const current = teams[classId]
    if (!current) return

    // 먼저 기존 배치에서 제거
    const newAssignments = current.assignments.map((group) =>
      group.filter((id) => id !== studentId)
    )

    // 새 위치에 배치
    if (groupIndex >= 0 && groupIndex < newAssignments.length) {
      if (rowIndex >= 0 && rowIndex <= newAssignments[groupIndex].length) {
        newAssignments[groupIndex].splice(rowIndex, 0, studentId)
      } else {
        newAssignments[groupIndex].push(studentId)
      }
    }

    saveTeams(classId, { ...current, assignments: newAssignments })
  }, [teams, saveTeams])

  const unassignStudent = useCallback((classId, studentId) => {
    const current = teams[classId]
    if (!current) return

    const newAssignments = current.assignments.map((group) =>
      group.filter((id) => id !== studentId)
    )
    saveTeams(classId, { ...current, assignments: newAssignments })
  }, [teams, saveTeams])

  const getUnassigned = useCallback((classId, roster) => {
    const current = teams[classId]
    if (!current) return roster.map((s) => s.id)

    const assigned = new Set(current.assignments.flat())
    return roster.filter((s) => !assigned.has(s.id)).map((s) => s.id)
  }, [teams])

  const resetTeams = useCallback((classId) => {
    const current = teams[classId]
    if (!current) return
    const emptyAssignments = Array.from({ length: current.teamCount }, () => [])
    saveTeams(classId, { ...current, assignments: emptyAssignments })
  }, [teams, saveTeams])

  return {
    getTeams,
    saveTeams,
    setTeamCount,
    setTeamNames,
    assignStudent,
    unassignStudent,
    getUnassigned,
    resetTeams,
  }
}
