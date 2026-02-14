import { useReducer } from 'react'
import { useSchedule, getWeekRange } from '../hooks/useSchedule'
import { useClassManager, CLASS_COLOR_PRESETS } from '../hooks/useClassManager'
import ScheduleGrid from '../components/schedule/ScheduleGrid'
import BulkScheduleSetup from '../components/schedule/BulkScheduleSetup'
import Modal from '../components/common/Modal'
import toast from 'react-hot-toast'
import { confirm } from '../components/common/ConfirmDialog'

const initialState = {
  weekOffset: 0,
  isEditing: false,
  showClassSelect: false,
  showMemoInput: false,
  showSaveTypeModal: false,
  showBulkSetup: false,
  showColorPicker: false,
  selectedCell: null,
  selectedClass: null,
  memoText: '',
  colorEditingClass: null,
  refreshKey: 0,
  pendingPeriodData: null,
}

function scheduleReducer(state, action) {
  switch (action.type) {
    case 'SET_WEEK_OFFSET':
      return { ...state, weekOffset: action.payload }
    case 'TOGGLE_EDITING':
      return { ...state, isEditing: !state.isEditing }
    case 'OPEN_CLASS_SELECT':
      return {
        ...state,
        showClassSelect: true,
        selectedCell: action.payload.cell,
        memoText: action.payload.memo || '',
      }
    case 'CLOSE_CLASS_SELECT':
      return {
        ...state,
        showClassSelect: false,
        selectedCell: null,
        memoText: '',
      }
    case 'SELECT_CLASS':
      return {
        ...state,
        showClassSelect: false,
        showMemoInput: true,
        selectedClass: action.payload,
      }
    case 'CLOSE_MEMO_INPUT':
      return {
        ...state,
        showMemoInput: false,
        selectedClass: null,
        memoText: '',
      }
    case 'SET_MEMO_TEXT':
      return { ...state, memoText: action.payload }
    case 'SAVE_PERIOD':
      return {
        ...state,
        showMemoInput: false,
        pendingPeriodData: action.payload.periodData,
        showSaveTypeModal: action.payload.showSaveType,
      }
    case 'OPEN_REMOVE_PERIOD':
      return {
        ...state,
        selectedCell: action.payload.cell,
        selectedClass: null,
        showSaveTypeModal: action.payload.showSaveType,
      }
    case 'OPEN_BULK_SETUP':
      return { ...state, showBulkSetup: true }
    case 'CLOSE_BULK_SETUP':
      return {
        ...state,
        showBulkSetup: false,
        refreshKey: state.refreshKey + 1,
      }
    case 'OPEN_COLOR_PICKER':
      return {
        ...state,
        showColorPicker: true,
        colorEditingClass: action.payload,
      }
    case 'CLOSE_COLOR_PICKER':
      return {
        ...state,
        showColorPicker: false,
        colorEditingClass: null,
      }
    case 'RESET_STATE':
      return {
        ...state,
        showMemoInput: false,
        showSaveTypeModal: false,
        selectedCell: null,
        selectedClass: null,
        memoText: '',
        pendingPeriodData: null,
        refreshKey: state.refreshKey + 1,
      }
    default:
      return state
  }
}

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

  const [state, dispatch] = useReducer(scheduleReducer, initialState)

  const weekInfo = getWeekRange(state.weekOffset)
  const { timetable } = getTimetableForWeek(weekInfo.weekKey)

  const handleEditPeriod = (day, period) => {
    const cellKey = `${day}-${period}`
    const existingData = timetable[cellKey]

    dispatch({
      type: 'OPEN_CLASS_SELECT',
      payload: {
        cell: { day, period },
        memo: existingData?.memo || '',
      },
    })
  }

  const handleSelectClass = (classInfo) => {
    dispatch({ type: 'SELECT_CLASS', payload: classInfo })
  }

  const handleSavePeriod = () => {
    if (!state.selectedClass || !state.selectedCell) return

    const periodData = {
      classId: state.selectedClass.id,
      className: `${state.selectedClass.grade}학년 ${state.selectedClass.classNum}반`,
      subject: '체육',
      memo: state.memoText.trim()
    }

    if (!weekInfo.isCurrentWeek) {
      // 다른 주를 보고 있으면 바로 해당 주만 변경
      handleSaveToWeek(periodData)
    } else {
      // 현재 주면 선택 모달 표시
      dispatch({
        type: 'SAVE_PERIOD',
        payload: { periodData, showSaveType: true },
      })
    }
  }

  const handleSaveToBase = (periodData) => {
    if (!state.selectedCell) return

    const cellKey = `${state.selectedCell.day}-${state.selectedCell.period}`

    if (periodData) {
      updateBaseCell(cellKey, periodData)
      toast.success('기본 시간표에 저장되었습니다')
    } else {
      deleteBaseCell(cellKey)
      toast.success('기본 시간표에서 삭제되었습니다')
    }

    // localStorage 업데이트 후 상태 리셋
    setTimeout(() => {
      dispatch({ type: 'RESET_STATE' })
    }, 100)
  }

  const handleSaveToWeek = (periodData) => {
    if (!state.selectedCell) return

    const cellKey = `${state.selectedCell.day}-${state.selectedCell.period}`

    if (periodData) {
      setWeekOverride(weekInfo.weekKey, cellKey, periodData)
      toast.success('이번 주만 변경되었습니다')
    } else {
      setWeekOverride(weekInfo.weekKey, cellKey, null)
      toast.success('이번 주만 삭제되었습니다')
    }

    // localStorage 업데이트 후 상태 리셋
    setTimeout(() => {
      dispatch({ type: 'RESET_STATE' })
    }, 100)
  }

  const handleRemovePeriod = (day, period) => {
    if (!weekInfo.isCurrentWeek) {
      // 다른 주: selectedCell을 설정하고 바로 주간 저장 (null = 삭제)
      // handleSaveToWeek는 state.selectedCell을 참조하므로 직접 처리
      const cellKey = `${day}-${period}`
      setWeekOverride(weekInfo.weekKey, cellKey, null)
      toast.success('이번 주만 삭제되었습니다')
      setTimeout(() => {
        dispatch({ type: 'RESET_STATE' })
      }, 100)
    } else {
      dispatch({
        type: 'OPEN_REMOVE_PERIOD',
        payload: { cell: { day, period }, showSaveType: true },
      })
    }
  }

  const resetState = () => {
    dispatch({ type: 'RESET_STATE' })
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
            onClick={() => dispatch({ type: 'OPEN_BULK_SETUP' })}
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
            onClick={() => dispatch({ type: 'TOGGLE_EDITING' })}
            className="py-2 px-4 rounded-lg font-semibold hover:opacity-90 transition-all text-sm"
            style={{
              backgroundColor: state.isEditing ? '#B3D9FF' : '#FFF9C4',
              color: state.isEditing ? '#1E5A9E' : '#8B7D00',
            }}
          >
            {state.isEditing ? '✓ 편집 완료' : '✏️ 편집'}
          </button>
        </div>
      </div>

      {/* 주차 네비게이션 */}
      <div className="flex items-center justify-between mb-md bg-white/60 backdrop-blur-sm rounded-xl p-md border border-white/80">
        <button
          onClick={() => dispatch({ type: 'SET_WEEK_OFFSET', payload: state.weekOffset - 1 })}
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
          onClick={() => dispatch({ type: 'SET_WEEK_OFFSET', payload: state.weekOffset + 1 })}
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
          key={`${weekInfo.weekKey}-${state.refreshKey}`}
          weekKey={weekInfo.weekKey}
          isEditing={state.isEditing}
          onEditPeriod={handleEditPeriod}
          onRemovePeriod={handleRemovePeriod}
        />
      </div>

      {/* 안내 메시지 */}
      {scheduleIsEmpty && !state.isEditing && (
        <div className="mt-md p-lg bg-white/60 backdrop-blur-sm rounded-xl border border-white/80 text-center">
          <p className="text-textMuted">
            시간표가 비어있습니다. <br />
            <span className="font-semibold text-primary">편집 버튼</span>을 눌러 수업을 추가해보세요.
          </p>
        </div>
      )}

      {/* 학급 선택 모달 */}
      {state.showClassSelect && (
        <Modal onClose={() => dispatch({ type: 'CLOSE_CLASS_SELECT' })} maxWidth="max-w-3xl">
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
                      dispatch({ type: 'OPEN_COLOR_PICKER', payload: classInfo })
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
              onClick={() => dispatch({ type: 'CLOSE_CLASS_SELECT' })}
              className="w-full py-2 px-4 bg-white/60 text-text rounded-lg font-medium hover:bg-white/80 transition-all border border-white/80"
            >
              취소
            </button>
        </Modal>
      )}

      {/* 메모 입력 모달 */}
      {state.showMemoInput && state.selectedClass && (
        <Modal onClose={() => dispatch({ type: 'CLOSE_MEMO_INPUT' })}>
            <h2 className="text-xl font-bold mb-2 text-text">
              {state.selectedClass.grade}학년 {state.selectedClass.classNum}반
            </h2>
            <p className="text-sm text-textMuted mb-4">
              수업 내용을 간단히 메모해보세요 (선택)
            </p>

            <textarea
              value={state.memoText}
              onChange={(e) => dispatch({ type: 'SET_MEMO_TEXT', payload: e.target.value })}
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
                onClick={() => dispatch({ type: 'CLOSE_MEMO_INPUT' })}
                className="flex-1 py-2 px-4 bg-white/60 text-text rounded-lg font-medium hover:bg-white/80 transition-all border border-white/80"
              >
                취소
              </button>
            </div>
        </Modal>
      )}

      {/* 기본 시간표 일괄 설정 모달 */}
      {state.showBulkSetup && (
        <BulkScheduleSetup
          onClose={() => dispatch({ type: 'CLOSE_BULK_SETUP' })}
        />
      )}

      {/* 색상 피커 모달 */}
      {state.showColorPicker && state.colorEditingClass && (
        <Modal onClose={() => dispatch({ type: 'CLOSE_COLOR_PICKER' })} zIndex="z-[60]">
            <h2 className="text-xl font-bold mb-4 text-text text-center">
              {state.colorEditingClass.grade}학년 {state.colorEditingClass.classNum}반 색상 선택
            </h2>

            {/* 미리보기 */}
            <div
              className="mb-4 p-4 rounded-xl text-center"
              style={{ backgroundColor: state.colorEditingClass.color?.bg || CLASS_COLOR_PRESETS[0].bg }}
            >
              <div
                className="font-bold"
                style={{ color: state.colorEditingClass.color?.text || CLASS_COLOR_PRESETS[0].text }}
              >
                {state.colorEditingClass.grade}학년 {state.colorEditingClass.classNum}반
              </div>
            </div>

            {/* 색상 팔레트 */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {CLASS_COLOR_PRESETS.map((color, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setClassColor(state.colorEditingClass.id, color)
                    toast.success('색상이 변경되었습니다')
                    dispatch({ type: 'CLOSE_COLOR_PICKER' })
                  }}
                  className="p-3 rounded-xl hover:scale-105 transition-all border-4"
                  style={{
                    backgroundColor: color.bg,
                    borderColor: state.colorEditingClass.color?.bg === color.bg ? color.text : 'transparent'
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
              onClick={() => dispatch({ type: 'CLOSE_COLOR_PICKER' })}
              className="w-full py-2 px-4 bg-white/60 text-text rounded-lg font-medium hover:bg-white/80 transition-all border border-white/80"
            >
              닫기
            </button>
        </Modal>
      )}

      {/* 저장 방식 선택 모달 (기본 시간표 vs 이번 주만) */}
      {state.showSaveTypeModal && (
        <Modal onClose={resetState} maxWidth="max-w-sm">
            <h2 className="text-lg font-bold mb-3 text-text text-center">
              {state.pendingPeriodData ? '어디에 저장할까요?' : '어디에서 삭제할까요?'}
            </h2>

            <p className="text-sm text-textMuted text-center mb-6">
              {state.pendingPeriodData
                ? `${state.pendingPeriodData.className} 수업을 추가합니다`
                : '수업을 삭제합니다'}
            </p>

            <div className="space-y-3">
              <button
                onClick={() => handleSaveToBase(state.pendingPeriodData)}
                className="w-full py-3 px-4 rounded-xl font-semibold transition-all"
                style={{ backgroundColor: '#B3D9FF', color: '#1E5A9E' }}
              >
                📅 기본 시간표
                <div className="text-xs font-normal mt-1 opacity-80">
                  매주 반복되는 시간표에 적용
                </div>
              </button>

              <button
                onClick={() => handleSaveToWeek(state.pendingPeriodData)}
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
        </Modal>
      )}
    </div>
  )
}
