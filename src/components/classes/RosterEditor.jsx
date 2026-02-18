// 학생 명단 편집 — 학급별 학생 이름 추가/수정/삭제 | 부모→pages/ClassesPage.jsx, 데이터→hooks/useClassManager.js
import { useState, useEffect } from 'react'
import { HexColorPicker } from 'react-colorful'
import { useClassManager, CLASS_COLOR_PRESETS } from '../../hooks/useClassManager'
import toast from 'react-hot-toast'
import { confirm } from '../common/ConfirmDialog'
import { generateStudentId } from '../../utils/generateId'
import { exportHistoryPdf } from '../../utils/exportHistoryPdf'
import HistoryTab from './HistoryTab'

export default function RosterEditor({ classInfo, onClose }) {
  const { getRoster, getClassRecords, updateRoster, setClassColor } = useClassManager()
  const [activeTab, setActiveTab] = useState('roster') // roster | history | color
  const [showBulkInput, setShowBulkInput] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [localRoster, setLocalRoster] = useState([])
  const [hasChanges, setHasChanges] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [selectedColor, setSelectedColor] = useState(classInfo.color || CLASS_COLOR_PRESETS[0])
  const [customBgColor, setCustomBgColor] = useState(classInfo.color?.bg || CLASS_COLOR_PRESETS[0].bg)
  const [customTextColor, setCustomTextColor] = useState(classInfo.color?.text || CLASS_COLOR_PRESETS[0].text)
  const [isEditMode, setIsEditMode] = useState(false)
  const classRecords = getClassRecords(classInfo.id)

  // 초기 로스터 로드
  useEffect(() => {
    const initialRoster = getRoster(classInfo.id)
    setLocalRoster([...initialRoster])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classInfo.id])

  const handleNameChange = (studentId, name) => {
    setLocalRoster((prev) =>
      prev.map((student) =>
        student.id === studentId ? { ...student, name } : student
      )
    )
    setHasChanges(true)
  }

  const handleGenderChange = (studentId, gender) => {
    setLocalRoster((prev) =>
      prev.map((student) =>
        student.id === studentId ? { ...student, gender } : student
      )
    )
    setHasChanges(true)
  }

  const handleAddStudent = () => {
    const newStudent = {
      id: generateStudentId(),
      num: localRoster.length + 1,
      name: '',
      gender: '남',
      note: '',
    }
    setLocalRoster((prev) => [...prev, newStudent])
    setHasChanges(true)
    toast.success('학생이 추가되었습니다')
  }

  const handleRemoveStudent = async (studentId) => {
    const confirmed = await confirm('정말 삭제하시겠습니까?', '삭제', '취소')

    if (confirmed) {
      setLocalRoster((prev) =>
        prev
          .filter((student) => student.id !== studentId)
          .map((student, index) => ({
            ...student,
            num: index + 1,
          }))
      )
      setHasChanges(true)
      toast.success('학생이 삭제되었습니다')
    }
  }

  const handleBulkImport = () => {
    if (!bulkText.trim()) {
      toast.error('이름을 입력해주세요')
      return
    }

    const names = bulkText
      .split(/[\n,]/)
      .map((name) => name.trim())
      .filter((name) => name.length > 0)

    const updatedRoster = names.map((name, index) => {
      const existingStudent = localRoster[index]

      if (existingStudent) {
        return { ...existingStudent, name }
      } else {
        return {
          id: generateStudentId(),
          num: index + 1,
          name,
          gender: '남',
          note: '',
        }
      }
    })

    setLocalRoster(updatedRoster)
    setHasChanges(true)
    toast.success('명단이 입력되었습니다')
    setBulkText('')
    setShowBulkInput(false)
  }

  const handleSave = () => {
    updateRoster(classInfo.id, localRoster)
    setHasChanges(false)
    toast.success('저장되었습니다')
  }

  const handleClose = () => {
    if (hasChanges) {
      setShowCloseConfirm(true)
    } else {
      onClose()
    }
  }

  const handleSaveAndClose = () => {
    updateRoster(classInfo.id, localRoster)
    setHasChanges(false)
    toast.success('저장되었습니다')
    setTimeout(() => {
      onClose()
    }, 500)
  }

  const handleCloseWithoutSave = () => {
    onClose()
  }

  const handleExportHistoryPdf = () => exportHistoryPdf(classInfo, classRecords)

  const genderStats = localRoster.reduce(
    (acc, student) => {
      if (student.gender === '남') acc.male++
      else if (student.gender === '여') acc.female++
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
              학생 {localRoster.length}명
            </p>
          </div>

          <button
            onClick={handleClose}
            className="btn-icon hover:bg-danger/10"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-primary/10">
          <button
            onClick={() => setActiveTab('roster')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'roster'
                ? 'text-primary border-b-2 border-primary'
                : 'text-textMuted hover:text-text'
            }`}
          >
            명단 관리
          </button>
          <button
            onClick={() => setActiveTab('color')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'color'
                ? 'text-primary border-b-2 border-primary'
                : 'text-textMuted hover:text-text'
            }`}
          >
            색상 설정
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'history'
                ? 'text-primary border-b-2 border-primary'
                : 'text-textMuted hover:text-text'
            }`}
          >
            수업 이력
          </button>
        </div>

        {/* 내용 */}
        <div className="flex-1 overflow-y-auto p-lg">
          {activeTab === 'roster' && (
            <div>
              {/* 성별 통계 + 버튼들 */}
              <div className="flex items-center justify-between mb-md">
                <div className="flex gap-sm">
                  <div className="px-4 py-2 bg-primary/20 text-primary rounded-lg font-semibold text-base">
                    남 {genderStats.male}명
                  </div>
                  <div className="px-4 py-2 bg-danger/20 text-danger rounded-lg font-semibold text-base">
                    여 {genderStats.female}명
                  </div>
                  {genderStats.unknown > 0 && (
                    <div className="px-4 py-2 bg-textMuted/20 text-textMuted rounded-lg font-semibold text-base">
                      미지정 {genderStats.unknown}명
                    </div>
                  )}
                </div>

                <div className="flex gap-sm">
                  <button
                    onClick={() => setShowBulkInput(!showBulkInput)}
                    className="py-2 px-4 rounded-lg font-semibold hover:opacity-90 transition-all text-sm"
                    style={{ backgroundColor: '#B4E4C1', color: '#2D5F3F' }}
                  >
                    이름 일괄입력
                  </button>
                  <button
                    onClick={handleAddStudent}
                    className="py-2 px-4 rounded-lg font-semibold hover:opacity-90 transition-all text-sm"
                    style={{ backgroundColor: '#FFF9C4', color: '#8B7D00' }}
                  >
                    + 학생 추가
                  </button>
                  <button
                    onClick={() => setIsEditMode(!isEditMode)}
                    className="py-2 px-4 rounded-lg font-semibold hover:opacity-90 transition-all text-sm"
                    style={{
                      backgroundColor: isEditMode ? '#FFB3B3' : '#EDE9FE',
                      color: isEditMode ? '#B71C1C' : '#5B21B6'
                    }}
                  >
                    {isEditMode ? '완료' : '편집'}
                  </button>
                  <button
                    onClick={handleSave}
                    className={`py-2 px-4 rounded-lg font-semibold hover:opacity-90 transition-all text-sm flex items-center gap-2 ${
                      hasChanges ? 'shadow-md' : 'opacity-70'
                    }`}
                    style={{ backgroundColor: '#B3D9FF', color: '#1E5A9E' }}
                    title={hasChanges ? '저장 필요' : '저장됨'}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                      <polyline points="17 21 17 13 7 13 7 21"></polyline>
                      <polyline points="7 3 7 8 15 8"></polyline>
                    </svg>
                    {hasChanges ? '저장' : '저장됨'}
                  </button>
                </div>
              </div>

              {/* 일괄 입력 (열렸을 때만 표시) */}
              {showBulkInput && (
                <div className="mb-md p-md bg-white/60 backdrop-blur-sm rounded-xl border border-white/80">
                  <label className="block font-semibold mb-2 text-text">
                    이름 일괄 입력 (줄바꿈 또는 쉼표로 구분)
                  </label>
                  <textarea
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder="홍길동&#10;김철수&#10;이영희"
                    className="w-full h-32 mb-sm resize-none p-3 bg-white/80 border border-white/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                  />
                  <div className="flex gap-sm">
                    <button
                      onClick={handleBulkImport}
                      className="flex-1 py-2 px-4 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-all shadow-sm"
                    >
                      입력 완료
                    </button>
                    <button
                      onClick={() => {
                        setShowBulkInput(false)
                        setBulkText('')
                      }}
                      className="flex-1 py-2 px-4 bg-white/60 text-text rounded-lg font-medium hover:bg-white/80 transition-all border border-white/80"
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}

              {/* 명단 리스트 - 3열 그리드 */}
              <div className="grid grid-cols-3 gap-2">
                {localRoster.map((student) => (
                  <div
                    key={student.id}
                    className="bg-white/80 backdrop-blur-sm rounded-lg p-2 hover:bg-white/95 transition-all border border-white/60 flex items-center gap-2 relative"
                  >
                    {isEditMode && (
                      <button
                        onClick={() => handleRemoveStudent(student.id)}
                        className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm text-danger hover:bg-white transition-all shadow-md border border-danger/20 z-10"
                        title="삭제"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    )}

                    <div className="w-7 text-center font-bold text-sm" style={{ color: '#A78BFA' }}>
                      {student.num}
                    </div>

                    <input
                      type="text"
                      value={student.name}
                      onChange={(e) => handleNameChange(student.id, e.target.value)}
                      placeholder="이름"
                      className="flex-1 py-1.5 px-2 bg-white/60 border border-white/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all text-sm font-medium min-w-0"
                    />

                    <button
                      type="button"
                      onClick={() => handleGenderChange(student.id, student.gender === '남' ? '여' : '남')}
                      className={`w-10 py-1.5 rounded-lg font-semibold transition-colors text-sm ${
                        student.gender === '여'
                          ? 'bg-danger text-white'
                          : 'bg-primary text-white'
                      }`}
                    >
                      {student.gender || '남'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'color' && (
            <div>
              {/* 미리보기 */}
              <div
                className="mb-4 p-4 rounded-xl text-center"
                style={{ backgroundColor: customBgColor }}
              >
                <div className="text-xl font-bold mb-1" style={{ color: customTextColor }}>
                  {classInfo.grade}학년 {classInfo.classNum}반
                </div>
                <div className="text-xs" style={{ color: `${customTextColor}cc` }}>
                  미리보기
                </div>
              </div>

              {/* 프리셋 색상 팔레트 */}
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
                      style={{
                        backgroundColor: color.bg,
                        borderColor: customBgColor === color.bg ? color.text : 'transparent'
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
              </div>

              {/* 커스텀 색상 선택 */}
              <div>
                <h3 className="font-semibold text-text mb-2 text-sm">커스텀 색상</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-text mb-1">
                      배경 색상
                    </label>
                    <HexColorPicker
                      color={customBgColor}
                      onChange={setCustomBgColor}
                      style={{ width: '100%', height: '120px' }}
                    />
                    <input
                      type="text"
                      value={customBgColor}
                      onChange={(e) => setCustomBgColor(e.target.value)}
                      className="mt-2 w-full py-1.5 px-2 bg-white/80 border border-white/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 text-center font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-text mb-1">
                      텍스트 색상
                    </label>
                    <HexColorPicker
                      color={customTextColor}
                      onChange={setCustomTextColor}
                      style={{ width: '100%', height: '120px' }}
                    />
                    <input
                      type="text"
                      value={customTextColor}
                      onChange={(e) => setCustomTextColor(e.target.value)}
                      className="mt-2 w-full py-1.5 px-2 bg-white/80 border border-white/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 text-center font-mono text-xs"
                    />
                  </div>
                </div>

                <button
                  onClick={() => {
                    const customColor = { bg: customBgColor, text: customTextColor, name: '커스텀' }
                    setSelectedColor(customColor)
                    setClassColor(classInfo.id, customColor)
                    toast.success('커스텀 색상이 적용되었습니다')
                  }}
                  className="mt-3 w-full py-2.5 px-4 rounded-xl font-semibold transition-all"
                  style={{ backgroundColor: '#B3D9FF', color: '#1E5A9E' }}
                >
                  적용
                </button>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <HistoryTab
              classInfo={classInfo}
              classRecords={classRecords}
              onExportPdf={handleExportHistoryPdf}
            />
          )}
        </div>
      </div>

      {/* 닫기 확인 모달 (변경사항이 있을 때) */}
      {showCloseConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-glass-strong max-w-sm w-full p-6 border border-white/60">
            <p className="text-text text-center mb-6 whitespace-pre-line leading-relaxed">
              저장하지 않은 변경사항이 있습니다.
              <br />
              저장하지 않고 닫으시겠습니까?
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleSaveAndClose}
                className="flex-1 py-3 px-4 rounded-xl font-semibold transition-all leading-tight"
                style={{ backgroundColor: '#B3D9FF', color: '#1E5A9E' }}
              >
                저장 후<br />닫기
              </button>

              <button
                onClick={() => setShowCloseConfirm(false)}
                className="flex-1 py-3 px-4 rounded-xl font-semibold transition-all"
                style={{ backgroundColor: '#FFF9C4', color: '#8B7D00' }}
              >
                취소
              </button>

              <button
                onClick={handleCloseWithoutSave}
                className="flex-1 py-3 px-4 rounded-xl font-semibold transition-all"
                style={{ backgroundColor: '#FFB3B3', color: '#B71C1C' }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
