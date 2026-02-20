// 📅 시간표 탭 — 주간 시간표 편집 (기본 + 주차별 오버라이드), 수업 기록 저장까지 연결 | UI→components/schedule/, 데이터→hooks/useSchedule.js
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom'
import { useSchedule, getWeekRange } from '../hooks/useSchedule'
import { useClassManager } from '../hooks/useClassManager'
import { useSettings } from '../hooks/useSettings'
import ScheduleGrid from '../components/schedule/ScheduleGrid'
import BulkScheduleSetup from '../components/schedule/BulkScheduleSetup'
import ClassSelectModal from '../components/schedule/ClassSelectModal'
import LessonLogModal from '../components/schedule/LessonLogModal'
import MemoInputModal from '../components/schedule/MemoInputModal'
import ColorPickerModal from '../components/schedule/ColorPickerModal'
import SaveTypeModal from '../components/schedule/SaveTypeModal'
import { fetchAirQualityData, fetchWeatherData } from '../services/weather'
import toast from 'react-hot-toast'
import { confirm } from '../components/common/ConfirmDialog'
import { useAI } from '../hooks/useAI'
import { judgeOutdoorClass } from '../data/mockWeather'
import { toLocalDateString, getTodayLocalDate } from '../utils/recordDate'
import { LESSON_DOMAINS, LESSON_FORM_DEFAULT, parseEventTag } from '../constants/lessonDefaults'
import { getLessonSuggestions } from '../utils/lessonSuggestions'
import { useAnnualPlan } from '../hooks/useAnnualPlan'

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
  lessonLogTarget: null,
}

function scheduleReducer(state, action) {
  switch (action.type) {
    case 'SET_WEEK_OFFSET':
      return { ...state, weekOffset: action.payload }
    case 'TOGGLE_EDITING':
      if (state.isEditing) {
        // 편집 모드 종료 시 편집 관련 상태 전부 초기화
        return {
          ...state,
          isEditing: false,
          showClassSelect: false,
          showMemoInput: false,
          showSaveTypeModal: false,
          selectedCell: null,
          selectedClass: null,
          memoText: '',
          pendingPeriodData: null,
        }
      }
      return { ...state, isEditing: true }
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
    case 'OPEN_LESSON_LOG':
      return {
        ...state,
        lessonLogTarget: action.payload,
      }
    case 'CLOSE_LESSON_LOG':
      return {
        ...state,
        lessonLogTarget: null,
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
        lessonLogTarget: null,
        refreshKey: state.refreshKey + 1,
      }
    default:
      return state
  }
}

