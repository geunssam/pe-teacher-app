// 초기 설정 마법사 — 6단계: 학교급 → 학교위치 → 학년 → 학급설정 → 시간표 → 별명
// 학급데이터→hooks/useClassManager.js, 위치→hooks/useSettings.js, 시간표→hooks/useSchedule.js
import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { serverTimestamp } from 'firebase/firestore'
import { useClassManager } from '../hooks/useClassManager'
import { useSettings } from '../hooks/useSettings'
import { useSchedule } from '../hooks/useSchedule'
import { useAuthContext } from '../contexts/AuthContext'
import { useLocationPicker } from '../hooks/useLocationPicker'
import { setDocument } from '../services/firestore'
import { getUid } from '../hooks/useDataSource'
import LocationMapPicker from '../components/settings/LocationMapPicker'
import StationPicker from '../components/weather/StationPicker'
import toast from 'react-hot-toast'

const TOTAL_STEPS = 6

// 학교급별 학년 정의
const SCHOOL_LEVELS = {
  elementary: { label: '초등학교', emoji: '🏫', grades: [1, 2, 3, 4, 5, 6] },
  middle: { label: '중학교', emoji: '🏢', grades: [1, 2, 3] },
  high: { label: '고등학교', emoji: '🎓', grades: [1, 2, 3] },
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
  const {
    location,
    detecting,
    showMapPicker,
    pendingLocation,
    nearbyStations,
    stationPickerSource,
    detectCurrentLocation,
    selectFromMap,
    confirmStation,
    cancelStationPicker,
    openMapPicker,
    closeMapPicker,
  } = useLocationPicker()

  const [currentStep, setCurrentStep] = useState(1)
  const [saving, setSaving] = useState(false)

  // Step 1: 학교급
  const [schoolLevel, setSchoolLevel] = useState(null)

  // Step 3: 담당 학년
  const [selectedGrades, setSelectedGrades] = useState([])

  // Step 4: 학급 설정 (합침: 반수 + 기본학생수)
  const [classCount, setClassCount] = useState({})
  const [defaultStudentCount, setDefaultStudentCount] = useState(25)

  // Step 5: 체육 시간표
  const [timetableCells, setTimetableCells] = useState({}) // { "mon-1": classId, ... }
  const [selectedClassForAssign, setSelectedClassForAssign] = useState(null) // 현재 선택된 학급 ID

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
  // Step 2: 학교 위치 (useLocationPicker 훅 사용)
  // =============================================
  const handleStep2Next = () => {
    if (!location.lat || !location.lon) {
      toast.error('학교 위치를 설정해주세요')
      return
    }
    goNext()
  }
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
      // 첫 학급 자동 선택
      if (result.classes?.length) {
        setSelectedClassForAssign(result.classes[0].id)
      }
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
    const currentClassId = timetableCells[cellKey]

    if (currentClassId) {
      // 이미 배정된 셀 클릭 → 해제
      setTimetableCells((prev) => {
        const next = { ...prev }
        delete next[cellKey]
        return next
      })
    } else if (selectedClassForAssign) {
      // 빈 셀 클릭 → 현재 선택된 학급 배정
      setTimetableCells((prev) => ({
        ...prev,
        [cellKey]: selectedClassForAssign,
      }))
    }
  }

  const getClassLabel = (classId) => {
    const cls = createdClasses.find((c) => c.id === classId)
    if (!cls) return ''
    return `${cls.grade}-${cls.classNum}`
  }

  const getClassColor = (classId) => {
    const cls = createdClasses.find((c) => c.id === classId)
    return cls?.color || null
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

        {/* ===== Step 2: 학교 위치 ===== */}
        {currentStep === 2 && (
          <div className="glass-card animate-fade-in">
            <h2 className="text-card-title mb-sm">학교 위치를 설정해주세요</h2>
            <p className="text-caption text-muted mb-lg">
              지도에서 학교를 검색하면 날씨와 대기질 측정소가 자동으로 설정됩니다
            </p>

            {/* 현재 위치 정보 */}
            <div className="p-md bg-white/60 rounded-xl border border-white/80 mb-lg">
              <div className="flex items-start justify-between gap-md mb-md">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-sm mb-xs">
                    <div className="text-primary shrink-0">
                      <LocationIcon />
                    </div>
                    <p className="text-body-bold truncate">
                      {location.address || '위치 미설정'}
                    </p>
                  </div>
                  {location.stationName && (
                    <p className="text-caption text-muted">
                      🌫️ {location.stationName} 측정소 기준
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-sm shrink-0">
                  <button
                    onClick={detectCurrentLocation}
                    disabled={detecting}
                    className="p-2 bg-white/60 hover:bg-white/80 rounded-lg transition-all border border-white/80 disabled:opacity-50"
                    title="현재 위치로 설정"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </button>
                  <button
                    onClick={openMapPicker}
                    className="p-2 bg-white/60 hover:bg-white/80 rounded-lg transition-all border border-white/80"
                    title="지도에서 위치 선택"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                      <line x1="8" y1="2" x2="8" y2="18" />
                      <line x1="16" y1="6" x2="16" y2="22" />
                    </svg>
                  </button>
                </div>
              </div>
              <p className="text-caption text-muted">
                💡 GPS 버튼으로 현재 위치를 감지하거나, 지도 버튼으로 학교를 검색하세요
              </p>
            </div>

            <NavButtons
              onBack={goBack}
              onNext={handleStep2Next}
              nextDisabled={!location.lat || !location.lon}
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
            <p className="text-caption text-muted mb-md">
              학급을 선택하고 셀을 클릭하세요 (다시 클릭하면 해제)
            </p>

            {/* 학급 칩 리스트 */}
            <div className="flex flex-wrap gap-2 mb-md">
              {createdClasses.map((cls) => {
                const isSelected = selectedClassForAssign === cls.id
                const color = cls.color
                return (
                  <button
                    key={cls.id}
                    onClick={() => setSelectedClassForAssign(cls.id)}
                    className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all border-2 ${
                      isSelected
                        ? 'ring-2 ring-offset-1 ring-primary/40 scale-105'
                        : 'opacity-60 hover:opacity-90'
                    }`}
                    style={{
                      backgroundColor: color?.bg || '#DBEAFE',
                      color: color?.text || '#1E40AF',
                      borderColor: isSelected ? (color?.text || '#1E40AF') : 'transparent',
                    }}
                  >
                    {cls.grade}-{cls.classNum}
                  </button>
                )
              })}
            </div>

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
                        const label = assignedClassId ? getClassLabel(assignedClassId) : ''
                        const cellColor = assignedClassId ? getClassColor(assignedClassId) : null

                        return (
                          <td key={cellKey} className="p-0.5">
                            <button
                              onClick={() => handleCellTap(cellKey)}
                              className={`w-full py-2 px-1 rounded-lg text-xs font-medium transition-all border ${
                                assignedClassId
                                  ? 'border-white/60'
                                  : 'bg-surface border-transparent hover:border-primary/20'
                              }`}
                              style={
                                cellColor
                                  ? { backgroundColor: cellColor.bg, color: cellColor.text }
                                  : undefined
                              }
                            >
                              {label || '\u00A0'}
                            </button>
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

      </div>

      {/* ===== 모달들 (최상위 레벨) ===== */}
      {/* 측정소 선택 모달 */}
      {pendingLocation && nearbyStations.length > 0 && (
        <StationPicker
          locationName={pendingLocation.address || pendingLocation.name}
          source={stationPickerSource}
          stations={nearbyStations}
          centerLat={pendingLocation.lat}
          centerLon={pendingLocation.lon}
          onSelect={(station) => confirmStation(station)}
          onCancel={cancelStationPicker}
        />
      )}

      {/* 지도 위치 선택 모달 */}
      {showMapPicker && (
        <LocationMapPicker
          initialLat={location.lat}
          initialLon={location.lon}
          initialAddress={location.address || ''}
          onSelect={selectFromMap}
          onCancel={closeMapPicker}
        />
      )}
    </div>
  )
}
