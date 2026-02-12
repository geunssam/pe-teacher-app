import { useState } from 'react'
import { useSchedule } from '../../hooks/useSchedule'
import { useClassManager } from '../../hooks/useClassManager'
import toast from 'react-hot-toast'

export default function BulkScheduleSetup({ onClose }) {
  const { WEEKDAYS, WEEKDAY_LABELS, MAX_PERIODS, updateBaseCell } = useSchedule()
  const { classes } = useClassManager()

  // 초기 빈 시간표 생성
  const createEmptySchedule = () => {
    const schedule = {}
    WEEKDAYS.forEach((day) => {
      for (let period = 1; period <= MAX_PERIODS; period++) {
        schedule[`${day}-${period}`] = null
      }
    })
    return schedule
  }

  const [schedule, setSchedule] = useState(createEmptySchedule())
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '')

  const handleCellClick = (day, period) => {
    const cellKey = `${day}-${period}`
    const currentValue = schedule[cellKey]

    if (!currentValue) {
      // 비어있으면 선택된 학급 넣기
      const selectedClass = classes.find((c) => c.id === selectedClassId)
      if (selectedClass) {
        setSchedule((prev) => ({
          ...prev,
          [cellKey]: {
            classId: selectedClass.id,
            className: `${selectedClass.grade}학년 ${selectedClass.classNum}반`,
            subject: '체육',
            memo: ''
          }
        }))
      }
    } else {
      // 이미 있으면 비우기
      setSchedule((prev) => ({ ...prev, [cellKey]: null }))
    }
  }

  const handleSave = () => {
    // 모든 셀을 기본 시간표에 저장
    Object.keys(schedule).forEach((cellKey) => {
      const data = schedule[cellKey]
      if (data) {
        updateBaseCell(cellKey, data)
      }
    })

    toast.success('기본 시간표가 저장되었습니다')

    // 저장 후 약간의 지연을 주고 닫기
    setTimeout(() => {
      onClose()
    }, 300)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
      <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-glass-strong w-full max-w-5xl max-h-[90vh] flex flex-col border border-white/60">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-xl border-b border-primary/20">
          <div>
            <h2 className="text-card-title">📋 기본 시간표 설정</h2>
            <p className="text-caption text-muted mt-1">
              학급을 선택하고 셀을 클릭하세요 (다시 클릭하면 삭제)
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* 학급 선택 드롭다운 */}
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="py-2 px-4 bg-white/80 border border-white/80 rounded-lg font-semibold text-text focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
            >
              {classes.map((classInfo) => (
                <option key={classInfo.id} value={classInfo.id}>
                  {classInfo.grade}학년 {classInfo.classNum}반
                </option>
              ))}
            </select>

            <button onClick={onClose} className="btn-icon hover:bg-danger/10">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        {/* 내용 */}
        <div className="flex-1 overflow-auto p-lg">
          <div>
            {/* 헤더: 요일 */}
            <div className="grid grid-cols-[50px_repeat(5,1fr)] gap-1.5 mb-1.5">
              <div className="p-1"></div>
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="p-2 bg-white/60 rounded-lg text-center font-bold text-sm text-text"
                >
                  {WEEKDAY_LABELS[day]}
                </div>
              ))}
            </div>

            {/* 교시별 행 */}
            {Array.from({ length: MAX_PERIODS }, (_, i) => i + 1).map((period) => (
              <div key={period} className="grid grid-cols-[50px_repeat(5,1fr)] gap-1.5 mb-1.5">
                {/* 교시 번호 */}
                <div className="p-2 bg-white/60 rounded-lg flex items-center justify-center font-bold text-sm text-primary whitespace-nowrap">
                  {period}
                </div>

                {/* 각 요일별 셀 */}
                {WEEKDAYS.map((day) => {
                  const cellKey = `${day}-${period}`
                  const cellData = schedule[cellKey]
                  const classColor = cellData
                    ? classes.find((c) => c.id === cellData.classId)?.color
                    : null

                  return (
                    <div
                      key={cellKey}
                      onClick={() => handleCellClick(day, period)}
                      className="p-2 rounded-lg min-h-[50px] flex items-center justify-center cursor-pointer transition-all border border-white/60 hover:scale-105"
                      style={{
                        backgroundColor: classColor?.bg || 'rgba(255, 255, 255, 0.4)',
                        color: classColor?.text || '#718096'
                      }}
                    >
                      {cellData ? (
                        <div className="text-xs font-semibold text-center leading-tight">
                          {cellData.className}
                        </div>
                      ) : (
                        <div className="text-[10px] text-textMuted">클릭</div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="p-lg border-t border-primary/10 flex gap-3">
          <button
            onClick={() => setSchedule(createEmptySchedule())}
            className="py-2 px-4 bg-white/60 text-text rounded-lg font-medium hover:bg-white/80 transition-all border border-white/80"
          >
            초기화
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 px-4 rounded-xl font-semibold transition-all"
            style={{ backgroundColor: '#B3D9FF', color: '#1E5A9E' }}
          >
            저장
          </button>
          <button
            onClick={onClose}
            className="py-2 px-4 bg-white/60 text-text rounded-lg font-medium hover:bg-white/80 transition-all border border-white/80"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  )
}
