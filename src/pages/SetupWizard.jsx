// 초기 설정 마법사 — 첫 진입 시 학교급 → 학년 → 학급수 → 학생수 설정 | 학급데이터→hooks/useClassManager.js, 진입조건→App.jsx(ProtectedRoute)
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClassManager } from '../hooks/useClassManager'
import toast from 'react-hot-toast'

// 학교급별 학년 정의
const SCHOOL_LEVELS = {
  elementary: { label: '초등학교', grades: [1, 2, 3, 4, 5, 6] },
  middle: { label: '중학교', grades: [1, 2, 3] },
  high: { label: '고등학교', grades: [1, 2, 3] },
}

export default function SetupWizard() {
  const navigate = useNavigate()
  const { initializeClasses } = useClassManager()

  // 위저드 단계
  const [currentStep, setCurrentStep] = useState(1)

  // Step 1: 학교급
  const [schoolLevel, setSchoolLevel] = useState(null)

  // Step 2: 담당 학년 (복수 선택)
  const [selectedGrades, setSelectedGrades] = useState([])

  // Step 3: 학년별 반 수
  const [classCount, setClassCount] = useState({})

  // Step 4: 학급별 학생 수
  const [studentCounts, setStudentCounts] = useState({})

  // Step 1 -> Step 2
  const handleSchoolLevelNext = () => {
    if (!schoolLevel) {
      toast.error('학교급을 선택해주세요')
      return
    }
    setCurrentStep(2)
  }

  // Step 2 -> Step 3
  const handleGradesNext = () => {
    if (selectedGrades.length === 0) {
      toast.error('담당 학년을 하나 이상 선택해주세요')
      return
    }

    // 선택된 학년의 기본 반 수 설정 (3반)
    const initialCounts = {}
    selectedGrades.forEach((grade) => {
      initialCounts[grade] = 3
    })
    setClassCount(initialCounts)

    setCurrentStep(3)
  }

  // Step 3 -> Step 4
  const handleClassCountNext = () => {
    // 학급별 기본 학생 수 설정 (25명)
    const initialStudentCounts = {}
    selectedGrades.forEach((grade) => {
      const count = classCount[grade]
      for (let i = 1; i <= count; i++) {
        const key = `${grade}-${i}`
        initialStudentCounts[key] = 25
      }
    })
    setStudentCounts(initialStudentCounts)

    setCurrentStep(4)
  }

  // Step 4 완료
  const handleComplete = () => {
    // 최종 설정 데이터 생성
    const setup = {
      schoolLevel: schoolLevel,
      grades: selectedGrades.map((grade) => {
        // 해당 학년의 각 반별 학생 수 배열
        const classCounts = []
        for (let i = 1; i <= classCount[grade]; i++) {
          const key = `${grade}-${i}`
          classCounts.push(studentCounts[key] || 25)
        }

        return {
          grade: grade,
          count: classCount[grade],
          studentCounts: classCounts, // 학급별 학생 수 배열
        }
      }),
    }

    // 학급 초기화
    initializeClasses(setup)

    // localStorage 저장 완료를 위한 약간의 지연
    setTimeout(() => {
      toast.success('학급 설정이 완료되었습니다!')
      navigate('/')
    }, 100)
  }

  // 이전 단계
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  // 학년 토글
  const toggleGrade = (grade) => {
    if (selectedGrades.includes(grade)) {
      setSelectedGrades(selectedGrades.filter((g) => g !== grade))
    } else {
      setSelectedGrades([...selectedGrades, grade].sort((a, b) => a - b))
    }
  }

  // 반 수 조정
  const adjustClassCount = (grade, delta) => {
    const current = classCount[grade] || 1
    const newCount = Math.max(1, Math.min(15, current + delta))
    setClassCount({ ...classCount, [grade]: newCount })
  }

  // 학생 수 조정
  const adjustStudentCount = (key, delta) => {
    const current = studentCounts[key] || 25
    const newCount = Math.max(1, Math.min(45, current + delta))
    setStudentCounts({ ...studentCounts, [key]: newCount })
  }

  return (
    <div className="page-container">
      <div className="max-w-2xl mx-auto">
        {/* 진행 표시 */}
        <div className="mb-xl">
          <div className="flex items-center justify-between mb-md">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`flex-1 h-2 rounded-full mx-1 transition-all ${
                  step <= currentStep ? 'bg-primary' : 'bg-surface'
                }`}
              />
            ))}
          </div>
          <p className="text-center text-caption text-muted">
            Step {currentStep} / 4
          </p>
        </div>

        {/* Step 1: 학교급 선택 */}
        {currentStep === 1 && (
          <div className="glass-card animate-fade-in">
            <h2 className="text-card-title mb-lg">학교급을 선택해주세요</h2>

            <div className="grid grid-cols-1 gap-md">
              {Object.entries(SCHOOL_LEVELS).map(([key, { label }]) => (
                <button
                  key={key}
                  onClick={() => setSchoolLevel(key)}
                  className={`p-lg rounded-xl border-2 transition-all ${
                    schoolLevel === key
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <span className="text-body-bold">{label}</span>
                </button>
              ))}
            </div>

            <div className="mt-xl flex justify-end">
              <button onClick={handleSchoolLevelNext} className="btn btn-primary">
                다음
              </button>
            </div>
          </div>
        )}

        {/* Step 2: 담당 학년 선택 */}
        {currentStep === 2 && (
          <div className="glass-card animate-fade-in">
            <h2 className="text-card-title mb-lg">담당 학년을 선택해주세요 (복수 선택 가능)</h2>

            <div className="grid grid-cols-3 gap-md">
              {SCHOOL_LEVELS[schoolLevel].grades.map((grade) => (
                <button
                  key={grade}
                  onClick={() => toggleGrade(grade)}
                  className={`p-lg rounded-xl border-2 transition-all ${
                    selectedGrades.includes(grade)
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <span className="text-body-bold">{grade}학년</span>
                </button>
              ))}
            </div>

            <div className="mt-xl flex justify-between">
              <button onClick={handleBack} className="btn btn-ghost">
                이전
              </button>
              <button onClick={handleGradesNext} className="btn btn-primary">
                다음
              </button>
            </div>
          </div>
        )}

        {/* Step 3: 학년별 반 수 설정 */}
        {currentStep === 3 && (
          <div className="glass-card animate-fade-in">
            <h2 className="text-card-title mb-lg">학년별 반 수를 설정해주세요</h2>

            <div className="space-y-md">
              {selectedGrades.map((grade) => (
                <div
                  key={grade}
                  className="flex items-center justify-between p-md bg-surface rounded-lg"
                >
                  <span className="text-body-bold">{grade}학년</span>

                  <div className="flex items-center gap-md">
                    <button
                      onClick={() => adjustClassCount(grade, -1)}
                      className="btn-icon bg-white hover:bg-primary/10"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                    </button>

                    <span className="text-body-bold w-12 text-center">
                      {classCount[grade] || 1}반
                    </span>

                    <button
                      onClick={() => adjustClassCount(grade, 1)}
                      className="btn-icon bg-white hover:bg-primary/10"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-xl flex justify-between">
              <button onClick={handleBack} className="btn btn-ghost">
                이전
              </button>
              <button onClick={handleClassCountNext} className="btn btn-primary">
                다음
              </button>
            </div>
          </div>
        )}

        {/* Step 4: 학급별 학생 수 설정 */}
        {currentStep === 4 && (
          <div className="glass-card animate-fade-in">
            <h2 className="text-card-title mb-lg">학급별 학생 수를 조정해주세요</h2>
            <p className="text-caption text-muted mb-lg">
              기본값은 25명입니다. 필요시 조정하세요.
            </p>

            <div className="space-y-lg max-h-96 overflow-y-auto">
              {selectedGrades.map((grade) => (
                <div key={grade}>
                  <h3 className="text-body-bold mb-md">{grade}학년</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: classCount[grade] }, (_, i) => i + 1).map((classNum) => {
                      const key = `${grade}-${classNum}`
                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between gap-1 px-2 py-1.5 bg-surface rounded-lg"
                        >
                          <span className="text-caption font-semibold">{classNum}반</span>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => adjustStudentCount(key, -1)}
                              className="w-6 h-6 flex items-center justify-center rounded bg-white hover:bg-primary/10 transition-all"
                            >
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                              </svg>
                            </button>

                            <span className="text-caption font-semibold w-8 text-center">
                              {studentCounts[key] || 25}
                            </span>

                            <button
                              onClick={() => adjustStudentCount(key, 1)}
                              className="w-6 h-6 flex items-center justify-center rounded bg-white hover:bg-primary/10 transition-all"
                            >
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                              </svg>
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-xl flex justify-between">
              <button onClick={handleBack} className="btn btn-ghost">
                이전
              </button>
              <button onClick={handleComplete} className="btn btn-primary">
                완료
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
