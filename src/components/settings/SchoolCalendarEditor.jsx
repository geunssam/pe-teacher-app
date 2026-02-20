// 학사 일정 편집 — 학기/방학 기간 + 공휴일/행사 관리 + 수업일수 요약 | 부모→SettingsPage.jsx, 훅→useSchoolCalendar.js
import { useState } from 'react'

const EVENT_TYPE_STYLES = {
  holiday: { label: '공휴일', className: 'bg-red-100 text-red-600' },
  skip:    { label: '수업없음', className: 'bg-gray-100 text-gray-600' },
  indoor:  { label: '실내전환', className: 'bg-blue-100 text-blue-600' },
  special: { label: '특별행사', className: 'bg-yellow-100 text-yellow-700' },
}

function getDayLabel(dateStr) {
  const days = ['일', '월', '화', '수', '목', '금', '토']
  const d = new Date(dateStr + 'T00:00:00')
  return days[d.getDay()]
}

function formatMonthDay(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export default function SchoolCalendarEditor({
  calendar,
  schoolDays,
  teachableWeeks,
  onUpdateSemester,
  onUpdateVacation,
  onAddEvent,
  onRemoveEvent,
  onApplyHolidays,
  onChangeYear,
  weeklyPEHours,
  totalPEHours,
}) {
  const [semesterOpen, setSemesterOpen] = useState(false)
  const [eventsOpen, setEventsOpen] = useState(true)

  // 학년도 기준 월 목록: 3월~다음해 2월
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const defaultMonth = currentMonth >= 3 ? currentMonth : currentMonth + 12 > 14 ? currentMonth : 3
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth)

  // 월 탭 목록 (3~12, 1~2)
  const monthTabs = []
  for (let m = 3; m <= 12; m++) monthTabs.push({ month: m, year: calendar.year })
  for (let m = 1; m <= 2; m++) monthTabs.push({ month: m, year: calendar.year + 1 })

  // 선택된 월의 이벤트 필터
  const selectedMonthEvents = (calendar.events || [])
    .filter((evt) => {
      const d = new Date(evt.date + 'T00:00:00')
      const evtMonth = d.getMonth() + 1
      const evtYear = d.getFullYear()
      const tab = monthTabs.find((t) => t.month === selectedMonth)
      return tab && evtMonth === tab.month && evtYear === tab.year
    })
    .sort((a, b) => a.date.localeCompare(b.date))

  // 공휴일 자동 추가 여부 확인
  const hasAutoHolidays = (calendar.events || []).some((e) => e.source === 'auto')

  // 행사 추가 폼 상태
  const [newDate, setNewDate] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [newType, setNewType] = useState('holiday')

  const handleAddEvent = (e) => {
    e.preventDefault()
    if (!newDate || !newLabel.trim()) return
    onAddEvent({ date: newDate, label: newLabel.trim(), type: newType })
    setNewDate('')
    setNewLabel('')
    setNewType('holiday')
  }

  // 학년도 선택 옵션 (현재 ±2년)
  const currentSchoolYear = calendar.year || new Date().getFullYear()
  const yearOptions = []
  for (let y = currentSchoolYear - 2; y <= currentSchoolYear + 2; y++) {
    yearOptions.push(y)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-md">
        <h2 className="text-card-title">학사 일정</h2>
        <select
          value={currentSchoolYear}
          onChange={(e) => onChangeYear(Number(e.target.value))}
          className="py-1.5 px-2 rounded-lg border border-gray-200 bg-white/60 text-sm font-semibold text-primary focus:outline-none focus:border-primary/50"
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>{y}학년도</option>
          ))}
        </select>
      </div>

      {/* Section 1: 학기/방학 기간 (Collapsible) */}
      <div className="mb-4">
        <button
          onClick={() => setSemesterOpen(!semesterOpen)}
          className="flex items-center justify-between w-full py-2 text-sm font-semibold text-gray-700"
        >
          <span>학기·방학 기간</span>
          <span className="text-gray-400 text-xs">{semesterOpen ? '▲' : '▼'}</span>
        </button>

        {semesterOpen && (
          <div className="space-y-3 mt-2">
            {/* 1학기 */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">1학기</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={calendar.semesters?.first?.startDate || ''}
                  onChange={(e) => onUpdateSemester('first', { ...calendar.semesters?.first, startDate: e.target.value })}
                  className="flex-1 py-2 px-3 rounded-lg border border-gray-200 bg-white/60 text-sm focus:outline-none focus:border-primary/50"
                />
                <span className="text-xs text-gray-400">~</span>
                <input
                  type="date"
                  value={calendar.semesters?.first?.endDate || ''}
                  onChange={(e) => onUpdateSemester('first', { ...calendar.semesters?.first, endDate: e.target.value })}
                  className="flex-1 py-2 px-3 rounded-lg border border-gray-200 bg-white/60 text-sm focus:outline-none focus:border-primary/50"
                />
              </div>
            </div>

            {/* 여름방학 */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">여름방학</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={calendar.vacations?.summer?.startDate || ''}
                  onChange={(e) => onUpdateVacation('summer', { ...calendar.vacations?.summer, startDate: e.target.value })}
                  className="flex-1 py-2 px-3 rounded-lg border border-gray-200 bg-white/60 text-sm focus:outline-none focus:border-primary/50"
                />
                <span className="text-xs text-gray-400">~</span>
                <input
                  type="date"
                  value={calendar.vacations?.summer?.endDate || ''}
                  onChange={(e) => onUpdateVacation('summer', { ...calendar.vacations?.summer, endDate: e.target.value })}
                  className="flex-1 py-2 px-3 rounded-lg border border-gray-200 bg-white/60 text-sm focus:outline-none focus:border-primary/50"
                />
              </div>
            </div>

            {/* 2학기 */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">2학기</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={calendar.semesters?.second?.startDate || ''}
                  onChange={(e) => onUpdateSemester('second', { ...calendar.semesters?.second, startDate: e.target.value })}
                  className="flex-1 py-2 px-3 rounded-lg border border-gray-200 bg-white/60 text-sm focus:outline-none focus:border-primary/50"
                />
                <span className="text-xs text-gray-400">~</span>
                <input
                  type="date"
                  value={calendar.semesters?.second?.endDate || ''}
                  onChange={(e) => onUpdateSemester('second', { ...calendar.semesters?.second, endDate: e.target.value })}
                  className="flex-1 py-2 px-3 rounded-lg border border-gray-200 bg-white/60 text-sm focus:outline-none focus:border-primary/50"
                />
              </div>
            </div>

            {/* 겨울방학 */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">겨울방학</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={calendar.vacations?.winter?.startDate || ''}
                  onChange={(e) => onUpdateVacation('winter', { ...calendar.vacations?.winter, startDate: e.target.value })}
                  className="flex-1 py-2 px-3 rounded-lg border border-gray-200 bg-white/60 text-sm focus:outline-none focus:border-primary/50"
                />
                <span className="text-xs text-gray-400">~</span>
                <input
                  type="date"
                  value={calendar.vacations?.winter?.endDate || ''}
                  onChange={(e) => onUpdateVacation('winter', { ...calendar.vacations?.winter, endDate: e.target.value })}
                  className="flex-1 py-2 px-3 rounded-lg border border-gray-200 bg-white/60 text-sm focus:outline-none focus:border-primary/50"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section 2: 수업일수 요약 (항상 표시) */}
      <div className="mb-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 bg-white/40 rounded-xl text-center border border-white/60">
            <div className="text-lg font-bold text-text">{schoolDays?.total ?? 0}</div>
            <div className="text-[10px] text-gray-400">총 수업일</div>
          </div>
          <div className="p-3 bg-white/40 rounded-xl text-center border border-white/60">
            <div className="text-lg font-bold text-text">{teachableWeeks?.length ?? 0}</div>
            <div className="text-[10px] text-gray-400">수업 주수</div>
          </div>
          <div className="p-3 bg-white/40 rounded-xl text-center border border-white/60">
            <div className="text-lg font-bold text-text">{totalPEHours ?? 0}</div>
            <div className="text-[10px] text-gray-400">체육 시수</div>
          </div>
        </div>
        <p className="text-[10px] text-gray-400 mt-1 text-center">
          1학기 {schoolDays?.first ?? 0}일 + 2학기 {schoolDays?.second ?? 0}일 · 주 {weeklyPEHours ?? 0}시간
        </p>
      </div>

      {/* Section 3: 공휴일/학교행사 (Collapsible) */}
      <div>
        <button
          onClick={() => setEventsOpen(!eventsOpen)}
          className="flex items-center justify-between w-full py-2 text-sm font-semibold text-gray-700"
        >
          <span>공휴일·학교행사</span>
          <span className="text-gray-400 text-xs">{eventsOpen ? '▲' : '▼'}</span>
        </button>

        {eventsOpen && (
          <div className="mt-2">
            {/* 월 탭 */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar mb-3">
              {monthTabs.map(({ month, year }) => (
                <button
                  key={`${year}-${month}`}
                  onClick={() => setSelectedMonth(month)}
                  className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    selectedMonth === month
                      ? 'bg-[#7C9EF5] text-white border-[#7C9EF5]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-[#7C9EF5]/50'
                  }`}
                >
                  {month}월
                </button>
              ))}
            </div>

            {/* 이벤트 리스트 */}
            {selectedMonthEvents.length > 0 ? (
              <div className="space-y-1.5 mb-3">
                {selectedMonthEvents.map((evt) => {
                  const typeStyle = EVENT_TYPE_STYLES[evt.type] || EVENT_TYPE_STYLES.special
                  return (
                    <div
                      key={evt.id || evt.date + evt.label}
                      className="flex items-center justify-between gap-2 px-3 py-2 bg-white/40 rounded-lg border border-white/60 text-xs"
                    >
                      <span className="font-medium text-text shrink-0">
                        {formatMonthDay(evt.date)} ({getDayLabel(evt.date)})
                      </span>
                      <span className="flex-1 text-textMuted truncate">{evt.label}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 ${typeStyle.className}`}>
                        {typeStyle.label}
                      </span>
                      <button
                        onClick={() => onRemoveEvent(evt.id)}
                        className="text-danger text-[10px] font-semibold hover:bg-danger/10 px-1.5 py-0.5 rounded shrink-0"
                      >
                        삭제
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-gray-400">
                이 달에 등록된 행사가 없습니다
              </div>
            )}

            {/* 행사 추가 폼 */}
            <form onSubmit={handleAddEvent} className="flex items-end gap-2 flex-wrap mt-3">
              <div className="flex-1 min-w-[120px]">
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full py-2 px-3 rounded-lg border border-gray-200 bg-white/60 text-sm focus:outline-none focus:border-[#7C9EF5]/50"
                />
              </div>
              <div className="flex-1 min-w-[100px]">
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="행사명"
                  maxLength={20}
                  className="w-full py-2 px-3 rounded-lg border border-gray-200 bg-white/60 text-sm focus:outline-none focus:border-[#7C9EF5]/50"
                />
              </div>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="py-2 px-2 rounded-lg border border-gray-200 bg-white/60 text-xs focus:outline-none"
              >
                <option value="holiday">공휴일</option>
                <option value="skip">수업없음</option>
                <option value="indoor">실내전환</option>
                <option value="special">특별행사</option>
              </select>
              <button
                type="submit"
                disabled={!newDate || !newLabel.trim()}
                className="py-2 px-3 rounded-lg text-sm font-semibold text-white bg-[#7C9EF5] disabled:opacity-40 transition-all"
              >
                추가
              </button>
            </form>

            {/* 공휴일 자동 추가 버튼 */}
            <button
              onClick={() => onApplyHolidays(calendar.year)}
              className="mt-3 w-full py-2.5 rounded-lg text-sm font-semibold border transition-all bg-white/60 text-gray-700 border-gray-200 hover:bg-white/80"
            >
              {hasAutoHolidays
                ? `${calendar.year}년 공휴일 갱신`
                : `${calendar.year}년 공휴일 자동 추가`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
