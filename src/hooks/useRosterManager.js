// 명단 관리 훅 — 학생 CRUD (추가/삭제/수정/일괄입력) | 부모→useClassManager에서 compose
import { useCallback } from 'react'
import { generateStudentId } from '../utils/generateId'

/**
 * @param {object} deps
 * @param {object} deps.rosters - 전체 명단 상태
 * @param {function} deps.setRosters - 명단 setter
 * @param {function} deps.setClasses - 학급 setter (studentCount 업데이트용)
 * @param {function} deps.syncRosterToFirestore - Firestore 동기화
 * @param {function} deps.syncClassToFirestore - 학급 Firestore 동기화
 */
export function useRosterManager({ rosters, setRosters, setClasses, syncRosterToFirestore, syncClassToFirestore }) {
  const getRoster = (classId) => {
    return rosters[classId] || []
  }

  const updateRoster = useCallback((classId, newRoster) => {
    setRosters((prev) => {
      const next = { ...prev, [classId]: newRoster }
      syncRosterToFirestore(classId, newRoster)
      return next
    })
  }, [setRosters, syncRosterToFirestore])

  const addStudent = useCallback((classId) => {
    const roster = rosters[classId] || []
    const newStudent = {
      id: generateStudentId(),
      num: roster.length + 1,
      name: '',
      gender: '',
      note: '',
    }

    const newRoster = [...roster, newStudent]
    updateRoster(classId, newRoster)

    setClasses((prev) => {
      const next = prev.map((cls) =>
        cls.id === classId
          ? { ...cls, studentCount: cls.studentCount + 1 }
          : cls
      )
      const updated = next.find((cls) => cls.id === classId)
      if (updated) syncClassToFirestore(updated)
      return next
    })
  }, [rosters, updateRoster, setClasses, syncClassToFirestore])

  const removeStudent = useCallback((classId, studentId) => {
    const roster = rosters[classId] || []
    const updatedRoster = roster
      .filter((student) => student.id !== studentId)
      .map((student, index) => ({
        ...student,
        num: index + 1,
      }))

    updateRoster(classId, updatedRoster)

    setClasses((prev) => {
      const next = prev.map((cls) =>
        cls.id === classId
          ? { ...cls, studentCount: updatedRoster.length }
          : cls
      )
      const updated = next.find((cls) => cls.id === classId)
      if (updated) syncClassToFirestore(updated)
      return next
    })
  }, [rosters, updateRoster, setClasses, syncClassToFirestore])

  const updateStudent = useCallback((classId, studentId, updates) => {
    const roster = rosters[classId] || []
    const updatedRoster = roster.map((student) =>
      student.id === studentId ? { ...student, ...updates } : student
    )
    updateRoster(classId, updatedRoster)
  }, [rosters, updateRoster])

  const bulkImportRoster = useCallback((classId, namesText) => {
    const names = namesText
      .split(/[\n,]/)
      .map((name) => name.trim())
      .filter((name) => name.length > 0)

    const roster = rosters[classId] || []
    const updatedRoster = names.map((name, index) => {
      const existingStudent = roster[index]
      if (existingStudent) {
        return { ...existingStudent, name }
      }
      return {
        id: generateStudentId(),
        num: index + 1,
        name,
        gender: '',
        note: '',
      }
    })

    updateRoster(classId, updatedRoster)

    if (updatedRoster.length !== roster.length) {
      setClasses((prev) => {
        const next = prev.map((cls) =>
          cls.id === classId
            ? { ...cls, studentCount: updatedRoster.length }
            : cls
        )
        const updated = next.find((cls) => cls.id === classId)
        if (updated) syncClassToFirestore(updated)
        return next
      })
    }
  }, [rosters, updateRoster, setClasses, syncClassToFirestore])

  return {
    getRoster,
    updateRoster,
    addStudent,
    removeStudent,
    updateStudent,
    bulkImportRoster,
  }
}
