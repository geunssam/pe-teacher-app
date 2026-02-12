import { useState } from 'react'
import { useClassManager } from '../../hooks/useClassManager'
import toast from 'react-hot-toast'

export default function RosterEditor({ classInfo, onClose }) {
  const { getRoster, updateStudent, addStudent, removeStudent } = useClassManager()
  const [activeTab, setActiveTab] = useState('roster') // roster | history

  const roster = getRoster(classInfo.id)

  const handleNameChange = (studentId, name) => {
    updateStudent(classInfo.id, studentId, { name })
  }

  const handleGenderChange = (studentId, gender) => {
    updateStudent(classInfo.id, studentId, { gender })
  }

  const handleAddStudent = () => {
    addStudent(classInfo.id)
    toast.success('학생이 추가되었습니다')
  }

  const handleRemoveStudent = (studentId) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      removeStudent(classInfo.id, studentId)
      toast.success('학생이 삭제되었습니다')
    }
  }

  const genderStats = roster.reduce(
    (acc, student) => {
      if (student.gender === '남') acc.male++
      else if (student.gender === '여') acc.female++
      else acc.unknown++
      return acc
    },
    { male: 0, female: 0, unknown: 0 }
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="glass-card-strong w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-xl border-b border-border">
          <div>
            <h2 className="text-card-title mb-xs">
              {classInfo.grade}학년 {classInfo.classNum}반
            </h2>
            <p className="text-caption text-muted">
              학생 {roster.length}명
            </p>
          </div>

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

        {/* 탭 */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('roster')}
            className={`px-lg py-md text-body-bold transition-colors ${
              activeTab === 'roster'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted hover:text-text'
            }`}
          >
            👤 명단 관리
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-lg py-md text-body-bold transition-colors ${
              activeTab === 'history'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted hover:text-text'
            }`}
          >
            📖 수업 이력
          </button>
        </div>

        {/* 내용 */}
        <div className="flex-1 overflow-y-auto p-lg">
          {activeTab === 'roster' && (
            <div>
              {/* 성별 통계 */}
              <div className="flex gap-sm mb-md">
                <div className="badge badge-primary">남 {genderStats.male}명</div>
                <div className="badge badge-danger">여 {genderStats.female}명</div>
                {genderStats.unknown > 0 && (
                  <div className="badge">미지정 {genderStats.unknown}명</div>
                )}
              </div>

              {/* 명단 헤더 */}
              <div className="grid grid-cols-[50px_1fr_120px_40px] gap-sm mb-sm px-sm">
                <div className="text-caption text-muted text-center">번호</div>
                <div className="text-caption text-muted">이름</div>
                <div className="text-caption text-muted text-center">성별</div>
                <div></div>
              </div>

              {/* 명단 그리드 */}
              <div className="space-y-xs">
                {roster.map((student) => (
                  <div
                    key={student.id}
                    className="grid grid-cols-[50px_1fr_120px_40px] gap-sm items-center p-sm bg-surface rounded-lg hover:bg-surface2 transition-colors"
                  >
                    {/* 번호 */}
                    <div className="text-body-bold text-center">
                      {student.num}
                    </div>

                    {/* 이름 */}
                    <input
                      type="text"
                      value={student.name}
                      onChange={(e) => handleNameChange(student.id, e.target.value)}
                      placeholder="이름"
                      className="input py-xs px-sm text-body"
                    />

                    {/* 성별 */}
                    <div className="flex gap-xs justify-center">
                      <button
                        onClick={() => handleGenderChange(student.id, '남')}
                        className={`px-sm py-xs rounded text-body ${
                          student.gender === '남'
                            ? 'bg-primary text-white'
                            : 'bg-white hover:bg-primary/10'
                        }`}
                      >
                        남
                      </button>
                      <button
                        onClick={() => handleGenderChange(student.id, '여')}
                        className={`px-sm py-xs rounded text-body ${
                          student.gender === '여'
                            ? 'bg-danger text-white'
                            : 'bg-white hover:bg-danger/10'
                        }`}
                      >
                        여
                      </button>
                    </div>

                    {/* 삭제 */}
                    <button
                      onClick={() => handleRemoveStudent(student.id)}
                      className="w-8 h-8 flex items-center justify-center rounded hover:bg-danger/10 transition-colors"
                      title="삭제"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              {/* 학생 추가 */}
              <button
                onClick={handleAddStudent}
                className="btn btn-outline btn-block mt-md"
              >
                + 학생 추가
              </button>
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
          <div className="p-md bg-surface rounded-lg">
            <div className="flex items-center justify-between mb-xs">
              <span className="text-body-bold">{classInfo.lastActivity}</span>
              <span className="badge badge-sports">스포츠</span>
            </div>
            <p className="text-caption text-muted">{classInfo.lastDate}</p>
          </div>
        </div>
      ) : (
        <div className="text-center py-xl">
          <p className="text-body text-muted">아직 수업 기록이 없습니다</p>
        </div>
      )}
    </div>
  )
}
