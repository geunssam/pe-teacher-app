// 학급담임 훅 — 학급 목록, 학생 명단, 수업 기록 CRUD (localStorage 기반) | 사용처→ClassesPage/SchedulePage/HomePage, 저장소→useLocalStorage.js
import { useLocalStorage } from './useLocalStorage'
import { generateClassId, generateRecordId, generateStudentId } from '../utils/generateId'

/**
 * 학급 관리 Hook
 *
 * localStorage 스키마:
 * - pe_class_setup: { schoolLevel, grades: [{grade, count, studentCount}] }
 * - pe_classes: [{ id, grade, classNum, studentCount, color, ... }]
 * - pe_rosters: { classId: [{ id, num, name, gender, ... }] }
 */

// 학급별 색상 프리셋
export const CLASS_COLOR_PRESETS = [
  { name: '분홍색', bg: '#FCE7F3', text: '#9F1239' },
  { name: '파란색', bg: '#DBEAFE', text: '#1E40AF' },
  { name: '초록색', bg: '#D1FAE5', text: '#065F46' },
  { name: '노란색', bg: '#FEF3C7', text: '#92400E' },
  { name: '보라색', bg: '#EDE9FE', text: '#5B21B6' },
  { name: '주황색', bg: '#FFEDD5', text: '#9A3412' },
  { name: '청록색', bg: '#CCFBF1', text: '#115E59' },
  { name: '빨간색', bg: '#FEE2E2', text: '#991B1B' },
]

