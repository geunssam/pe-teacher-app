// 초기 설정 마법사 — 6단계: 학교급 → 학교위치 → 학년 → 학급설정 → 시간표 → 별명
// 학급데이터→hooks/useClassManager.js, 위치→hooks/useSettings.js, 시간표→hooks/useSchedule.js
import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { serverTimestamp } from 'firebase/firestore'
import { useClassManager } from '../hooks/useClassManager'
import { useSettings } from '../hooks/useSettings'
import { useSchedule } from '../hooks/useSchedule'
import { useAuthContext } from '../contexts/AuthContext'
import { searchPlace } from '../services/naverLocal'
import { findStationsWithFallback } from '../utils/stationFinder'
import { setDocument } from '../services/firestore'
import { getUid } from '../hooks/useDataSource'
import toast from 'react-hot-toast'

const TOTAL_STEPS = 6

// 학교급별 학년 정의
const SCHOOL_LEVELS = {
  elementary: { label: '초등학교', emoji: '🏫', grades: [1, 2, 3, 4, 5, 6] },
  middle: { label: '중학교', emoji: '🏢', grades: [1, 2, 3] },
  high: { label: '고등학교', emoji: '🎓', grades: [1, 2, 3] },
}

const SCHOOL_KEYWORDS = {
  elementary: '초등학교',
  middle: '중학교',
  high: '고등학교',
}

// --- SVG Icons ---
function MinusIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function PlusIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function LocationIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

// --- 진행 표시 바 ---
function ProgressBar({ currentStep }) {
  return (
    <div className="mb-xl">
      <div className="flex items-center justify-between mb-md">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => (
          <div
            key={step}
            className={`flex-1 h-2 rounded-full mx-0.5 transition-all duration-300 ${
              step <= currentStep ? 'bg-primary' : 'bg-surface'
            }`}
          />
        ))}
      </div>
      <p className="text-center text-caption text-muted">
        {currentStep} / {TOTAL_STEPS}
      </p>
    </div>
  )
}

// --- 네비게이션 버튼 ---
function NavButtons({ onBack, onNext, nextLabel = '다음', nextDisabled = false, showSkip = false, onSkip }) {
  return (
    <div className="mt-xl flex items-center justify-between">
      <button onClick={onBack} className="btn btn-ghost">
        이전
      </button>
      <div className="flex items-center gap-sm">
        {showSkip && (
          <button onClick={onSkip} className="btn btn-ghost text-muted">
            나중에 설정
          </button>
        )}
        <button onClick={onNext} disabled={nextDisabled} className="btn btn-primary disabled:opacity-40">
          {nextLabel}
        </button>
      </div>
    </div>
  )
}

