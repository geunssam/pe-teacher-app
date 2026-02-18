// 수업 이력 탭 — 학급별 수업 기록 리스트 + ACE 수업 흐름 표시 | 부모→RosterEditor
import { getRecordSortValue, formatRecordDate } from '../../utils/recordDate'

const getRecordText = (record, ...candidates) => {
  for (const key of candidates) {
    const value = record?.[key]
    if (value === undefined || value === null) continue
    const trimmed = String(value).trim()
    if (trimmed) return trimmed
  }
  return ''
}

export default function HistoryTab({ classInfo, classRecords, onExportPdf }) {
  const className = classInfo
    ? `${classInfo.grade}학년 ${classInfo.classNum}반`
    : '학급'
  const records = [...(classRecords || [])].sort((a, b) =>
    getRecordSortValue(b.recordedAt || b.createdAt || b.date) -
    getRecordSortValue(a.recordedAt || a.createdAt || a.date)
  )
  const hasHistory = records.length > 0
  const totalRecords = records.length

  const getRecordDisplayDate = (record) =>
    formatRecordDate(record?.recordedAt || record?.createdAt || record?.date)
  const getRecordClassDate = (record) => formatRecordDate(record?.classDate)

  return (
    <div>
      <div className="flex items-center justify-between mb-md">
        <h3 className="font-semibold text-text">{className} 이력</h3>
        <button
          onClick={onExportPdf}
          className="py-2 px-4 rounded-lg font-semibold text-sm transition-all"
          style={{ backgroundColor: '#1F2937', color: '#F8FAFC' }}
        >
          PDF 출력
        </button>
      </div>

      {hasHistory ? (
        <div className="space-y-md">
          <p className="text-caption text-muted">총 {totalRecords}차시 이력</p>
          {records.slice(0, 10).map((record, index) => {
            const dayLabel = record.dayLabel || '-'
            const rawSequence = Number(record.sequence)
            const periodNumber =
              Number.isFinite(rawSequence) && rawSequence > 0
                ? Math.trunc(rawSequence)
                : totalRecords - index
            const periodLabel = record.period ? `${record.period}교시` : '차시 미기록'
            const subtitle = [dayLabel, periodLabel].filter(Boolean)
            const activity = getRecordText(record, 'activity', 'name')
            const domain = getRecordText(record, 'domain', 'lessonType')
            const performance = getRecordText(record, 'performance', 'grade')
            const variation = getRecordText(record, 'variation', 'adjustment')
            const memo = getRecordText(record, 'memo', 'notes', 'memoText', 'note', 'description')
            const activityDate = getRecordDisplayDate(record)
            const classDate = getRecordClassDate(record)
            const hasDetail = !!(performance || variation || memo || record.aceLesson)
            const hasClassDate = classDate && classDate !== activityDate

            return (
              <div
                key={record.id || `${record.classId}-${record.recordedAt || record.createdAt || record.date || 'nodate'}-${index}`}
                className="p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-white/80 space-y-2"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-text">{activity || '수업 활동'}</span>
                  <span className="px-3 py-1 bg-primary/20 text-primary rounded-lg font-medium text-sm">
                    {domain || '스포츠'}
                  </span>
                </div>
                <p className="text-sm font-medium text-textMuted">
                  {periodNumber}차시 · {activityDate}
                  {hasClassDate ? <span className="ml-2">· 수업일 {classDate}</span> : null}
                </p>
                <p className="text-sm text-textMuted">{subtitle.join(' · ')}</p>
                {performance && <p className="text-sm text-text">평가: {performance}</p>}
                {variation && <p className="text-sm text-text">변형: {variation}</p>}
                {memo && <p className="text-sm text-text">메모: {memo}</p>}

                {record.aceLesson && (
                  <div className="mt-2 p-2.5 rounded-lg border border-[#7C9EF5]/20 bg-[#7C9EF5]/5">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-gray-800">ACE 수업 흐름</span>
                        {record.aceLesson._templateLabel && (
                          <span className="text-[9px] bg-[#7C9EF5]/15 text-[#7C9EF5] rounded-full px-1.5 py-0.5 font-medium">
                            {record.aceLesson._templateLabel}
                          </span>
                        )}
                      </div>
                      {record.aceLesson.totalMinutes && (
                        <span className="text-[10px] text-gray-400">{record.aceLesson.totalMinutes}분</span>
                      )}
                    </div>
                    {record.aceLesson.totalMinutes && (
                      <div className="flex rounded-full overflow-hidden h-1 mb-1.5 bg-gray-100">
                        {record.aceLesson.intro?.minutes > 0 && (
                          <div className="bg-gray-300" style={{ width: `${(record.aceLesson.intro.minutes / record.aceLesson.totalMinutes) * 100}%` }} />
                        )}
                        {record.aceLesson.acquire?.minutes > 0 && (
                          <div className="bg-[#7C9EF5]" style={{ width: `${(record.aceLesson.acquire.minutes / record.aceLesson.totalMinutes) * 100}%` }} />
                        )}
                        {record.aceLesson.challenge?.minutes > 0 && (
                          <div className="bg-[#F5A67C]" style={{ width: `${(record.aceLesson.challenge.minutes / record.aceLesson.totalMinutes) * 100}%` }} />
                        )}
                        {record.aceLesson.engage?.minutes > 0 && (
                          <div className="bg-[#A78BFA]" style={{ width: `${(record.aceLesson.engage.minutes / record.aceLesson.totalMinutes) * 100}%` }} />
                        )}
                        {record.aceLesson.wrapup?.minutes > 0 && (
                          <div className="bg-gray-300" style={{ width: `${(record.aceLesson.wrapup.minutes / record.aceLesson.totalMinutes) * 100}%` }} />
                        )}
                      </div>
                    )}
                    <div className="space-y-0.5 text-[10px]">
                      {record.aceLesson.acquire && (
                        <div className="flex gap-1.5">
                          <span className="shrink-0 text-[#7C9EF5] font-semibold w-10">A {record.aceLesson.acquire.minutes}'</span>
                          <span className="text-gray-600 truncate">{record.aceLesson.acquire.goal || record.aceLesson.acquire.drills?.[0]?.name || ''}</span>
                        </div>
                      )}
                      {record.aceLesson.challenge && (
                        <div className="flex gap-1.5">
                          <span className="shrink-0 text-[#F5A67C] font-semibold w-10">C {record.aceLesson.challenge.minutes}'</span>
                          <span className="text-gray-600 truncate">{record.aceLesson.challenge.goal || record.aceLesson.challenge.missions?.[0]?.name || ''}</span>
                        </div>
                      )}
                      {record.aceLesson.engage && (
                        <div className="flex gap-1.5">
                          <span className="shrink-0 text-[#A78BFA] font-semibold w-10">E {record.aceLesson.engage.minutes}'</span>
                          <span className="text-gray-600 truncate">{record.aceLesson.engage.goal || record.aceLesson.engage.game?.name || ''}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!hasDetail && !record.aceLesson && (
                  <p className="text-xs text-textMuted">상세 입력 정보가 없습니다.</p>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-textMuted">아직 수업 기록이 없습니다</p>
        </div>
      )}
    </div>
  )
}
