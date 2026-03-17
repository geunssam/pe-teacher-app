// 학급 추가/수정 겸용 모달 — 학년, 반, 학생 수, 색상 입력 | 사용처→ClassesPage.jsx
import { useState, useEffect } from 'react'
import Modal from '../common/Modal'
import { CLASS_COLOR_PRESETS } from '../../constants/classColors'

export default function ClassEditModal({ classInfo, onSave, onClose }) {
  const isEdit = !!classInfo

  const [grade, setGrade] = useState(classInfo?.grade || 3)
  const [classNum, setClassNum] = useState(classInfo?.classNum || 1)
  const [studentCount, setStudentCount] = useState(classInfo?.studentCount || 25)
  const [color, setColor] = useState(
    classInfo?.color || CLASS_COLOR_PRESETS[0]
  )

  useEffect(() => {
    if (classInfo) {
      setGrade(classInfo.grade)
      setClassNum(classInfo.classNum)
      setStudentCount(classInfo.studentCount)
      setColor(classInfo.color || CLASS_COLOR_PRESETS[0])
    }
  }, [classInfo])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (studentCount < 1 || studentCount > 45) return
    onSave({ grade, classNum, studentCount, color })
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-card-title mb-lg">
        {isEdit ? '학급 수정' : '학급 추가'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-md">
        {/* 학년 */}
        <div>
          <label className="text-caption text-muted block mb-1">학년</label>
          <select
            value={grade}
            onChange={(e) => setGrade(Number(e.target.value))}
            className="form-select w-full"
            disabled={isEdit}
          >
            {[1, 2, 3, 4, 5, 6].map((g) => (
              <option key={g} value={g}>{g}학년</option>
            ))}
          </select>
        </div>

        {/* 반 */}
        <div>
          <label className="text-caption text-muted block mb-1">반</label>
          <input
            type="number"
            min={1}
            max={20}
            value={classNum}
            onChange={(e) => setClassNum(Number(e.target.value))}
            className="form-input w-full"
            disabled={isEdit}
          />
        </div>

        {/* 학생 수 */}
        <div>
          <label className="text-caption text-muted block mb-1">학생 수</label>
          <input
            type="number"
            min={1}
            max={45}
            value={studentCount}
            onChange={(e) => setStudentCount(Number(e.target.value))}
            className="form-input w-full"
          />
        </div>

        {/* 색상 선택 */}
        <div>
          <label className="text-caption text-muted block mb-1">색상</label>
          <div className="flex flex-wrap gap-2">
            {CLASS_COLOR_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => setColor(preset)}
                className="w-8 h-8 rounded-lg border-2 transition-all"
                style={{
                  backgroundColor: preset.bg,
                  borderColor: color.name === preset.name ? preset.text : 'transparent',
                }}
                title={preset.name}
              />
            ))}
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 pt-md">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-white/60 text-text rounded-xl font-medium hover:bg-white/80 transition-all border border-white/80"
          >
            취소
          </button>
          <button
            type="submit"
            className="flex-1 py-3 px-4 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-all shadow-sm"
          >
            {isEdit ? '수정' : '추가'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