// =============================================
// SetupWizard Main Component
// =============================================
export default function SetupWizard() {
  const navigate = useNavigate()
  const { initializeClasses } = useClassManager()
  const { updateLocation } = useSettings()
  const { updateBaseCell, WEEKDAYS, WEEKDAY_LABELS, MAX_PERIODS } = useSchedule()
  const { user } = useAuthContext()

  const [currentStep, setCurrentStep] = useState(1)
  const [saving, setSaving] = useState(false)

  // Step 1: 학교급
  const [schoolLevel, setSchoolLevel] = useState(null)

  // Step 2: 학교 위치
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selectedSchool, setSelectedSchool] = useState(null)

  // Step 3: 담당 학년
  const [selectedGrades, setSelectedGrades] = useState([])

  // Step 4: 학급 설정 (합침: 반수 + 기본학생수)
  const [classCount, setClassCount] = useState({})
  const [defaultStudentCount, setDefaultStudentCount] = useState(25)

  // Step 5: 체육 시간표
  const [timetableCells, setTimetableCells] = useState({}) // { "mon-1": classId, ... }
  const [selectingCell, setSelectingCell] = useState(null) // 현재 선택 중인 셀

  // Step 6: 선생님 별명
  const [nickname, setNickname] = useState('')

  // 생성될 학급 목록 (Step 5에서 사용)
  const [createdClasses, setCreatedClasses] = useState([])

  // --- Step 이동 ---
  const goNext = () => setCurrentStep((s) => Math.min(TOTAL_STEPS, s + 1))
  const goBack = () => setCurrentStep((s) => Math.max(1, s - 1))

  // =============================================
  // Step 1: 학교급 선택
  // =============================================
  const handleStep1Next = () => {
    if (!schoolLevel) {
      toast.error('학교급을 선택해주세요')
      return
    }
    goNext()
  }

  // =============================================
  // Step 2: 학교 위치 검색
  // =============================================
  const handleSchoolSearch = useCallback(async () => {
    const q = searchQuery.trim()
    if (!q) return

    setSearching(true)
    try {
      // schoolLevel 키워드로 보강 (예: "동서" → "동서초등학교")
      const keyword = SCHOOL_KEYWORDS[schoolLevel] || ''
      const hasSchoolKeyword = q.includes('학교') || q.includes('초등') || q.includes('중학') || q.includes('고등')
      const searchQ = hasSchoolKeyword ? q : `${q}${keyword}`

      const results = await searchPlace(searchQ, { enableFallback: true })
      setSearchResults(results.slice(0, 5))
    } catch (err) {
      console.warn('School search failed:', err)
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }, [searchQuery, schoolLevel])

  const handleSelectSchool = useCallback(async (school) => {
    setSelectedSchool(school)

    // 측정소 자동 매칭
    if (school.lat && school.lon) {
      try {
        const stations = await findStationsWithFallback(school.lat, school.lon, school.address || '')
        const stationName = stations?.[0]?.stationName || '대전'

        updateLocation({
          name: school.name,
          address: school.address || school.roadAddress || '',
          lat: school.lat,
          lon: school.lon,
          stationName,
        })
      } catch (err) {
        console.warn('Station matching failed:', err)
        updateLocation({
          name: school.name,
          address: school.address || school.roadAddress || '',
          lat: school.lat,
          lon: school.lon,
          stationName: '대전',
        })
      }
    }
  }, [updateLocation])

  const handleStep2Next = () => goNext()
  const handleStep2Skip = () => goNext()

  // =============================================
  // Step 3: 학년 선택
  // =============================================
  const toggleGrade = (grade) => {
    setSelectedGrades((prev) =>
      prev.includes(grade)
        ? prev.filter((g) => g !== grade)
        : [...prev, grade].sort((a, b) => a - b)
    )
  }

  const handleStep3Next = () => {
    if (selectedGrades.length === 0) {
      toast.error('담당 학년을 하나 이상 선택해주세요')
      return
    }
    // 기본 반 수 설정
    const initial = {}
    selectedGrades.forEach((grade) => {
      initial[grade] = classCount[grade] || 3
    })
    setClassCount(initial)
    goNext()
  }

  // =============================================
  // Step 4: 학급 설정 (반수 + 기본학생수)
  // =============================================
  const adjustClassCount = (grade, delta) => {
    setClassCount((prev) => ({
      ...prev,
      [grade]: Math.max(1, Math.min(15, (prev[grade] || 1) + delta)),
    }))
  }

  const adjustDefaultStudentCount = (delta) => {
    setDefaultStudentCount((prev) => Math.max(1, Math.min(45, prev + delta)))
  }

  const handleStep4Next = async () => {
    // initializeClasses 호출 (async)
    const setup = {
      schoolLevel,
      grades: selectedGrades.map((grade) => ({
        grade,
        count: classCount[grade] || 3,
        studentCounts: Array.from({ length: classCount[grade] || 3 }, () => defaultStudentCount),
      })),
    }

    setSaving(true)
    try {
      const result = await initializeClasses(setup)
      setCreatedClasses(result.classes || [])
      goNext()
    } catch (err) {
      console.error('initializeClasses failed:', err)
      toast.error('학급 생성 중 오류가 발생했습니다')
    } finally {
      setSaving(false)
    }
  }

  // =============================================
  // Step 5: 체육 시간표
  // =============================================
  const handleCellTap = (cellKey) => {
    if (selectingCell === cellKey) {
      // 이미 선택 중이면 해제
      setSelectingCell(null)
    } else {
      setSelectingCell(cellKey)
    }
  }

  const handleAssignClass = (cellKey, classItem) => {
    if (classItem) {
      setTimetableCells((prev) => ({
        ...prev,
        [cellKey]: classItem.id,
      }))
    } else {
      // 해제
      setTimetableCells((prev) => {
        const next = { ...prev }
        delete next[cellKey]
        return next
      })
    }
    setSelectingCell(null)
  }

  const getClassLabel = (classId) => {
    const cls = createdClasses.find((c) => c.id === classId)
    if (!cls) return ''
    return `${cls.grade}-${cls.classNum}`
  }

  const handleStep5Next = () => {
    // 시간표 셀을 useSchedule에 저장
    Object.entries(timetableCells).forEach(([cellKey, classId]) => {
      const cls = createdClasses.find((c) => c.id === classId)
      if (cls) {
        updateBaseCell(cellKey, {
          subject: '체육',
          classId: cls.id,
          grade: cls.grade,
          classNum: cls.classNum,
          label: `${cls.grade}-${cls.classNum}`,
        })
      }
    })
    goNext()
  }

  const handleStep5Skip = () => goNext()

  // =============================================
  // Step 6: 선생님 별명 + 완료
  // =============================================
  const handleComplete = async () => {
    const uid = getUid()
    const displayNickname = nickname.trim() || user?.displayName || '선생님'

    setSaving(true)
    try {
      // Firestore에 nickname + setupCompletedAt 저장
      if (uid) {
        await setDocument(`users/${uid}`, {
          nickname: displayNickname,
          setupCompletedAt: serverTimestamp(),
        }, true)
      }

      toast.success(`${displayNickname}, 환영합니다!`)
      navigate('/')
    } catch (err) {
      console.error('Setup complete failed:', err)
      toast.success('설정이 완료되었습니다!')
      navigate('/')
    } finally {
      setSaving(false)
    }
  }

  // =============================================
  // Render
  // =============================================
  return (
    <div className="page-container">
      <div className="max-w-2xl mx-auto">
        <ProgressBar currentStep={currentStep} />

        {/* ===== Step 1: 학교급 ===== */}
        {currentStep === 1 && (
          <div className="glass-card animate-fade-in">
            <h2 className="text-card-title mb-sm">학교급을 선택해주세요</h2>
            <p className="text-caption text-muted mb-lg">체육 수업을 진행하시는 학교를 알려주세요</p>

            <div className="grid grid-cols-1 gap-md">
              {Object.entries(SCHOOL_LEVELS).map(([key, { label, emoji }]) => (
                <button
                  key={key}
                  onClick={() => setSchoolLevel(key)}
                  className={`p-lg rounded-xl border-2 transition-all flex items-center gap-md ${
                    schoolLevel === key
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <span className="text-2xl">{emoji}</span>
                  <span className="text-body-bold">{label}</span>
                </button>
              ))}
            </div>

            <div className="mt-xl flex justify-end">
              <button onClick={handleStep1Next} className="btn btn-primary">
                다음
              </button>
            </div>
          </div>
        )}

        {/* ===== Step 2: 학교 위치 검색 ===== */}
        {currentStep === 2 && (
          <div className="glass-card animate-fade-in">
            <h2 className="text-card-title mb-sm">학교를 검색해주세요</h2>
            <p className="text-caption text-muted mb-lg">
              학교 이름으로 검색하면 날씨 정보와 대기질 측정소가 자동으로 설정됩니다
            </p>

            {/* 검색 입력 */}
            <div className="flex gap-sm mb-md">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSchoolSearch()}
                  placeholder={`${SCHOOL_KEYWORDS[schoolLevel] || '학교'} 이름 입력`}
                  className="w-full px-md py-sm pr-10 bg-surface border border-border rounded-xl
                             text-body focus:outline-none focus:border-primary transition-colors"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
                  <SearchIcon />
                </div>
              </div>
              <button
                onClick={handleSchoolSearch}
                disabled={searching || !searchQuery.trim()}
                className="btn btn-primary disabled:opacity-40"
              >
                {searching ? '검색중...' : '검색'}
              </button>
            </div>

            {/* 검색 결과 */}
            {searchResults.length > 0 && (
              <div className="space-y-sm mb-md max-h-64 overflow-y-auto">
                {searchResults.map((result, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectSchool(result)}
                    className={`w-full text-left p-md rounded-xl border transition-all ${
                      selectedSchool?.name === result.name && selectedSchool?.lat === result.lat
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-sm">
                      <div className="mt-0.5 text-primary shrink-0">
                        <LocationIcon />
                      </div>
                      <div className="min-w-0">
                        <p className="text-body-bold truncate">{result.name}</p>
                        <p className="text-caption text-muted truncate">
                          {result.roadAddress || result.address}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* 선택 완료 안내 */}
            {selectedSchool && (
              <div className="p-md bg-success/10 border border-success/30 rounded-xl mb-md">
                <p className="text-body-bold text-success">
                  {selectedSchool.name}
                </p>
                <p className="text-caption text-success/80">
                  위치가 설정되었습니다
                </p>
              </div>
            )}

            <NavButtons
              onBack={goBack}
              onNext={handleStep2Next}
              showSkip
              onSkip={handleStep2Skip}
            />
          </div>
        )}

        {/* ===== Step 3: 담당 학년 선택 ===== */}
        {currentStep === 3 && (
          <div className="glass-card animate-fade-in">
            <h2 className="text-card-title mb-sm">담당 학년을 선택해주세요</h2>
            <p className="text-caption text-muted mb-lg">복수 선택 가능합니다</p>

            <div className="grid grid-cols-3 gap-md">
              {SCHOOL_LEVELS[schoolLevel]?.grades.map((grade) => (
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

            <NavButtons onBack={goBack} onNext={handleStep3Next} />
          </div>
        )}

        {/* ===== Step 4: 학급 설정 (반수 + 기본학생수) ===== */}
        {currentStep === 4 && (
          <div className="glass-card animate-fade-in">
            <h2 className="text-card-title mb-sm">학급을 설정해주세요</h2>
            <p className="text-caption text-muted mb-lg">
              학년별 반 수와 기본 학생 수를 지정합니다
            </p>

            {/* 학년별 반 수 */}
            <div className="space-y-sm mb-lg">
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
                      <MinusIcon />
                    </button>
                    <span className="text-body-bold w-12 text-center">
                      {classCount[grade] || 3}반
                    </span>
                    <button
                      onClick={() => adjustClassCount(grade, 1)}
                      className="btn-icon bg-white hover:bg-primary/10"
                    >
                      <PlusIcon />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 기본 학생 수 */}
            <div className="p-md bg-primary/5 border border-primary/20 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-body-bold">기본 학생 수</p>
                  <p className="text-caption text-muted">모든 학급에 동일 적용 (나중에 개별 조정 가능)</p>
                </div>
                <div className="flex items-center gap-md">
                  <button
                    onClick={() => adjustDefaultStudentCount(-1)}
                    className="btn-icon bg-white hover:bg-primary/10"
                  >
                    <MinusIcon />
                  </button>
                  <span className="text-body-bold w-12 text-center">{defaultStudentCount}명</span>
                  <button
                    onClick={() => adjustDefaultStudentCount(1)}
                    className="btn-icon bg-white hover:bg-primary/10"
                  >
                    <PlusIcon />
                  </button>
                </div>
              </div>
            </div>

            <NavButtons
              onBack={goBack}
              onNext={handleStep4Next}
              nextLabel={saving ? '생성 중...' : '다음'}
              nextDisabled={saving}
            />
          </div>
        )}

        {/* ===== Step 5: 체육 시간표 ===== */}
        {currentStep === 5 && (
          <div className="glass-card animate-fade-in">
            <h2 className="text-card-title mb-sm">체육 시간표를 설정해주세요</h2>
            <p className="text-caption text-muted mb-lg">
              체육 수업이 있는 셀을 탭하고 학급을 선택하세요
            </p>

            {/* 시간표 그리드 */}
            <div className="overflow-x-auto mb-md">
              <table className="w-full border-collapse text-center text-caption">
                <thead>
                  <tr>
                    <th className="p-1.5 text-muted font-medium w-10">교시</th>
                    {WEEKDAYS.map((day) => (
                      <th key={day} className="p-1.5 text-muted font-medium">
                        {WEEKDAY_LABELS[day]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: MAX_PERIODS }, (_, i) => i + 1).map((period) => (
                    <tr key={period}>
                      <td className="p-1 text-muted font-medium">{period}</td>
                      {WEEKDAYS.map((day) => {
                        const cellKey = `${day}-${period}`
                        const assignedClassId = timetableCells[cellKey]
                        const isSelecting = selectingCell === cellKey
                        const label = assignedClassId ? getClassLabel(assignedClassId) : ''

                        return (
                          <td key={cellKey} className="p-0.5 relative">
                            <button
                              onClick={() => handleCellTap(cellKey)}
                              className={`w-full py-2 px-1 rounded-lg text-xs font-medium transition-all ${
                                assignedClassId
                                  ? 'bg-primary/15 text-primary border border-primary/30'
                                  : isSelecting
                                    ? 'bg-primary/5 border border-primary/40 ring-1 ring-primary/20'
                                    : 'bg-surface border border-transparent hover:border-primary/20'
                              }`}
                            >
                              {label || '\u00A0'}
                            </button>

                            {/* 학급 선택 드롭다운 */}
                            {isSelecting && (
                              <div className="absolute top-full left-0 z-50 mt-1 w-28 bg-white
                                              border border-border rounded-xl shadow-lg py-1 animate-fade-in">
                                {/* 해제 옵션 */}
                                {assignedClassId && (
                                  <button
                                    onClick={() => handleAssignClass(cellKey, null)}
                                    className="w-full text-left px-3 py-1.5 text-xs text-danger hover:bg-danger/5"
                                  >
                                    해제
                                  </button>
                                )}
                                {createdClasses.map((cls) => (
                                  <button
                                    key={cls.id}
                                    onClick={() => handleAssignClass(cellKey, cls)}
                                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-primary/5 ${
                                      assignedClassId === cls.id ? 'text-primary font-bold' : ''
                                    }`}
                                  >
                                    {cls.grade}-{cls.classNum}
                                  </button>
                                ))}
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

            {/* 설정된 셀 수 안내 */}
            {Object.keys(timetableCells).length > 0 && (
              <p className="text-caption text-primary mb-md">
                체육 수업 {Object.keys(timetableCells).length}개 설정됨
              </p>
            )}

            <NavButtons
              onBack={goBack}
              onNext={handleStep5Next}
              showSkip
              onSkip={handleStep5Skip}
            />
          </div>
        )}

        {/* ===== Step 6: 선생님 별명 ===== */}
        {currentStep === 6 && (
          <div className="glass-card animate-fade-in">
            <h2 className="text-card-title mb-sm">선생님 이름을 알려주세요</h2>
            <p className="text-caption text-muted mb-lg">
              앱에서 사용할 이름이나 별명을 입력해주세요
            </p>

            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={user?.displayName || '예: 김체육 선생님'}
              className="w-full px-lg py-md bg-surface border border-border rounded-xl
                         text-body focus:outline-none focus:border-primary transition-colors mb-md"
              maxLength={20}
            />

            <p className="text-caption text-muted mb-lg">
              비워두시면 Google 계정 이름({user?.displayName || '이름 없음'})으로 설정됩니다
            </p>

            <div className="mt-xl flex items-center justify-between">
              <button onClick={goBack} className="btn btn-ghost">
                이전
              </button>
              <button
                onClick={handleComplete}
                disabled={saving}
                className="btn btn-primary disabled:opacity-40"
              >
                {saving ? '저장 중...' : '시작하기'}
              </button>
            </div>
          </div>
        )}

        {/* 셀 선택 중일 때 배경 오버레이 (드롭다운 닫기) */}
        {selectingCell && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setSelectingCell(null)}
          />
        )}
      </div>
    </div>
  )
}