const toLocalDateString = (value) => {
  if (!value) return ''

  if (value instanceof Date) {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  if (typeof value === 'string') {
    return value.slice(0, 10)
  }

  const fallback = new Date(value)
  if (Number.isNaN(fallback.getTime())) {
    return ''
  }

  return toLocalDateString(fallback)
}

export function useClassManager() {
  const [classSetup, setClassSetup] = useLocalStorage('pe_class_setup', null)
  const [classes, setClasses] = useLocalStorage('pe_classes', [])
  const [rosters, setRosters] = useLocalStorage('pe_rosters', {})
  const [records, setRecords] = useLocalStorage('pe_class_records', {})

  /**
   * 학급 설정 초기화 (위저드 Step 1-4 완료 시)
   *
   * @param {object} setup - { schoolLevel, grades: [{grade, count, studentCounts: []}] }
   */
  const initializeClasses = (setup) => {
    const newClasses = []
    const newRosters = {}
    const newRecords = {}

    // 각 학년의 각 반 생성
    setup.grades.forEach((gradeInfo) => {
      const { grade, count, studentCounts } = gradeInfo

      for (let classNum = 1; classNum <= count; classNum++) {
        const classId = generateClassId()
        const studentCount = studentCounts ? studentCounts[classNum - 1] : 25

        // 학급 생성 (색상은 순환 할당)
        newClasses.push({
          id: classId,
          grade: grade,
          classNum: classNum,
          studentCount: studentCount,
          color: CLASS_COLOR_PRESETS[(newClasses.length) % CLASS_COLOR_PRESETS.length],
          lastActivity: null,
          lastDomain: null,
          lastDate: null,
          createdAt: new Date().toISOString(),
        })

        // 빈 명단 생성 (번호만 할당)
        newRosters[classId] = Array.from({ length: studentCount }, (_, index) => ({
          id: generateStudentId(),
          num: index + 1,
          name: '',
          gender: '',
          note: '',
        }))

        // 수업 기록 배열 초기화
        newRecords[classId] = []
      }
    })

    setClassSetup(setup)
    setClasses(newClasses)
    setRosters(newRosters)
    setRecords(newRecords)

    return { classes: newClasses, rosters: newRosters, records: newRecords }
  }

  /**
   * 학급 설정이 완료되었는지 확인
   */
  const isSetupComplete = () => {
    return classSetup !== null && classes.length > 0
  }

  /**
   * 특정 학급 정보 가져오기
   */
  const getClass = (classId) => {
    return classes.find((cls) => cls.id === classId) || null
  }

  /**
   * 학급 정보 업데이트
   */
  const updateClass = (classId, updates) => {
    setClasses((prev) =>
      prev.map((cls) =>
        cls.id === classId ? { ...cls, ...updates, updatedAt: new Date().toISOString() } : cls
      )
    )
  }

  /**
   * 특정 학급의 명단 가져오기
   */
  const getRoster = (classId) => {
    return rosters[classId] || []
  }

  /**
   * 특정 학급 수업 기록 조회
   */
  const getClassRecords = (classId) => {
    return records[classId] || []
  }

  /**
   * 특정 학급의 수업 기록 수 조회
   */
  const getClassRecordCount = (classId, domain = null) => {
    const classRecords = getClassRecords(classId)

    if (!domain) {
      return classRecords.length
    }

    return classRecords.filter((record) => (record.domain || '스포츠') === domain).length
  }

  /**
   * 특정 학급의 다음 차시 번호 계산
   */
  const getNextLessonSequence = (classId, domain = '스포츠') => {
    return getClassRecordCount(classId, domain) + 1
  }

  /**
   * 수업 기록 추가
   */
  const addClassRecord = (classId, record) => {
    const now = new Date().toISOString()
    const normalizedDomain = record?.domain || '스포츠'
    const recordedAt = record?.recordedAt || toLocalDateString(record?.date)
    const nextSequence = record?.sequence
      ? Number(record.sequence)
      : getNextLessonSequence(classId, normalizedDomain)
    const nextDate = (() => {
      if (!record?.date) return toLocalDateString(now)
      return toLocalDateString(record.date)
    })()

    const nextRecord = {
      id: record?.id || generateRecordId(),
      date: nextDate,
      recordedAt: recordedAt || nextDate,
      createdAt: now,
      classId,
      activity: '수업 활동',
      domain: '스포츠',
      sequence: nextSequence,
      ...record,
      sequence: Number.isFinite(nextSequence) ? nextSequence : getNextLessonSequence(classId, normalizedDomain),
      domain: normalizedDomain,
    }

    setRecords((prev) => ({
      ...prev,
      [classId]: [nextRecord, ...(prev[classId] || [])],
    }))

    setClasses((prev) =>
      prev.map((cls) =>
        cls.id === classId
          ? {
              ...cls,
              lastActivity: nextRecord.activity || cls.lastActivity,
              lastDomain: nextRecord.domain || cls.lastDomain,
              lastSequence: nextRecord.sequence || cls.lastSequence || 0,
              lastDate: nextRecord.date || cls.lastDate,
            }
          : cls
      )
    )
  }

  /**
   * 학급별로 그룹핑된 데이터 가져오기
   */
  const getClassesByGrade = () => {
    const grouped = {}

    classes.forEach((cls) => {
      const gradeKey = cls.grade
      if (!grouped[gradeKey]) {
        grouped[gradeKey] = []
      }
      grouped[gradeKey].push(cls)
    })

    // 각 학년 내에서 반 번호순 정렬
    Object.keys(grouped).forEach((grade) => {
      grouped[grade].sort((a, b) => a.classNum - b.classNum)
    })

    return grouped
  }

  /**
   * 명단 업데이트
   */
  const updateRoster = (classId, newRoster) => {
    setRosters((prev) => ({
      ...prev,
      [classId]: newRoster,
    }))
  }

  /**
   * 학생 추가
   */
  const addStudent = (classId) => {
    const roster = getRoster(classId)
    const newStudent = {
      id: generateStudentId(),
      num: roster.length + 1,
      name: '',
      gender: '',
      note: '',
    }

    updateRoster(classId, [...roster, newStudent])

    // 학급의 studentCount도 업데이트
    setClasses((prev) =>
      prev.map((cls) =>
        cls.id === classId
          ? { ...cls, studentCount: cls.studentCount + 1 }
          : cls
      )
    )
  }

  /**
   * 학생 삭제
   */
  const removeStudent = (classId, studentId) => {
    const roster = getRoster(classId)
    const updatedRoster = roster
      .filter((student) => student.id !== studentId)
      .map((student, index) => ({
        ...student,
        num: index + 1, // 번호 재정렬
      }))

    updateRoster(classId, updatedRoster)

    // 학급의 studentCount도 업데이트
    setClasses((prev) =>
      prev.map((cls) =>
        cls.id === classId
          ? { ...cls, studentCount: updatedRoster.length }
          : cls
      )
    )
  }

  /**
   * 학생 정보 업데이트
   */
  const updateStudent = (classId, studentId, updates) => {
    const roster = getRoster(classId)
    const updatedRoster = roster.map((student) =>
      student.id === studentId ? { ...student, ...updates } : student
    )

    updateRoster(classId, updatedRoster)
  }

  /**
   * 일괄 명단 입력 (줄바꿈 구분)
   */
  const bulkImportRoster = (classId, namesText) => {
    const names = namesText
      .split(/[\n,]/) // 줄바꿈 또는 쉼표로 분리
      .map((name) => name.trim())
      .filter((name) => name.length > 0)

    const roster = getRoster(classId)
    const updatedRoster = names.map((name, index) => {
      // 기존 학생이 있으면 이름만 업데이트, 없으면 새로 생성
      const existingStudent = roster[index]

      if (existingStudent) {
        return { ...existingStudent, name }
      } else {
        return {
          id: generateStudentId(),
          num: index + 1,
          name,
          gender: '',
          note: '',
        }
      }
    })

    updateRoster(classId, updatedRoster)

    // 학생 수가 변경되었으면 학급 정보도 업데이트
    if (updatedRoster.length !== roster.length) {
      setClasses((prev) =>
        prev.map((cls) =>
          cls.id === classId
            ? { ...cls, studentCount: updatedRoster.length }
            : cls
        )
      )
    }
  }

  /**
   * 학급 설정 재설정 (모든 데이터 삭제)
   */
  const resetClassSetup = () => {
    setClassSetup(null)
    setClasses([])
    setRosters({})
    setRecords({})
  }

  /**
   * 학급 색상 가져오기
   */
  const getClassColor = (classId) => {
    const classInfo = classes.find((cls) => cls.id === classId)
    return classInfo?.color || CLASS_COLOR_PRESETS[0]
  }

  /**
   * 학급 색상 변경
   */
  const setClassColor = (classId, color) => {
    setClasses((prev) =>
      prev.map((cls) =>
        cls.id === classId ? { ...cls, color } : cls
      )
    )
  }

  /**
   * 특정 셀(요일+교시+날짜)에 해당하는 수업 기록 찾기
   * 여러 개면 가장 최신(createdAt 기준) 반환
   *
   * @param {string} classId
   * @param {string} day - 요일 키 (mon, tue, ...)
   * @param {number} period - 교시 번호
   * @param {string} classDate - YYYY-MM-DD 형식
   * @returns {object|null} 가장 최근 기록 또는 null
   */
  const findRecordForCell = (classId, day, period, classDate) => {
    const classRecords = getClassRecords(classId)
    if (!classRecords.length) return null

    const matches = classRecords.filter(
      (r) => r.day === day && r.period === period && r.classDate === classDate
    )

    if (!matches.length) return null
    if (matches.length === 1) return matches[0]

    // 여러 개면 가장 최신
    return matches.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))[0]
  }

  return {
    // 상태
    classSetup,
    classes,
    rosters,
    records,

    // 초기화
    initializeClasses,
    isSetupComplete,
    resetClassSetup,

    // 조회
    getClass,
    updateClass,
    getRoster,
    getClassRecords,
    getClassRecordCount,
    getNextLessonSequence,
    addClassRecord,
    getClassesByGrade,
    findRecordForCell,

    // 색상 관리
    getClassColor,
    setClassColor,
    CLASS_COLOR_PRESETS,

    // 명단 관리
    updateRoster,
    addStudent,
    removeStudent,
    updateStudent,
    bulkImportRoster,
  }
}
