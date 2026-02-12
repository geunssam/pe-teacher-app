import { useState, useEffect } from 'react'
import { useClassManager } from '../../hooks/useClassManager'
import toast from 'react-hot-toast'
import { confirm } from '../common/ConfirmDialog'
import { generateStudentId } from '../../utils/generateId'

export default function RosterEditor({ classInfo, onClose }) {
  const { getRoster, updateRoster } = useClassManager()
  const [activeTab, setActiveTab] = useState('roster') // roster | history
  const [showBulkInput, setShowBulkInput] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [localRoster, setLocalRoster] = useState([])
  const [hasChanges, setHasChanges] = useState(false)

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
      gender: '',
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
            num: index + 1, // 번호 재정렬
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
      .split(/[\n,]/) // 줄바꿈 또는 쉼표로 분리
      .map((name) => name.trim())
      .filter((name) => name.length > 0)

    const updatedRoster = names.map((name, index) => {
      // 기존 학생이 있으면 이름만 업데이트, 없으면 새로 생성
      const existingStudent = localRoster[index]

      if (existingStudent) {
        return { ...existingStudent, name }
      } else {
        return {
          id: generateStudentId(),
          num: index + 1,
          name,
          gender: '',
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

  const handleClose = async () => {
    if (hasChanges) {
      const confirmed = await confirm(
        '저장하지 않은 변경사항이 있습니다.\n저장하지 않고 닫으시겠습니까?',
        '닫기',
        '취소'
      )
      if (!confirmed) return
    }
    onClose()
  }

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
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-glass-strong w-full max-w-4xl max-h-[90vh] flex flex-col border border-white/60">
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
            👤 명단 관리
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'history'
                ? 'text-primary border-b-2 border-primary'
                : 'text-textMuted hover:text-text'
            }`}
          >
            📖 수업 이력
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
                    📝 이름 일괄입력
                  </button>
                  <button
                    onClick={handleAddStudent}
                    className="py-2 px-4 rounded-lg font-semibold hover:opacity-90 transition-all text-sm"
                    style={{ backgroundColor: '#FFF9C4', color: '#8B7D00' }}
                  >
                    + 학생 추가
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
                    📝 이름 일괄 입력 (줄바꿈 또는 쉼표로 구분)
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

              {/* 명단 카드 그리드 */}
              <div className="grid grid-cols-4 gap-md">
                {localRoster.map((student) => (
                  <div
                    key={student.id}
                    className="bg-white/80 backdrop-blur-sm rounded-xl p-md hover:bg-white/95 transition-all shadow-sm hover:shadow-md border border-white/60 relative"
                  >
                    {/* 삭제 버튼 (우측 상단) */}
                    <button
                      onClick={() => handleRemoveStudent(student.id)}
                      className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-lg hover:bg-danger/20 transition-all text-danger/70 hover:text-danger"
                      title="삭제"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>

                    {/* 번호 */}
                    <div className="text-xl font-bold text-center mb-2" style={{ color: '#A78BFA' }}>
                      {student.num}
                    </div>

                    {/* 이름 */}
                    <input
                      type="text"
                      value={student.name}
                      onChange={(e) => handleNameChange(student.id, e.target.value)}
                      placeholder="이름"
                      className="w-full py-2.5 px-3 text-center mb-3 bg-white/60 border border-white/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all text-lg font-medium"
                    />

                    {/* 성별 */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleGenderChange(student.id, '남')}
                        className={`flex-1 py-2.5 rounded-lg font-semibold transition-colors ${
                          student.gender === '남'
                            ? 'bg-primary text-white shadow-md'
                            : 'bg-white text-primary hover:bg-primary/20 border-2 border-primary/40'
                        }`}
                      >
                        남
                      </button>
                      <button
                        type="button"
                        onClick={() => handleGenderChange(student.id, '여')}
                        className={`flex-1 py-2.5 rounded-lg font-semibold transition-colors ${
                          student.gender === '여'
                            ? 'bg-danger text-white shadow-md'
                            : 'bg-white text-danger hover:bg-danger/20 border-2 border-danger/40'
                        }`}
                      >
                        여
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <HistoryTab classInfo={classInfo} />
          )}
        </div>
      </div>
    </div>
  )
}

// 수업 이력 탭
function HistoryTab({ classInfo }) {
  // TODO: 실제 수업 기록 데이터 연동
  const hasHistory = classInfo.lastActivity

  return (
    <div>
      {hasHistory ? (
        <div className="space-y-md">
          <div className="p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-white/80">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-text">{classInfo.lastActivity}</span>
              <span className="px-3 py-1 bg-primary/20 text-primary rounded-lg font-medium text-sm">스포츠</span>
            </div>
            <p className="text-sm text-textMuted">{classInfo.lastDate}</p>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-textMuted">아직 수업 기록이 없습니다</p>
        </div>
      )}
    </div>
  )
}
