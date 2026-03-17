// 학생 명단 편집 — PEPick 스타일 4열 pill + 드래그앤드롭 + 성별 색상 | 부모→pages/ClassesPage.jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { HexColorPicker } from 'react-colorful'
import { useClassManager } from '../../hooks/useClassManager'
import { CLASS_COLOR_PRESETS } from '../../constants/classColors'
import toast from 'react-hot-toast'
import { confirm } from '../common/ConfirmDialog'
import { generateStudentId } from '../../utils/generateId'
import { exportHistoryPdf } from '../../utils/exportHistoryPdf'
import HistoryTab from './HistoryTab'
import StudentPill from './StudentPill'

export default function RosterEditor({ classInfo, onClose }) {
  const { getRoster, getClassRecords, updateRoster, setClassColor, reorderStudent } = useClassManager()
  const [activeTab, setActiveTab] = useState('roster')
  const [localRoster, setLocalRoster] = useState([])
  const [hasChanges, setHasChanges] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [selectedColor, setSelectedColor] = useState(classInfo.color || CLASS_COLOR_PRESETS[0])
  const [customBgColor, setCustomBgColor] = useState(classInfo.color?.bg || CLASS_COLOR_PRESETS[0].bg)
  const [customTextColor, setCustomTextColor] = useState(classInfo.color?.text || CLASS_COLOR_PRESETS[0].text)
  const classRecords = getClassRecords(classInfo.id)

  // 입력 카드 상태
  const [editingStudent, setEditingStudent] = useState(null) // null = 추가 모드, student = 편집 모드
  const [inputNum, setInputNum] = useState('')
  const [inputName, setInputName] = useState('')
  const [inputGender, setInputGender] = useState('남')

  // 드래그앤드롭 상태
  const dragRef = useRef({ dragId: null, overId: null, position: null })
  const [dragState, setDragState] = useState({ dragId: null, overId: null, position: null })

  // 일괄 입력
  const [showBulkInput, setShowBulkInput] = useState(false)
  const [bulkText, setBulkText] = useState('')

  useEffect(() => {
    const initialRoster = getRoster(classInfo.id)
    setLocalRoster([...initialRoster])
  }, [classInfo.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // 입력 카드 초기화
  const resetInputCard = useCallback(() => {
    setEditingStudent(null)
    setInputNum(String(localRoster.length + 1))
    setInputName('')
    setInputGender('남')
  }, [localRoster.length])

  useEffect(() => {
    setInputNum(String(localRoster.length + 1))
  }, [localRoster.length])

  // pill 클릭 → 편집 모드
  const handlePillClick = (student) => {
    setEditingStudent(student)
    setInputNum(String(student.num))
    setInputName(student.name)
    setInputGender(student.gender || '남')
  }

  // 학생 추가/수정
  const handleSubmitStudent = () => {
    if (!inputName.trim()) {
      toast.error('이름을 입력해주세요')
      return
    }

    if (editingStudent) {
      // 편집 모드
      setLocalRoster((prev) =>
        prev.map((s) =>
          s.id === editingStudent.id
            ? { ...s, name: inputName.trim(), gender: inputGender }
            : s
        )
      )
      toast.success('학생 정보가 수정되었습니다')
    } else {
      // 추가 모드
      const newStudent = {
        id: generateStudentId(),
        num: localRoster.length + 1,
        name: inputName.trim(),
        gender: inputGender,
        note: '',
      }
      setLocalRoster((prev) => [...prev, newStudent])
      toast.success('학생이 추가되었습니다')
    }

    setHasChanges(true)
    resetInputCard()
  }

  // 학생 삭제
  const handleRemoveStudent = async (studentId) => {
    const confirmed = await confirm('정말 삭제하시겠습니까?', '삭제', '취소')
    if (confirmed) {
      setLocalRoster((prev) =>
        prev
          .filter((s) => s.id !== studentId)
          .map((s, i) => ({ ...s, num: i + 1 }))
      )
      setHasChanges(true)
      if (editingStudent?.id === studentId) resetInputCard()
      toast.success('학생이 삭제되었습니다')
    }
  }

  // 일괄 입력
  const handleBulkImport = () => {
    if (!bulkText.trim()) {
      toast.error('이름을 입력해주세요')
      return
    }
    const names = bulkText.split(/[\n,]/).map((n) => n.trim()).filter((n) => n.length > 0)
    const updatedRoster = names.map((name, index) => {
      const existing = localRoster[index]
      if (existing) return { ...existing, name }
      return { id: generateStudentId(), num: index + 1, name, gender: '남', note: '' }
    })
    setLocalRoster(updatedRoster)
    setHasChanges(true)
    setBulkText('')
    setShowBulkInput(false)
    toast.success('명단이 입력되었습니다')
  }

  // CSV 업로드
  const handleCsvUpload = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.csv,.txt'
    input.onchange = (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (evt) => {
        const text = evt.target?.result || ''
        const lines = text.split(/[\n\r]+/).filter((l) => l.trim())
        const students = lines.map((line, idx) => {
          const parts = line.split(',').map((p) => p.trim())
          const name = parts[0] || ''
          const gender = parts[1] === '여' ? '여' : '남'
          const existing = localRoster[idx]
          return existing
            ? { ...existing, name, gender }
            : { id: generateStudentId(), num: idx + 1, name, gender, note: '' }
        })
        setLocalRoster(students)
        setHasChanges(true)
        toast.success(`${students.length}명 불러왔습니다`)
      }
      reader.readAsText(file)
    }
    input.click()
  }

  // 템플릿 다운로드
  const handleTemplateDownload = () => {
    const header = '이름,성별'
    const rows = localRoster.map((s) => `${s.name || ''},${s.gender || '남'}`)
    const csv = [header, ...rows].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${classInfo.grade}학년${classInfo.classNum}반_명단.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('템플릿이 다운로드되었습니다')
  }

  // 드래그앤드롭 핸들러
  const handleDragStart = (e, studentId) => {
    dragRef.current.dragId = studentId
    setDragState((prev) => ({ ...prev, dragId: studentId }))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, studentId) => {
    e.preventDefault()
    if (!dragRef.current.dragId || dragRef.current.dragId === studentId) return

    const rect = e.currentTarget.getBoundingClientRect()
    const midX = rect.left + rect.width / 2
    const position = e.clientX < midX ? 'before' : 'after'

    dragRef.current.overId = studentId
    dragRef.current.position = position
    setDragState({ dragId: dragRef.current.dragId, overId: studentId, position })
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const { dragId, overId, position } = dragRef.current
    if (dragId && overId && dragId !== overId) {
      // 로컬 상태에서 직접 reorder
      setLocalRoster((prev) => {
        const arr = [...prev]
        const dragIdx = arr.findIndex((s) => s.id === dragId)
        const dropIdx = arr.findIndex((s) => s.id === overId)
        if (dragIdx === -1 || dropIdx === -1) return prev

        const [moved] = arr.splice(dragIdx, 1)
        const insertIdx = position === 'after'
          ? dropIdx + (dragIdx < dropIdx ? 0 : 1)
          : dropIdx - (dragIdx < dropIdx ? 1 : 0)
        arr.splice(insertIdx < 0 ? 0 : insertIdx, 0, moved)
        return arr.map((s, i) => ({ ...s, num: i + 1 }))
      })
      setHasChanges(true)
    }

    dragRef.current = { dragId: null, overId: null, position: null }
    setDragState({ dragId: null, overId: null, position: null })
  }

  const handleDragEnd = () => {
    dragRef.current = { dragId: null, overId: null, position: null }
    setDragState({ dragId: null, overId: null, position: null })
  }

  // 저장 / 닫기
  const handleSave = () => {
    updateRoster(classInfo.id, localRoster)
    setHasChanges(false)
    toast.success('저장되었습니다')
  }

  const handleClose = () => {
    if (hasChanges) setShowCloseConfirm(true)
    else onClose()
  }

  const handleSaveAndClose = () => {
    updateRoster(classInfo.id, localRoster)
    setHasChanges(false)
    toast.success('저장되었습니다')
    setTimeout(() => onClose(), 500)
  }

  const handleExportHistoryPdf = () => exportHistoryPdf(classInfo, classRecords)

  // 성별 통계
  const genderStats = localRoster.reduce(
    (acc, s) => {
      if (s.gender === '남') acc.male++
      else if (s.gender === '여') acc.female++
      else acc.unknown++
      return acc
    },
    { male: 0, female: 0, unknown: 0 }
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-glass-strong w-full max-w-4xl h-[85vh] flex flex-col border border-white/60">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-xl border-b border-primary/20">
          <div>
            <h2 className="text-card-title mb-xs">
              {classInfo.grade}학년 {classInfo.classNum}반
            </h2>
            <p className="text-caption text-muted">
              학생 {localRoster.length}명 (남 {genderStats.male} · 여 {genderStats.female})
            </p>
          </div>
          <button onClick={handleClose} className="btn-icon hover:bg-danger/10">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-primary/10">
          {[
            { key: 'roster', label: '명단 관리' },
            { key: 'color', label: '색상 설정' },
            { key: 'history', label: '수업 이력' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-6 py-3 font-semibold transition-all ${
                activeTab === tab.key
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-textMuted hover:text-text'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 내용 */}
        <div className="flex-1 overflow-y-auto p-lg">
          {activeTab === 'roster' && (
            <div>
              {/* 성별 통계 배지 */}
              <div className="flex gap-sm mb-md">
                <div className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ backgroundColor: 'rgba(100,149,237,0.12)', color: '#4169b2' }}>
                  남 {genderStats.male}명
                </div>
                <div className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ backgroundColor: 'rgba(255,105,180,0.12)', color: '#d1478c' }}>
                  여 {genderStats.female}명
                </div>
                {genderStats.unknown > 0 && (
                  <div className="px-3 py-1.5 bg-textMuted/15 text-textMuted rounded-lg text-xs font-semibold">
                    미지정 {genderStats.unknown}명
                  </div>
                )}
              </div>

              {/* 일괄 입력 토글 */}
              {showBulkInput && (
                <div className="mb-md p-md bg-white/60 backdrop-blur-sm rounded-xl border border-white/80">
                  <label className="block font-semibold mb-2 text-text text-sm">
                    이름 일괄 입력 (줄바꿈 또는 쉼표로 구분)
                  </label>
                  <textarea
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder="홍길동&#10;김철수&#10;이영희"
                    className="w-full h-32 mb-sm resize-none p-3 bg-white/80 border border-white/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all text-sm"
                  />
                  <div className="flex gap-sm">
                    <button onClick={handleBulkImport} className="flex-1 py-2 px-4 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-all shadow-sm text-sm">
                      입력 완료
                    </button>
                    <button onClick={() => { setShowBulkInput(false); setBulkText('') }} className="flex-1 py-2 px-4 bg-white/60 text-text rounded-lg font-medium hover:bg-white/80 transition-all border border-white/80 text-sm">
                      취소
                    </button>
                  </div>
                </div>
              )}

              {/* 4열 pill 그리드 */}
              <div className="grid grid-cols-4 gap-2 mb-md" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
                {localRoster.map((student) => (
                  <StudentPill
                    key={student.id}
                    student={student}
                    draggable
                    isDragging={dragState.dragId === student.id}
                    isEditing={editingStudent?.id === student.id}
                    dropIndicator={dragState.overId === student.id ? dragState.position : null}
                    onClick={() => handlePillClick(student)}
                    onRemove={handleRemoveStudent}
                    onDragStart={(e) => handleDragStart(e, student.id)}
                    onDragOver={(e) => handleDragOver(e, student.id)}
                    onDragEnd={handleDragEnd}
                    onDrop={handleDrop}
                  />
                ))}
              </div>

              {/* 학생 입력 카드 (PEPick roster-add-card) */}
              <div
                className={`p-3 rounded-xl backdrop-blur-sm mb-md transition-all ${
                  editingStudent
                    ? 'border-2 border-solid border-blue-500/45 bg-blue-50/30'
                    : 'border-2 border-dashed border-primary/35 bg-primary/[0.04]'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  {/* 번호 */}
                  <input
                    type="number"
                    value={inputNum}
                    onChange={(e) => setInputNum(e.target.value)}
                    className="w-14 py-1.5 px-2 bg-white/80 border border-white/80 rounded-lg text-center text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="번호"
                    disabled={!!editingStudent}
                  />
                  {/* 이름 */}
                  <input
                    type="text"
                    value={inputName}
                    onChange={(e) => setInputName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmitStudent()}
                    className="flex-1 min-w-[100px] py-1.5 px-3 bg-white/80 border border-white/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="이름 입력"
                    autoFocus
                  />
                  {/* 성별 토글 */}
                  <div className="flex rounded-lg overflow-hidden border border-gray-200/60">
                    <button
                      type="button"
                      onClick={() => setInputGender('남')}
                      className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                        inputGender === '남'
                          ? 'text-blue-600'
                          : 'bg-white/60 text-gray-400'
                      }`}
                      style={inputGender === '남' ? { backgroundColor: 'rgba(100,149,237,0.18)' } : undefined}
                    >
                      남
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputGender('여')}
                      className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                        inputGender === '여'
                          ? 'text-pink-600'
                          : 'bg-white/60 text-gray-400'
                      }`}
                      style={inputGender === '여' ? { backgroundColor: 'rgba(255,105,180,0.18)' } : undefined}
                    >
                      여
                    </button>
                  </div>
                  {/* 추가/수정 버튼 */}
                  <button
                    onClick={handleSubmitStudent}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all hover:brightness-[0.94]"
                    style={{ backgroundColor: '#d6eaf8', color: '#2471a3' }}
                  >
                    {editingStudent ? '수정' : '추가'}
                  </button>
                  {/* 취소 버튼 (편집 중일 때만) */}
                  {editingStudent && (
                    <button
                      onClick={resetInputCard}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:brightness-[0.94]"
                      style={{ backgroundColor: '#fce4ec', color: '#c0392b' }}
                    >
                      취소
                    </button>
                  )}
                </div>
              </div>

              {/* 하단 버튼 — 파스텔 4색 */}
              <div className="flex gap-1.5">
                <button
                  onClick={handleTemplateDownload}
                  className="flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all hover:brightness-[0.94]"
                  style={{ backgroundColor: '#d4edda', color: '#2d5f3f' }}
                >
                  템플릿 다운
                </button>
                <button
                  onClick={handleCsvUpload}
                  className="flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all hover:brightness-[0.94]"
                  style={{ backgroundColor: '#e8daef', color: '#6c3483' }}
                >
                  CSV 업로드
                </button>
                <button
                  onClick={() => setShowBulkInput(!showBulkInput)}
                  className="flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all hover:brightness-[0.94]"
                  style={{ backgroundColor: '#fce4ec', color: '#c0392b' }}
                >
                  일괄 입력
                </button>
                <button
                  onClick={handleSave}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all hover:brightness-[0.94] ${hasChanges ? 'shadow-md' : 'opacity-70'}`}
                  style={{ backgroundColor: '#d6eaf8', color: '#2471a3' }}
                >
                  {hasChanges ? '💾 저장' : '저장됨'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'color' && (
            <div>
              {/* 미리보기 */}
              <div className="mb-4 p-4 rounded-xl text-center" style={{ backgroundColor: customBgColor }}>
                <div className="text-xl font-bold mb-1" style={{ color: customTextColor }}>
                  {classInfo.grade}학년 {classInfo.classNum}반
                </div>
                <div className="text-xs" style={{ color: `${customTextColor}cc` }}>미리보기</div>
              </div>

              {/* 프리셋 */}
              <div className="mb-4">
                <h3 className="font-semibold text-text mb-2 text-sm">프리셋 색상</h3>
                <div className="grid grid-cols-4 gap-2">
                  {CLASS_COLOR_PRESETS.map((color, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSelectedColor(color)
                        setCustomBgColor(color.bg)
                        setCustomTextColor(color.text)
                        setClassColor(classInfo.id, color)
                        toast.success('색상이 변경되었습니다')
                      }}
                      className="p-2 rounded-lg hover:scale-105 transition-all border-3"
                      style={{ backgroundColor: color.bg, borderColor: customBgColor === color.bg ? color.text : 'transparent' }}
                    >
                      <div className="text-xs font-semibold" style={{ color: color.text }}>{color.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 커스텀 */}
              <div>
                <h3 className="font-semibold text-text mb-2 text-sm">커스텀 색상</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-text mb-1">배경 색상</label>
                    <HexColorPicker color={customBgColor} onChange={setCustomBgColor} style={{ width: '100%', height: '120px' }} />
                    <input type="text" value={customBgColor} onChange={(e) => setCustomBgColor(e.target.value)} className="mt-2 w-full py-1.5 px-2 bg-white/80 border border-white/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 text-center font-mono text-xs" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text mb-1">텍스트 색상</label>
                    <HexColorPicker color={customTextColor} onChange={setCustomTextColor} style={{ width: '100%', height: '120px' }} />
                    <input type="text" value={customTextColor} onChange={(e) => setCustomTextColor(e.target.value)} className="mt-2 w-full py-1.5 px-2 bg-white/80 border border-white/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 text-center font-mono text-xs" />
                  </div>
                </div>
                <button
                  onClick={() => {
                    const customColor = { bg: customBgColor, text: customTextColor, name: '커스텀' }
                    setSelectedColor(customColor)
                    setClassColor(classInfo.id, customColor)
                    toast.success('커스텀 색상이 적용되었습니다')
                  }}
                  className="mt-3 w-full py-2.5 px-4 rounded-xl font-semibold transition-all hover:brightness-[0.94]"
                  style={{ backgroundColor: '#d6eaf8', color: '#2471a3' }}
                >
                  적용
                </button>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <HistoryTab classInfo={classInfo} classRecords={classRecords} onExportPdf={handleExportHistoryPdf} />
          )}
        </div>
      </div>

      {/* 닫기 확인 모달 */}
      {showCloseConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-glass-strong max-w-sm w-full p-6 border border-white/60">
            <p className="text-text text-center mb-6 whitespace-pre-line leading-relaxed">
              저장하지 않은 변경사항이 있습니다.<br />저장하지 않고 닫으시겠습니까?
            </p>
            <div className="flex gap-3">
              <button onClick={handleSaveAndClose} className="flex-1 py-3 px-4 rounded-xl font-semibold transition-all leading-tight hover:brightness-[0.94]" style={{ backgroundColor: '#d6eaf8', color: '#2471a3' }}>
                저장 후<br />닫기
              </button>
              <button onClick={() => setShowCloseConfirm(false)} className="flex-1 py-3 px-4 rounded-xl font-semibold transition-all hover:brightness-[0.94]" style={{ backgroundColor: '#FFF9C4', color: '#8B7D00' }}>
                취소
              </button>
              <button onClick={onClose} className="flex-1 py-3 px-4 rounded-xl font-semibold transition-all hover:brightness-[0.94]" style={{ backgroundColor: '#fce4ec', color: '#c0392b' }}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
