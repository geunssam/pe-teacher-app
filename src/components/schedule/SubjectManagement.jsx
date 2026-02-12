import { useState } from 'react'
import { useSubjects, COLOR_PRESETS } from '../../hooks/useSubjects'
import toast from 'react-hot-toast'
import { confirm } from '../common/ConfirmDialog'

export default function SubjectManagement({ onClose }) {
  const {
    subjects,
    subjectColors,
    addSubject,
    removeSubject,
    setSubjectColor
  } = useSubjects()

  const [newSubjectName, setNewSubjectName] = useState('')
  const [editingSubject, setEditingSubject] = useState(null)

  const handleAddSubject = () => {
    const trimmedName = newSubjectName.trim()

    if (!trimmedName) {
      toast.error('과목 이름을 입력해주세요')
      return
    }

    const success = addSubject(trimmedName)

    if (success) {
      toast.success('과목이 추가되었습니다')
      setNewSubjectName('')
    } else {
      toast.error('이미 존재하는 과목입니다')
    }
  }

  const handleRemoveSubject = async (subject) => {
    const confirmed = await confirm(
      `"${subject}"을(를) 삭제하시겠습니까?\n시간표에서도 제거됩니다.`,
      '삭제',
      '취소'
    )

    if (confirmed) {
      removeSubject(subject)
      toast.success('과목이 삭제되었습니다')
    }
  }

  const handleChangeColor = (subject, color) => {
    setSubjectColor(subject, color)
    setEditingSubject(null)
    toast.success('색상이 변경되었습니다')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
      <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-glass-strong max-w-lg w-full max-h-[90vh] flex flex-col border border-white/60">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-xl border-b border-primary/20">
          <h2 className="text-card-title">📚 과목 관리</h2>

          <button
            onClick={onClose}
            className="btn-icon hover:bg-danger/10"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* 내용 */}
        <div className="flex-1 overflow-y-auto p-lg">
          {/* 과목 추가 */}
          <div className="mb-lg">
            <label className="block font-semibold mb-2 text-text">
              새 과목 추가
            </label>
            <div className="flex gap-sm">
              <input
                type="text"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddSubject()}
                placeholder="과목 이름"
                className="flex-1 py-2 px-3 bg-white/80 border border-white/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
              />
              <button
                onClick={handleAddSubject}
                className="py-2 px-4 rounded-lg font-semibold hover:opacity-90 transition-all"
                style={{ backgroundColor: '#B4E4C1', color: '#2D5F3F' }}
              >
                추가
              </button>
            </div>
          </div>

          {/* 과목 목록 */}
          <div>
            <label className="block font-semibold mb-2 text-text">
              과목 목록 ({subjects.length}개)
            </label>

            <div className="space-y-2">
              {subjects.map((subject) => {
                const color = subjectColors[subject] || COLOR_PRESETS[0]
                const isEditing = editingSubject === subject

                return (
                  <div
                    key={subject}
                    className="bg-white/80 backdrop-blur-sm rounded-xl p-md border border-white/60"
                  >
                    <div className="flex items-center justify-between">
                      {/* 과목 이름과 색상 미리보기 */}
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg"
                          style={{ backgroundColor: color.bg }}
                        />
                        <span className="font-semibold text-text">{subject}</span>
                      </div>

                      {/* 버튼들 */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingSubject(isEditing ? null : subject)}
                          className="p-2 hover:bg-primary/10 rounded-lg transition-all text-primary"
                          title="색상 변경"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 20h9"></path>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                          </svg>
                        </button>
                        <button
                          onClick={() => handleRemoveSubject(subject)}
                          className="p-2 hover:bg-danger/10 rounded-lg transition-all text-danger"
                          title="삭제"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* 색상 선택 팔레트 */}
                    {isEditing && (
                      <div className="mt-3 pt-3 border-t border-white/80">
                        <p className="text-sm text-textMuted mb-2">색상 선택</p>
                        <div className="grid grid-cols-4 gap-2">
                          {COLOR_PRESETS.map((preset, index) => (
                            <button
                              key={index}
                              onClick={() => handleChangeColor(subject, preset)}
                              className="p-3 rounded-lg hover:scale-105 transition-all border-2"
                              style={{
                                backgroundColor: preset.bg,
                                borderColor: color.bg === preset.bg ? preset.text : 'transparent'
                              }}
                              title={preset.name}
                            >
                              <div
                                className="text-xs font-semibold"
                                style={{ color: preset.text }}
                              >
                                {preset.name}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="p-lg border-t border-primary/10">
          <button
            onClick={onClose}
            className="w-full py-3 px-4 rounded-xl font-semibold transition-all"
            style={{ backgroundColor: '#B3D9FF', color: '#1E5A9E' }}
          >
            완료
          </button>
        </div>
      </div>
    </div>
  )
}
