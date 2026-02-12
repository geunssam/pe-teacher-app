import { useState } from 'react'
import { useSchedule, getWeekRange } from '../hooks/useSchedule'
import { useClassManager, CLASS_COLOR_PRESETS } from '../hooks/useClassManager'
import ScheduleGrid from '../components/schedule/ScheduleGrid'
import BulkScheduleSetup from '../components/schedule/BulkScheduleSetup'
import toast from 'react-hot-toast'
import { confirm } from '../components/common/ConfirmDialog'

export default function SchedulePage() {
  const {
    getTimetableForWeek,
    updateBaseCell,
    deleteBaseCell,
    setWeekOverride,
    clearSchedule,
    isEmpty
  } = useSchedule()
  const { classes, setClassColor } = useClassManager()

  const [weekOffset, setWeekOffset] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [showClassSelect, setShowClassSelect] = useState(false)
  const [showMemoInput, setShowMemoInput] = useState(false)
  const [showSaveTypeModal, setShowSaveTypeModal] = useState(false)
  const [showBulkSetup, setShowBulkSetup] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [selectedCell, setSelectedCell] = useState(null) // { day, period }
  const [selectedClass, setSelectedClass] = useState(null)
  const [memoText, setMemoText] = useState('')
  const [colorEditingClass, setColorEditingClass] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [pendingPeriodData, setPendingPeriodData] = useState(null)

  const weekInfo = getWeekRange(weekOffset)
  const { timetable } = getTimetableForWeek(weekInfo.weekKey)

  const handleEditPeriod = (day, period) => {
    setSelectedCell({ day, period })

    // 기존 데이터 불러오기 (있으면)
    const cellKey = `${day}-${period}`
    const existingData = timetable[cellKey]
    if (existingData) {
      setMemoText(existingData.memo || '')
    } else {
      setMemoText('')
    }

    setShowClassSelect(true)
  }

  const handleSelectClass = (classInfo) => {
    setSelectedClass(classInfo)
    setShowClassSelect(false)

    // 메모 입력 모달로 이동
    setShowMemoInput(true)
  }

  const handleSavePeriod = () => {
    if (!selectedClass || !selectedCell) return

    const periodData = {
      classId: selectedClass.id,
      className: `${selectedClass.grade}학년 ${selectedClass.classNum}반`,
      subject: '체육',
      memo: memoText.trim()
    }

    // periodData를 state에 저장
    setPendingPeriodData(periodData)

    // 메모 입력 모달 닫기
    setShowMemoInput(false)

    // 기본 시간표인지 특정 주인지 선택
    if (!weekInfo.isCurrentWeek) {
      // 다른 주를 보고 있으면 바로 해당 주만 변경
      handleSaveToWeek(periodData)
    } else {
      // 현재 주면 선택 모달 표시
      setShowSaveTypeModal(true)
    }
  }

  const handleSaveToBase = (periodData) => {
    if (!selectedCell) return

    const cellKey = `${selectedCell.day}-${selectedCell.period}`

    if (periodData) {
      updateBaseCell(cellKey, periodData)
      toast.success('기본 시간표에 저장되었습니다')
    } else {
      deleteBaseCell(cellKey)
      toast.success('기본 시간표에서 삭제되었습니다')
    }

    // localStorage 업데이트 후 상태 리셋
    setTimeout(() => {
      resetState()
    }, 100)
  }

  const handleSaveToWeek = (periodData) => {
    if (!selectedCell) return

    const cellKey = `${selectedCell.day}-${selectedCell.period}`

    if (periodData) {
      setWeekOverride(weekInfo.weekKey, cellKey, periodData)
      toast.success('이번 주만 변경되었습니다')
    } else {
      setWeekOverride(weekInfo.weekKey, cellKey, null)
      toast.success('이번 주만 삭제되었습니다')
    }

    // localStorage 업데이트 후 상태 리셋
    setTimeout(() => {
      resetState()
    }, 100)
  }

  const handleRemovePeriod = (day, period) => {
    setSelectedCell({ day, period })
    setSelectedClass(null)

    if (!weekInfo.isCurrentWeek) {
      handleSaveToWeek(null)
    } else {
      setShowSaveTypeModal(true)
    }
  }

  const resetState = () => {
    // 먼저 리렌더링 트리거
    setRefreshKey(prev => prev + 1)

    // 약간의 지연 후 상태 리셋
    setTimeout(() => {
      setShowMemoInput(false)
      setShowSaveTypeModal(false)
      setSelectedCell(null)
      setSelectedClass(null)
      setMemoText('')
      setPendingPeriodData(null)
    }, 100)
  }

  const handleClearSchedule = async () => {
    const confirmed = await confirm(
      '전체 시간표를 초기화하시겠습니까?\n모든 데이터가 삭제됩니다.',
      '초기화',
      '취소'
    )

    if (confirmed) {
      clearSchedule()
      toast.success('시간표가 초기화되었습니다')
    }
  }

  const scheduleIsEmpty = isEmpty()

  return (
    <div className="page-container">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-lg">
        <h1 className="text-page-title">📅 시간표</h1>

        <div className="flex gap-sm">
          <button
            onClick={() => setShowBulkSetup(true)}
            className="py-2 px-4 rounded-lg font-semibold hover:opacity-90 transition-all text-sm"
            style={{ backgroundColor: '#EDE9FE', color: '#5B21B6' }}
          >
            📋 기본 시간표 설정
          </button>
          {!scheduleIsEmpty && (
            <button
              onClick={handleClearSchedule}
              className="py-2 px-4 bg-white/60 text-danger rounded-lg font-semibold hover:bg-white/80 transition-all border border-danger/20 text-sm"
            >
              🗑️ 초기화
            </button>
          )}
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="py-2 px-4 rounded-lg font-semibold hover:opacity-90 transition-all text-sm"
            style={{
              backgroundColor: isEditing ? '#B3D9FF' : '#FFF9C4',
              color: isEditing ? '#1E5A9E' : '#8B7D00',
            }}
          >
            {isEditing ? '✓ 편집 완료' : '✏️ 편집'}
          </button>
        </div>
      </div>

      {/* 주차 네비게이션 */}
      <div className="flex items-center justify-between mb-md bg-white/60 backdrop-blur-sm rounded-xl p-md border border-white/80">
        <button
          onClick={() => setWeekOffset(weekOffset - 1)}
          className="p-2 hover:bg-white/60 rounded-lg transition-all"
          aria-label="이전 주"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>

        <div className="text-center">
          <div className="font-semibold text-text">
            {weekInfo.rangeText}
          </div>
          {weekInfo.isCurrentWeek && (
            <div className="text-xs text-primary font-medium mt-1">이번 주</div>
          )}
        </div>

        <button
          onClick={() => setWeekOffset(weekOffset + 1)}
          className="p-2 hover:bg-white/60 rounded-lg transition-all"
          aria-label="다음 주"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>

      {/* 시간표 그리드 */}
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-lg border border-white/80">
        <ScheduleGrid
          key={`${weekInfo.weekKey}-${refreshKey}`}
          weekKey={weekInfo.weekKey}
          isEditing={isEditing}
          onEditPeriod={handleEditPeriod}
          onRemovePeriod={handleRemovePeriod}
        />
      </div>

      {/* 안내 메시지 */}
      {scheduleIsEmpty && !isEditing && (
        <div className="mt-md p-lg bg-white/60 backdrop-blur-sm rounded-xl border border-white/80 text-center">
          <p className="text-textMuted">
            시간표가 비어있습니다. <br />
            <span className="font-semibold text-primary">편집 버튼</span>을 눌러 수업을 추가해보세요.
          </p>
        </div>
      )}

      {/* 학급 선택 모달 */}
      {showClassSelect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-glass-strong max-w-3xl w-full p-6 border border-white/60">
            <h2 className="text-xl font-bold mb-4 text-text">학급 선택</h2>

            <div className="grid grid-cols-4 gap-3 mb-4 max-h-80 overflow-y-auto">
              {classes.map((classInfo) => (
                <div
                  key={classInfo.id}
                  className="relative p-3 rounded-lg text-center transition-all border-2 cursor-pointer hover:scale-105"
                  style={{
                    backgroundColor: classInfo.color?.bg || '#FCE7F3',
                    borderColor: classInfo.color?.text || '#9F1239',
                    color: classInfo.color?.text || '#9F1239'
                  }}
                  onClick={() => handleSelectClass(classInfo)}
                >
                  {/* 색상 변경 버튼 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setColorEditingClass(classInfo)
                      setShowColorPicker(true)
                    }}
                    className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-lg hover:bg-black/10 transition-all"
                    title="색상 변경"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 20h9"></path>
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                    </svg>
                  </button>

                  <div className="font-semibold">
                    {classInfo.grade}학년 {classInfo.classNum}반
                  </div>
                  <div className="text-xs mt-1 opacity-80">
                    {classInfo.studentCount}명
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                setShowClassSelect(false)
                setSelectedCell(null)
                setMemoText('')
              }}
              className="w-full py-2 px-4 bg-white/60 text-text rounded-lg font-medium hover:bg-white/80 transition-all border border-white/80"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 메모 입력 모달 */}
      {showMemoInput && selectedClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-glass-strong max-w-md w-full p-6 border border-white/60">
            <h2 className="text-xl font-bold mb-2 text-text">
              {selectedClass.grade}학년 {selectedClass.classNum}반
            </h2>
            <p className="text-sm text-textMuted mb-4">
              수업 내용을 간단히 메모해보세요 (선택)
            </p>

            <textarea
              value={memoText}
              onChange={(e) => setMemoText(e.target.value)}
              placeholder="예: 티볼, 피구, 줄넘기 등"
              className="w-full h-24 mb-4 resize-none p-3 bg-white/80 border border-white/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
            />

            <div className="flex gap-2">
              <button
                onClick={handleSavePeriod}
                className="flex-1 py-2 px-4 rounded-lg font-semibold hover:opacity-90 transition-all"
                style={{ backgroundColor: '#B3D9FF', color: '#1E5A9E' }}
              >
                저장
              </button>
              <button
                onClick={() => {
                  setShowMemoInput(false)
                  setSelectedClass(null)
                  setMemoText('')
                }}
                className="flex-1 py-2 px-4 bg-white/60 text-text rounded-lg font-medium hover:bg-white/80 transition-all border border-white/80"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 기본 시간표 일괄 설정 모달 */}
      {showBulkSetup && (
        <BulkScheduleSetup
          onClose={() => {
            setShowBulkSetup(false)
            setRefreshKey(prev => prev + 1) // 저장 후 리렌더링
          }}
        />
      )}

      {/* 색상 피커 모달 */}
      {showColorPicker && colorEditingClass && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-glass-strong max-w-md w-full p-6 border border-white/60">
            <h2 className="text-xl font-bold mb-4 text-text text-center">
              {colorEditingClass.grade}학년 {colorEditingClass.classNum}반 색상 선택
            </h2>

            {/* 미리보기 */}
            <div
              className="mb-4 p-4 rounded-xl text-center"
              style={{ backgroundColor: colorEditingClass.color?.bg || CLASS_COLOR_PRESETS[0].bg }}
            >
              <div
                className="font-bold"
                style={{ color: colorEditingClass.color?.text || CLASS_COLOR_PRESETS[0].text }}
              >
                {colorEditingClass.grade}학년 {colorEditingClass.classNum}반
              </div>
            </div>

            {/* 색상 팔레트 */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {CLASS_COLOR_PRESETS.map((color, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setClassColor(colorEditingClass.id, color)
                    toast.success('색상이 변경되었습니다')
                    setShowColorPicker(false)
                    setColorEditingClass(null)
                  }}
                  className="p-3 rounded-xl hover:scale-105 transition-all border-4"
                  style={{
                    backgroundColor: color.bg,
                    borderColor: colorEditingClass.color?.bg === color.bg ? color.text : 'transparent'
                  }}
                >
                  <div
                    className="text-xs font-semibold"
                    style={{ color: color.text }}
                  >
                    {color.name}
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setShowColorPicker(false)
                setColorEditingClass(null)
              }}
              className="w-full py-2 px-4 bg-white/60 text-text rounded-lg font-medium hover:bg-white/80 transition-all border border-white/80"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 저장 방식 선택 모달 (기본 시간표 vs 이번 주만) */}
      {showSaveTypeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-glass-strong max-w-sm w-full p-6 border border-white/60">
            <h2 className="text-lg font-bold mb-3 text-text text-center">
              {pendingPeriodData ? '어디에 저장할까요?' : '어디에서 삭제할까요?'}
            </h2>

            <p className="text-sm text-textMuted text-center mb-6">
              {pendingPeriodData
                ? `${pendingPeriodData.className} 수업을 추가합니다`
                : '수업을 삭제합니다'}
            </p>

            <div className="space-y-3">
              <button
                onClick={() => handleSaveToBase(pendingPeriodData)}
                className="w-full py-3 px-4 rounded-xl font-semibold transition-all"
                style={{ backgroundColor: '#B3D9FF', color: '#1E5A9E' }}
              >
                📅 기본 시간표
                <div className="text-xs font-normal mt-1 opacity-80">
                  매주 반복되는 시간표에 적용
                </div>
              </button>

              <button
                onClick={() => handleSaveToWeek(pendingPeriodData)}
                className="w-full py-3 px-4 rounded-xl font-semibold transition-all"
                style={{ backgroundColor: '#FFF9C4', color: '#8B7D00' }}
              >
                ✦ 이번 주만
                <div className="text-xs font-normal mt-1 opacity-80">
                  이번 주에만 적용 (기본 시간표 유지)
                </div>
              </button>

              <button
                onClick={resetState}
                className="w-full py-2 px-4 bg-white/60 text-text rounded-xl font-medium hover:bg-white/80 transition-all border border-white/80"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
