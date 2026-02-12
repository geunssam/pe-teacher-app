import { useLocalStorage } from './useLocalStorage'
import { generateClassId, generateStudentId } from '../utils/generateId'

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

export function useClassManager() {
  const [classSetup, setClassSetup] = useLocalStorage('pe_class_setup', null)
  const [classes, setClasses] = useLocalStorage('pe_classes', [])
  const [rosters, setRosters] = useLocalStorage('pe_rosters', {})

  /**
   * 학급 설정 초기화 (위저드 Step 1-4 완료 시)
   *
   * @param {object} setup - { schoolLevel, grades: [{grade, count, studentCounts: []}] }
   */
  const initializeClasses = (setup) => {
    const newClasses = []
    const newRosters = {}

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
      }
    })

    setClassSetup(setup)
    setClasses(newClasses)
    setRosters(newRosters)

    return { classes: newClasses, rosters: newRosters }
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
   * 특정 학급의 명단 가져오기
   */
  const getRoster = (classId) => {
    return rosters[classId] || []
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

  return {
    // 상태
    classSetup,
    classes,
    rosters,

    // 초기화
    initializeClasses,
    isSetupComplete,
    resetClassSetup,

    // 조회
    getClass,
    getRoster,
    getClassesByGrade,

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
