// 📅 시간표 탭 — 주간 시간표 편집 (기본 + 주차별 오버라이드), 수업 기록 저장까지 연결 | UI→components/schedule/, 데이터→hooks/useSchedule.js
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom'
import { useSchedule, getWeekRange } from '../hooks/useSchedule'
import { useClassManager, CLASS_COLOR_PRESETS } from '../hooks/useClassManager'
import { useSettings } from '../hooks/useSettings'
import ScheduleGrid from '../components/schedule/ScheduleGrid'
import BulkScheduleSetup from '../components/schedule/BulkScheduleSetup'
import Modal from '../components/common/Modal'
import AceLessonFlow from '../components/curriculum/AceLessonFlow'
import { fetchAirQualityData, fetchWeatherData } from '../services/weather'
import toast from 'react-hot-toast'
import { confirm } from '../components/common/ConfirmDialog'
import { judgeOutdoorClass } from '../data/mockWeather'
import { formatRecordDate } from '../utils/recordDate'

const LESSON_DOMAINS = ['운동', '스포츠', '놀이', '표현', '기타']

const LESSON_ACTIVITY_LIBRARY = {
  스포츠: {
    optimal: ['빠르게 이어달리기', '교차줄넘기', '협력 릴레이'],
    caution: ['정적 스트레칭 순환', '제자리 활동 드릴', '볼 패스 릴레이(저강도)'],
    indoors: ['기초 근력(맨몸)', '균형 트레이닝', '볼 없이 동작 정렬'],
  },
  놀이: {
    optimal: ['장비 줄잡기 놀이', '오리엔테이션 추격전', '협동 미션 보드'],
    caution: ['조용한 신체놀이', '숫자 제자리 게임', '소근육 협응 놀이'],
    indoors: ['실내 이동 놀이', '정렬·대기 게임', '제한 공간 반응 놀이'],
  },
  표현: {
    optimal: ['공간 라인댄스', '구간 이동 퍼포먼스', '리듬 동작 결합'],
    caution: ['제자리 안무', '동작 연결 리듬', '조별 동작 반복 연습'],
    indoors: ['기초 동작 결합', '파트별 안무 정렬', '호흡·균형 연습'],
  },
  기타: {
    optimal: ['웜업 루틴', '기초 체력 순환', '저강도 협업 활동'],
    caution: ['정적 활동 중심 수업', '소도구 활용 실내 활동', '교실형 체력 활동'],
    indoors: ['기초 체력 훈련', '기본 동작 정렬', '교재 기반 활동'],
  },
}

const LESSON_FORM_DEFAULT = {
  activity: '',
  domain: '스포츠',
  variation: '',
  memo: '',
  sequence: '',
  performance: '',
}

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