export default function SchedulePage() {
  const {
    WEEKDAYS,
    WEEKDAY_LABELS,
    getTimetableForWeek,
    updateBaseCell,
    deleteBaseCell,
    setWeekOverride,
    clearSchedule,
    isEmpty,
  } = useSchedule()

  const { classes, setClassColor, addClassRecord, getClass, getNextLessonSequence, findRecordForCell, records } = useClassManager()
  const { location } = useSettings()
  const { plans, getScheduleOverlay, markLessonComplete } = useAnnualPlan()

  const routerLocation = useLocation()
  const navigate = useNavigate()

  const [state, dispatch] = useReducer(scheduleReducer, initialState)
  const [lessonForm, setLessonForm] = useState(LESSON_FORM_DEFAULT)
  const [searchParams, setSearchParams] = useSearchParams()
  const [isRecommendationLoading, setIsRecommendationLoading] = useState(false)
  const [lessonRecommendation, setLessonRecommendation] = useState(null)
  const [recommendationError, setRecommendationError] = useState('')
  const [pendingActivity, setPendingActivity] = useState(null)
  const aiSuggest = useAI()
  const [aiSuggestions, setAiSuggestions] = useState([])

  // 수업설계에서 전달받은 활동 감지
  useEffect(() => {
    if (routerLocation.state?.pendingActivity) {
      setPendingActivity(routerLocation.state.pendingActivity)
      if (state.isEditing) {
        dispatch({ type: 'TOGGLE_EDITING' })
      }
      navigate('/schedule', { replace: true, state: {} })
    }
  }, [routerLocation.state])

  const suggestionActivities = useMemo(
    () => getLessonSuggestions(lessonRecommendation?.judgment, lessonForm.domain),
    [lessonRecommendation?.judgment, lessonForm.domain]
  )

  const weekInfo = getWeekRange(state.weekOffset)
  const { timetable } = getTimetableForWeek(weekInfo.weekKey)

  // cellRecordMap 계산 — 각 셀에 해당하는 기록을 매핑
  const cellRecordMap = useMemo(() => {
    const map = {}
    Object.entries(timetable).forEach(([cellKey, periodData]) => {
      if (!periodData?.classId) return
      const [day, period] = cellKey.split('-')
      const dayIndex = WEEKDAYS.indexOf(day)
      const cellDate = new Date(weekInfo.monday)
      if (dayIndex >= 0) {
        cellDate.setDate(cellDate.getDate() + dayIndex)
      }
      const dateStr = toLocalDateString(cellDate)
      const record = findRecordForCell(periodData.classId, day, Number(period), dateStr)
      if (record) map[cellKey] = record
    })
    return map
  }, [timetable, weekInfo.monday, records])

  // planOverlayMap 계산 — 연간 계획의 차시 정보를 각 체육 셀에 매핑
  const planOverlayMap = useMemo(() => {
    if (!plans || plans.length === 0) return {}
    const map = {}

    // 학급별로 체육 셀 그룹화 (다른 학급 셀이 섞이면 차시 번호 어긋남 방지)
    const cellsByClass = {}
    Object.entries(timetable).forEach(([cellKey, periodData]) => {
      if (!periodData?.classId) return
      if (!cellsByClass[periodData.classId]) cellsByClass[periodData.classId] = {}
      cellsByClass[periodData.classId][cellKey] = periodData
    })

    // 각 학급별로 학년이 매칭되는 연간 계획 찾아 오버레이 계산
    Object.entries(cellsByClass).forEach(([classId, classTimetable]) => {
      const cls = getClass(classId)
      const gradeLabel = cls ? `${cls.grade}학년` : null

      for (const plan of plans) {
        if (gradeLabel && plan.grade && plan.grade !== gradeLabel) continue
        const overlay = getScheduleOverlay(plan.id, classId, weekInfo.weekKey, classTimetable)
        if (overlay && Object.keys(overlay).length > 0) {
          Object.assign(map, overlay)
          break
        }
      }
    })

    return map
  }, [plans, timetable, weekInfo.weekKey, getScheduleOverlay, getClass])

  const clearLessonQuery = () => {
    if (!searchParams.has('day') && !searchParams.has('period') && !searchParams.has('classId')) {
      return
    }
    setSearchParams({}, { replace: true })
  }

  const loadWeatherRecommendation = useCallback(async () => {
    const stationName = location.stationName || '대전'

    setIsRecommendationLoading(true)
    setRecommendationError('')

    try {
      const weather = await fetchWeatherData(location)
      const air = await fetchAirQualityData(stationName)
      const judgment = judgeOutdoorClass(weather, air)

      setLessonRecommendation({
        weather,
        air,
        judgment,
      })
    } catch (error) {
      console.error('수업 추천 날씨 로드 실패:', error)
      setRecommendationError('현재 날씨 판별 데이터를 불러오지 못해 실내/실외 권장 판정을 표시할 수 없습니다.')
      setLessonRecommendation(null)
    } finally {
      setIsRecommendationLoading(false)
    }
  }, [location.lat, location.lon, location.stationName])

  const openLessonLog = (day, period, periodData) => {
    const dayIndex = WEEKDAYS.indexOf(day)
    const classDate = new Date(weekInfo.monday)
    const selectedClass = getClass(periodData?.classId)
    const classId = periodData?.classId
    const nextDomain = LESSON_DOMAINS.includes(selectedClass?.lastDomain)
      ? selectedClass.lastDomain
      : LESSON_DOMAINS[0]
    const suggestedSequence = classId
      ? getNextLessonSequence(classId, nextDomain)
      : 1

    if (dayIndex >= 0) {
      classDate.setDate(classDate.getDate() + dayIndex)
    }

    dispatch({
      type: 'OPEN_LESSON_LOG',
      payload: {
        day,
        period,
        cellKey: `${day}-${period}`,
        classId: periodData?.classId,
        className: periodData?.className,
        periodData,
        classDate: toLocalDateString(classDate),
        scheduledDate: toLocalDateString(classDate),
        recordedAt: getTodayLocalDate(),
      },
    })

    // 행사 태그 감지 → 활동명/도메인 자동채움
    const { eventLabel } = parseEventTag(periodData?.memo)

    setLessonForm((prev) => ({
      ...prev,
      activity: pendingActivity?.name || (eventLabel || ''),
      variation: '',
      memo: periodData?.memo || '',
      domain: pendingActivity?.domain || (eventLabel ? '기타' : nextDomain),
      sequence: pendingActivity?.domain
        ? (classId ? getNextLessonSequence(classId, pendingActivity.domain) : suggestedSequence)
        : (eventLabel ? (classId ? getNextLessonSequence(classId, '기타') : suggestedSequence) : suggestedSequence),
      performance: '',
    }))
  }

  const closeLessonLog = () => {
    dispatch({ type: 'CLOSE_LESSON_LOG' })
    setLessonForm(LESSON_FORM_DEFAULT)
    clearLessonQuery()
  }

  const handleEditPeriod = (day, period) => {
    if (pendingActivity) {
      const cellKey = `${day}-${period}`
      const existingData = timetable[cellKey]
      if (existingData?.classId) {
        openLessonLog(day, period, existingData)
      } else {
        toast('이 교시에 학급이 배정되지 않았습니다.\n먼저 학급을 배정한 후 다시 시도해주세요.', { icon: 'ℹ️' })
      }
      return
    }

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

  const handleOpenLessonLog = (day, period, periodData) => {
    if (!periodData?.classId) return
    if (!pendingActivity && state.isEditing) return

    const cellKey = `${day}-${period}`
    const existingRecord = cellRecordMap[cellKey]

    if (existingRecord) {
      dispatch({
        type: 'OPEN_LESSON_LOG',
        payload: {
          day,
          period,
          cellKey: `${day}-${period}`,
          classId: periodData?.classId,
          className: periodData?.className,
          periodData,
          classDate: existingRecord.classDate,
          scheduledDate: existingRecord.classDate,
          recordedAt: existingRecord.recordedAt || existingRecord.date,
          existingRecord,
        },
      })
      setLessonForm({
        activity: existingRecord.activity || '',
        domain: existingRecord.domain || '스포츠',
        variation: existingRecord.variation || '',
        memo: existingRecord.memo || '',
        sequence: existingRecord.sequence || '',
        performance: existingRecord.performance || '',
      })
      return
    }

    openLessonLog(day, period, periodData)
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
      memo: state.memoText.trim(),
    }

    if (!weekInfo.isCurrentWeek) {
      handleSaveToWeek(periodData)
    } else {
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

    setTimeout(() => {
      dispatch({ type: 'RESET_STATE' })
    }, 100)
  }

  const handleRemovePeriod = (day, period) => {
    if (!weekInfo.isCurrentWeek) {
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

  const handleSaveLessonLog = () => {
    if (!state.lessonLogTarget) {
      closeLessonLog()
      return
    }

    const activity = lessonForm.activity.trim()
    if (!activity) {
      toast.error('수업 활동명을 입력해 주세요')
      return
    }

    const classId = state.lessonLogTarget.classId
    if (!classId) {
      toast.error('학급 정보를 찾을 수 없습니다')
      return
    }

    const sequenceValue = Number(lessonForm.sequence)
    const finalSequence = Number.isInteger(sequenceValue) && sequenceValue > 0
      ? sequenceValue
      : getNextLessonSequence(classId, lessonForm.domain)
    const recordedAt = getTodayLocalDate()
    const classDate = state.lessonLogTarget?.scheduledDate || state.lessonLogTarget?.classDate

    addClassRecord(classId, {
      date: recordedAt,
      recordedAt,
      classDate,
      day: state.lessonLogTarget.day,
      dayLabel: WEEKDAY_LABELS[state.lessonLogTarget.day] || state.lessonLogTarget.day,
      period: state.lessonLogTarget.period,
      className: state.lessonLogTarget.className,
      activity,
      domain: lessonForm.domain,
      variation: lessonForm.variation.trim(),
      memo: lessonForm.memo.trim(),
      sequence: finalSequence,
      performance: lessonForm.performance.trim(),
      subject: state.lessonLogTarget.periodData?.subject || '체육',
      source: pendingActivity ? 'curriculum' : 'schedule-log',
      aceLesson: pendingActivity?.aceLesson || null,
    })

    // 연간 계획 진도 완료 — 해당 셀의 poolId가 있으면 완료 표시
    if (plans && plans.length > 0 && state.lessonLogTarget) {
      const targetClassId = state.lessonLogTarget.classId
      const cellKey = state.lessonLogTarget.cellKey
      const overlayData = cellKey ? planOverlayMap[cellKey] : null
      if (overlayData?.poolId) {
        const targetClass = getClass(targetClassId)
        const gradeLabel = targetClass ? `${targetClass.grade}학년` : null
        for (const plan of plans) {
          if (gradeLabel && plan.grade && plan.grade !== gradeLabel) continue
          try { markLessonComplete(plan.id, targetClassId, overlayData.poolId) } catch { /* noop */ }
          break
        }
      }
    }

    toast.success('수업 기록이 저장되었습니다')
    setPendingActivity(null)
    closeLessonLog()
  }

  const getRecommendationText = () => {
    if (isRecommendationLoading) return '날씨 판독 중입니다'
    if (!lessonRecommendation) return recommendationError || '수업 권장 판정 정보가 없습니다'

    const { weather, judgment } = lessonRecommendation
    const recommendation = judgment.text || '판단 없음'
    const temperature = weather.t1h
    const pm10 = judgment.checks?.pm10?.value || ''
    const rain = judgment.checks?.rain?.value || ''

    return `${recommendation} (현재: ${temperature}℃, ${rain}, ${pm10})`
  }

  const handleLessonDomainChange = (domain) => {
    const classId = state.lessonLogTarget?.classId
    const nextSequence = classId
      ? getNextLessonSequence(classId, domain)
      : lessonForm.sequence

    setLessonForm((prev) => ({
      ...prev,
      domain,
      sequence: Number.isInteger(Number(nextSequence)) ? Number(nextSequence) : prev.sequence,
    }))
  }

  const handleApplySuggestion = (suggestion) => {
    setLessonForm((prev) => ({
      ...prev,
      activity: prev.activity ? `${prev.activity}, ${suggestion}` : suggestion,
    }))
  }

  const handleSearchParams = () => {
    if (state.isEditing) return

    const day = searchParams.get('day')
    const period = Number(searchParams.get('period'))
    const classId = searchParams.get('classId')

    if (!state.lessonLogTarget && searchParams.has('day') && searchParams.has('period')) {
      if (!WEEKDAYS.includes(day) || !Number.isInteger(period) || period < 1 || period > 7) {
        clearLessonQuery()
        return
      }

      const targetKey = `${day}-${period}`
      const target = timetable[targetKey]
      if (!target || !target.classId) {
        toast.error('해당 교시에 수업이 없어 기록할 수 없습니다')
        clearLessonQuery()
        return
      }

      if (classId && target.classId !== classId) {
        toast.error('선택한 학급과 시간표 학급이 일치하지 않습니다')
        clearLessonQuery()
        return
      }

      openLessonLog(day, period, target)
    }
  }

  useEffect(() => {
    if (!state.lessonLogTarget) {
      handleSearchParams()
    }
  }, [searchParams, weekInfo.weekKey, timetable, state.lessonLogTarget, handleSearchParams])

  useEffect(() => {
    if (state.lessonLogTarget) {
      loadWeatherRecommendation()
    }
  }, [state.lessonLogTarget, loadWeatherRecommendation])

  const scheduleIsEmpty = isEmpty()

  return (
    <div className="page-container">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-lg">
        <h1 className="text-page-title">시간표</h1>

        <div className="flex gap-sm">
          <button
            onClick={() => dispatch({ type: 'OPEN_BULK_SETUP' })}
            className="py-2 px-4 rounded-lg font-semibold hover:opacity-90 transition-all text-sm"
            style={{ backgroundColor: '#EDE9FE', color: '#5B21B6' }}
          >
            기본 시간표 설정
          </button>
          {!scheduleIsEmpty && (
            <button
              onClick={handleClearSchedule}
              className="py-2 px-4 bg-white/60 text-danger rounded-lg font-semibold hover:bg-white/80 transition-all border border-danger/20 text-sm"
            >
              초기화
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
            {state.isEditing ? '편집 완료' : '편집'}
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

      {/* 수업설계에서 전달받은 활동 배너 */}
      {pendingActivity && (
        <div className="mb-md p-3 rounded-xl border-2 border-[#F5E07C] bg-[#FFF9C4]/60 backdrop-blur-sm flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-bold text-gray-900 truncate">{pendingActivity.name}</p>
              <span className="text-[10px] bg-[#92400E]/10 text-[#92400E] rounded-full px-2 py-0.5 font-medium shrink-0">
                {pendingActivity.domain}
              </span>
            </div>
            <p className="text-[11px] text-[#92400E]">
              수업을 기록할 교시를 클릭하세요
            </p>
          </div>
          <button
            onClick={() => setPendingActivity(null)}
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white/60 transition-all"
            title="취소"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* 시간표 그리드 */}
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-lg border border-white/80">
        <ScheduleGrid
          key={`${weekInfo.weekKey}-${state.refreshKey}`}
          weekKey={weekInfo.weekKey}
          isEditing={state.isEditing}
          onEditPeriod={handleEditPeriod}
          onRemovePeriod={handleRemovePeriod}
          onOpenLessonLog={handleOpenLessonLog}
          cellRecordMap={cellRecordMap}
          planOverlayMap={planOverlayMap}
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
        <ClassSelectModal
          classes={classes}
          onSelectClass={handleSelectClass}
          onOpenColorPicker={(classInfo) => dispatch({ type: 'OPEN_COLOR_PICKER', payload: classInfo })}
          onClose={() => dispatch({ type: 'CLOSE_CLASS_SELECT' })}
        />
      )}

      {/* 수업 기록 모달 */}
      {state.lessonLogTarget && (
        <LessonLogModal
          target={state.lessonLogTarget}
          form={lessonForm}
          onFormChange={setLessonForm}
          pendingActivity={pendingActivity}
          weekdayLabels={WEEKDAY_LABELS}
          onClose={closeLessonLog}
          onSave={handleSaveLessonLog}
          onDomainChange={handleLessonDomainChange}
          onApplySuggestion={handleApplySuggestion}
          recommendation={{
            loading: isRecommendationLoading,
            data: lessonRecommendation,
            error: recommendationError,
            text: getRecommendationText(),
            activities: suggestionActivities,
          }}
          ai={{
            suggest: aiSuggest,
            suggestions: aiSuggestions,
            setSuggestions: setAiSuggestions,
            records,
          }}
        />
      )}

      {/* 메모 입력 모달 */}
      {state.showMemoInput && state.selectedClass && (
        <MemoInputModal
          selectedClass={state.selectedClass}
          memoText={state.memoText}
          onMemoChange={(text) => dispatch({ type: 'SET_MEMO_TEXT', payload: text })}
          onSave={handleSavePeriod}
          onClose={() => dispatch({ type: 'CLOSE_MEMO_INPUT' })}
        />
      )}

      {/* 기본 시간표 일괄 설정 모달 */}
      {state.showBulkSetup && (
        <BulkScheduleSetup
          onClose={() => dispatch({ type: 'CLOSE_BULK_SETUP' })}
        />
      )}

      {/* 색상 피커 모달 */}
      {state.showColorPicker && state.colorEditingClass && (
        <ColorPickerModal
          classInfo={state.colorEditingClass}
          onSelectColor={setClassColor}
          onClose={() => dispatch({ type: 'CLOSE_COLOR_PICKER' })}
        />
      )}

      {/* 저장 방식 선택 모달 */}
      {state.showSaveTypeModal && (
        <SaveTypeModal
          pendingPeriodData={state.pendingPeriodData}
          onSaveToBase={handleSaveToBase}
          onSaveToWeek={handleSaveToWeek}
          onClose={resetState}
        />
      )}
    </div>
  )
}
