// 수업 이력 PDF 출력 — 새 창에서 HTML 테이블 인쇄 | 사용처→RosterEditor/HistoryTab
import { getRecordSortValue, formatRecordDate } from './recordDate'
import toast from 'react-hot-toast'

const escapeHtml = (text) =>
  String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

const getRecordText = (record, ...candidates) => {
  for (const key of candidates) {
    const value = record?.[key]
    if (value === undefined || value === null) continue
    const trimmed = String(value).trim()
    if (trimmed) return trimmed
  }
  return '-'
}

export function exportHistoryPdf(classInfo, classRecords) {
  if (!classRecords || classRecords.length === 0) {
    toast.error('출력할 수업 이력이 없습니다')
    return
  }

  const className = `${classInfo.grade}학년 ${classInfo.classNum}반`

  const sortedRecords = [...classRecords].sort(
    (a, b) =>
      getRecordSortValue(b.recordedAt || b.createdAt || b.date) -
      getRecordSortValue(a.recordedAt || a.createdAt || a.date)
  )

  const getRecordDisplayDate = (record) =>
    formatRecordDate(record?.recordedAt || record?.createdAt || record?.date)
  const getRecordClassDate = (record) =>
    record?.classDate ? formatRecordDate(record.classDate) : ''

  const rows = sortedRecords
    .map((record, index) => {
      const recordDate = getRecordDisplayDate(record)
      const classDate = getRecordClassDate(record)
      const activity = getRecordText(record, 'activity', 'title', 'name')
      const domain = getRecordText(record, 'domain', 'lessonType')
      const sequence =
        Number.isFinite(Number(record.sequence)) && Number(record.sequence) > 0
          ? String(Math.trunc(Number(record.sequence)))
          : '-'
      const dayLabel = record.dayLabel || '-'
      const periodLabel = record.period ? `${record.period}교시` : '차시 미기록'
      const variation = getRecordText(record, 'variation', 'description')
      const memo = getRecordText(record, 'memo', 'memoText', 'note', 'description')
      const performance = getRecordText(record, 'performance', 'grade', 'level')
      const classDateLabel =
        classDate && classDate !== recordDate ? ` · 수업일 ${classDate}` : ''

      return `<tr>
        <td>${escapeHtml(index + 1)}</td>
        <td>${escapeHtml(activity || '수업 활동')}</td>
        <td>${escapeHtml(domain || '스포츠')}</td>
        <td>${escapeHtml(sequence)}</td>
        <td>${escapeHtml(dayLabel)}</td>
        <td>${escapeHtml(periodLabel)}</td>
        <td>${escapeHtml(performance)}</td>
        <td>${escapeHtml(variation)}</td>
        <td>${escapeHtml(memo)}</td>
        <td>${escapeHtml(recordDate)}${escapeHtml(classDateLabel)}</td>
      </tr>`
    })
    .join('')

  const printContentHtml = `<!doctype html>
    <html lang="ko">
      <head>
        <meta charset="UTF-8" />
        <title>${className} 수업 이력</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
          h1 { margin: 0 0 8px; }
          p { margin: 4px 0 16px; color: #64748b; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 12px; }
          thead { background: #f8fafc; }
        </style>
      </head>
      <body>
        <h1>${className} 수업 이력</h1>
        <p>총 ${sortedRecords.length}건</p>
        <table>
          <thead>
            <tr>
              <th>번호</th><th>활동</th><th>도메인</th><th>차시</th>
              <th>요일</th><th>교시</th><th>평가</th><th>변형</th><th>메모</th><th>날짜</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>`

  const printWindow = window.open('', '_blank', 'noopener,noreferrer')
  if (!printWindow) {
    toast.error('팝업이 차단되어 출력할 수 없습니다')
    return
  }

  let isPrinted = false
  const cleanup = () => {
    if (isPrinted) return
    isPrinted = true
    if (printWindow && !printWindow.closed) printWindow.close()
  }

  const doPrint = () => {
    if (!printWindow || printWindow.closed || !printWindow.document) return
    try {
      printWindow.focus()
      printWindow.print()
    } catch (_error) { /* pass */ }
    setTimeout(cleanup, 800)
  }

  printWindow.addEventListener('load', () => setTimeout(doPrint, 200), { once: true })
  printWindow.document.open()
  printWindow.document.write(printContentHtml)
  printWindow.document.close()
  setTimeout(doPrint, 900)
}