const toLocalDateString = (dateValue) => {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getTodayLocalDate = () => toLocalDateString(new Date())

const getLessonRecommendationMode = (judgment) => {
  const status = judgment?.status

  if (status === 'optimal') return 'optimal'
  if (status === 'caution') return 'caution'
  if (status === 'not-recommended') return 'indoors'

  return 'indoors'
}

const getLessonSuggestions = (judgment, domain = '스포츠') => {
  const resolvedDomain = LESSON_ACTIVITY_LIBRARY[domain] ? domain : '기타'
  const mode = getLessonRecommendationMode(judgment)
  return LESSON_ACTIVITY_LIBRARY[resolvedDomain][mode]
}

const getSuggestionSummary = (judgment) => {
  const mode = getLessonRecommendationMode(judgment)
  if (mode === 'optimal') return '현재 조건에서 야외 활동이 무난합니다'
  if (mode === 'caution') return '강수·미세먼지 주의, 조정된 활동을 추천해요'
  return '실내 대체 활동으로 진행하면 더 안정적입니다'
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

  const routerLocation = useLocation()
  const navigate = useNavigate()

  const [state, dispatch] = useReducer(scheduleReducer, initialState)
  const [lessonForm, setLessonForm] = useState(LESSON_FORM_DEFAULT)
  const [searchParams, setSearchParams] = useSearchParams()
  const [isRecommendationLoading, setIsRecommendationLoading] = useState(false)
  const [lessonRecommendation, setLessonRecommendation] = useState(null)
  const [recommendationError, setRecommendationError] = useState('')
  const [pendingActivity, setPendingActivity] = useState(null)

  // 수업설계에서 전달받은 활동 감지
  useEffect(() => {
    if (routerLocation.state?.pendingActivity) {
      setPendingActivity(routerLocation.state.pendingActivity)
      // 편집 모드 해제 — 셀 클릭이 바로 수업 기록으로 연결되도록
      if (state.isEditing) {
        dispatch({ type: 'TOGGLE_EDITING' })
      }
      // state 초기화 (뒤로가기 시 중복 방지)
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
        classId: periodData?.classId,
        className: periodData?.className,
        periodData,
        classDate: toLocalDateString(classDate),
        scheduledDate: toLocalDateString(classDate),
        recordedAt: getTodayLocalDate(),
      },
    })

    setLessonForm((prev) => ({
      ...prev,
      activity: pendingActivity?.name || '',
      variation: '',
      memo: periodData?.memo || '',
      domain: pendingActivity?.domain || nextDomain,
      sequence: pendingActivity?.domain
        ? (classId ? getNextLessonSequence(classId, pendingActivity.domain) : suggestedSequence)
        : suggestedSequence,
      performance: '',
    }))
  }

  const closeLessonLog = () => {
    dispatch({ type: 'CLOSE_LESSON_LOG' })
    setLessonForm(LESSON_FORM_DEFAULT)
    clearLessonQuery()
  }

  const handleEditPeriod = (day, period) => {
    // pendingActivity가 있으면 편집 대신 수업 기록으로 바로 연결
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
    if (!periodData?.classId) {
      return
    }
    // pendingActivity가 있으면 편집 모드 무시하고 수업 기록 열기
    if (!pendingActivity && state.isEditing) {
      return
    }

    // 기존 기록이 있는지 확인
    const cellKey = `${day}-${period}`
    const existingRecord = cellRecordMap[cellKey]

    if (existingRecord) {
      // 기존 기록이 있으면 — 기록 보기 모달로 (aceLesson 포함)
      dispatch({
        type: 'OPEN_LESSON_LOG',
        payload: {
          day,
          period,
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

    toast.success('수업 기록이 저장되었습니다')
    setPendingActivity(null)
    closeLessonLog()
  }

  const getRecommendationText = () => {
    if (isRecommendationLoading) {
      return '날씨 판독 중입니다'
    }

    if (!lessonRecommendation) {
      return recommendationError || '수업 권장 판정 정보가 없습니다'
    }

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

      {/* 수업설계에서 전달받은 활동 배너 */}
      {pendingActivity && (
        <div className="mb-md p-3 rounded-xl border-2 border-[#F5E07C] bg-[#FFF9C4]/60 backdrop-blur-sm flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm">✏️</span>
              <p className="text-sm font-bold text-gray-900 truncate">{pendingActivity.name}</p>
              <span className="text-[10px] bg-[#92400E]/10 text-[#92400E] rounded-full px-2 py-0.5 font-medium shrink-0">
                {pendingActivity.domain}
              </span>
            </div>
            <p className="text-[11px] text-[#92400E]">
              👆 수업을 기록할 교시를 클릭하세요
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
                  color: classInfo.color?.text || '#9F1239',
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

      {/* 수업 기록 모달 */}
      {state.lessonLogTarget && (() => {
        const existingRecord = state.lessonLogTarget.existingRecord
        const aceSource = pendingActivity?.aceLesson || existingRecord?.aceLesson
        const isAceMode = !!aceSource
        const isViewingExisting = !!existingRecord

        return (
          <Modal
            onClose={closeLessonLog}
            maxWidth="max-w-4xl"
            contentClassName="max-h-[88vh] overflow-y-auto"
          >
            <h2 className="text-xl font-bold text-text mb-1">
              {isViewingExisting ? '수업 기록 보기' : '수업 기록'}
            </h2>
            <p className="text-xs text-textMuted mb-3">
              {state.lessonLogTarget.className} · {WEEKDAY_LABELS[state.lessonLogTarget.day] || state.lessonLogTarget.day}요일 · {state.lessonLogTarget.period}교시
              <span className="ml-2">기록일 {formatRecordDate(state.lessonLogTarget.recordedAt)}</span>
              {state.lessonLogTarget.scheduledDate &&
              state.lessonLogTarget.scheduledDate !== state.lessonLogTarget.recordedAt ? (
                <span className="ml-2">수업일 {formatRecordDate(state.lessonLogTarget.scheduledDate)}</span>
              ) : null}
            </p>

            {/* ACE 모드: ACE 수업 흐름 + 간소화된 폼 */}
            {isAceMode ? (
              <>
                {/* ACE 수업 흐름 표시 */}
                <div className="mb-4 p-3 rounded-xl border border-[#7C9EF5]/30 bg-[#7C9EF5]/5">
                  <AceLessonFlow aceLesson={aceSource} />
                </div>

                {/* 기존 기록 정보 표시 (보기 모드) */}
                {isViewingExisting && (
                  <div className="mb-4 p-3 rounded-lg border border-white/80 bg-white/60">
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <span className="text-xs text-textMuted block">활동명</span>
                        <span className="font-medium text-text">{existingRecord.activity}</span>
                      </div>
                      <div>
                        <span className="text-xs text-textMuted block">도메인</span>
                        <span className="font-medium text-text">{existingRecord.domain}</span>
                      </div>
                      <div>
                        <span className="text-xs text-textMuted block">차시</span>
                        <span className="font-medium text-text">{existingRecord.sequence}차시</span>
                      </div>
                    </div>
                    {existingRecord.performance && (
                      <div className="mt-2">
                        <span className="text-xs text-textMuted">평가: </span>
                        <span className="text-sm font-semibold text-primary">{existingRecord.performance}</span>
                      </div>
                    )}
                    {existingRecord.memo && (
                      <div className="mt-2">
                        <span className="text-xs text-textMuted">메모: </span>
                        <span className="text-sm text-text">{existingRecord.memo}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 새 기록 폼 (pendingActivity가 있을 때만) */}
                {!isViewingExisting && (
                  <>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      <div className="space-y-1">
                        <label className="block text-sm font-semibold text-text mb-1">수업 활동명</label>
                        <input
                          value={lessonForm.activity}
                          onChange={(e) => setLessonForm((prev) => ({ ...prev, activity: e.target.value }))}
                          placeholder="예: 빠르게 이어달리기"
                          className="w-full p-2 rounded-lg border border-white/80 bg-white/80 focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-sm font-semibold text-text mb-1">도메인</label>
                        <select
                          value={lessonForm.domain}
                          onChange={(e) => handleLessonDomainChange(e.target.value)}
                          className="w-full p-2 rounded-lg border border-white/80 bg-white/80 focus:outline-none focus:ring-2 focus:ring-primary/30"
                        >
                          {LESSON_DOMAINS.map((domain) => (
                            <option key={domain} value={domain}>{domain}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 mt-4">
                      <div className="space-y-1">
                        <label className="block text-sm font-semibold text-text mb-1">차시 (도메인 누적)</label>
                        <input
                          type="number"
                          min="1"
                          value={lessonForm.sequence}
                          onChange={(e) => setLessonForm((prev) => ({ ...prev, sequence: e.target.value }))}
                          className="w-full p-2 rounded-lg border border-white/80 bg-white/80 focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-text mb-1">간편 평가</label>
                        <div className="flex gap-sm">
                          {['상', '중', '하'].map((level) => (
                            <button
                              key={level}
                              type="button"
                              onClick={() => setLessonForm((prev) => ({ ...prev, performance: level }))}
                              className={`flex-1 py-2 rounded-lg font-semibold transition-all border ${
                                lessonForm.performance === level
                                  ? 'bg-primary text-white border-primary'
                                  : 'bg-white/60 text-text border-white/80'
                              }`}
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 space-y-1">
                      <label className="block text-sm font-semibold text-text mb-1">수업 메모</label>
                      <textarea
                        value={lessonForm.memo}
                        onChange={(e) => setLessonForm((prev) => ({ ...prev, memo: e.target.value }))}
                        placeholder="수업 메모, 반응, 특이사항"
                        className="w-full h-20 resize-none p-2 rounded-lg border border-white/80 bg-white/80 focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </>
                )}
              </>
            ) : (
              /* 일반 모드: 기존 UI (날씨 추천 + 전체 폼) */
              <>
                <div className="mb-4 p-3 rounded-lg border border-white/80 bg-white/60">
                  <p className="text-sm font-semibold text-text mb-1">날씨 기반 활동 제안</p>
                  <p className="text-sm text-text">{getRecommendationText()}</p>
                  <p className="text-xs text-textMuted mt-1">
                    {getSuggestionSummary(lessonRecommendation?.judgment)}
                  </p>
                  <div className="mt-3 max-h-20 overflow-y-auto">
                    <p className="text-xs font-semibold text-text mb-2">추천 활동</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestionActivities.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => handleApplySuggestion(suggestion)}
                          className="px-2.5 py-1.5 rounded-lg text-sm bg-white/80 border border-white/80 text-text hover:border-primary/60 hover:bg-primary/5 transition-all"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-text mb-1">수업 활동명</label>
                    <input
                      value={lessonForm.activity}
                      onChange={(e) => setLessonForm((prev) => ({ ...prev, activity: e.target.value }))}
                      placeholder="예: 빠르게 이어달리기"
                      className="w-full p-2 rounded-lg border border-white/80 bg-white/80 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-text mb-1">도메인</label>
                    <select
                      value={lessonForm.domain}
                      onChange={(e) => handleLessonDomainChange(e.target.value)}
                      className="w-full p-2 rounded-lg border border-white/80 bg-white/80 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      {LESSON_DOMAINS.map((domain) => (
                        <option key={domain} value={domain}>
                          {domain}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 mt-4">
                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-text mb-1">
                      차시 (도메인 누적)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={lessonForm.sequence}
                      onChange={(e) => setLessonForm((prev) => ({ ...prev, sequence: e.target.value }))}
                      className="w-full p-2 rounded-lg border border-white/80 bg-white/80 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-text mb-1">간편 평가</label>
                    <div className="flex gap-sm">
                      {['상', '중', '하'].map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setLessonForm((prev) => ({ ...prev, performance: level }))}
                          className={`flex-1 py-2 rounded-lg font-semibold transition-all border ${
                            lessonForm.performance === level
                              ? 'bg-primary text-white border-primary'
                              : 'bg-white/60 text-text border-white/80'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 mt-4">
                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-text mb-1">변형 사항</label>
                    <textarea
                      value={lessonForm.variation}
                      onChange={(e) => setLessonForm((prev) => ({ ...prev, variation: e.target.value }))}
                      placeholder="예: 공 간격 3m, 3명 조 편성"
                      className="w-full h-20 resize-none p-2 rounded-lg border border-white/80 bg-white/80 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-text mb-1">수업 메모</label>
                    <textarea
                      value={lessonForm.memo}
                      onChange={(e) => setLessonForm((prev) => ({ ...prev, memo: e.target.value }))}
                      placeholder="수업 메모, 반응, 특이사항"
                      className="w-full h-20 resize-none p-2 rounded-lg border border-white/80 bg-white/80 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-2 mt-4">
              {!isViewingExisting && (
                <button
                  onClick={handleSaveLessonLog}
                  className="flex-1 py-3 px-4 rounded-xl font-semibold transition-all"
                  style={{ backgroundColor: '#B3D9FF', color: '#1E5A9E' }}
                >
                  수업 기록 저장
                </button>
              )}
              <button
                onClick={closeLessonLog}
                className={`${isViewingExisting ? 'flex-1' : 'flex-1'} py-3 px-4 rounded-xl font-semibold transition-all bg-white/60 text-text border border-white/80`}
              >
                닫기
              </button>
            </div>
          </Modal>
        )
      })()}

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
                  borderColor: state.colorEditingClass.color?.bg === color.bg ? color.text : 'transparent',
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
