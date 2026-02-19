// 메모 입력 모달 — 시간표 셀에 메모 추가 + 행사 태그 칩 | 부모→SchedulePage
import Modal from '../common/Modal'
import { SPECIAL_EVENTS, parseEventTag, prependEventTag, removeEventTag } from '../../constants/lessonDefaults'

export default function MemoInputModal({ selectedClass, memoText, onMemoChange, onSave, onClose }) {
  const { eventLabel } = parseEventTag(memoText)

  const handleChipClick = (label) => {
    if (eventLabel === label) {
      onMemoChange(removeEventTag(memoText))
    } else {
      onMemoChange(prependEventTag(memoText, label))
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-xl font-bold mb-2 text-text">
        {selectedClass.grade}학년 {selectedClass.classNum}반
      </h2>
      <p className="text-sm text-textMuted mb-4">
        수업 내용을 간단히 메모해보세요 (선택)
      </p>

      {/* 행사 태그 칩 */}
      <div className="mb-3">
        <p className="text-xs text-textMuted mb-2">특별행사</p>
        <div className="flex flex-wrap gap-1.5">
          {SPECIAL_EVENTS.map((evt) => (
            <button
              key={evt.key}
              type="button"
              onClick={() => handleChipClick(evt.label)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
                eventLabel === evt.label
                  ? 'border-[#F5E07C] bg-[#FFF9C4] text-[#8B7D00]'
                  : 'border-white/80 bg-white/60 text-textMuted hover:bg-white/80'
              }`}
            >
              {evt.icon} {evt.label}
            </button>
          ))}
        </div>
      </div>

      <textarea
        value={memoText}
        onChange={(e) => onMemoChange(e.target.value)}
        placeholder="예: 티볼, 피구, 줄넘기 등"
        className="w-full h-24 mb-4 resize-none p-3 bg-white/80 border border-white/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
      />

      <div className="flex gap-2">
        <button
          onClick={onSave}
          className="flex-1 py-2 px-4 rounded-lg font-semibold hover:opacity-90 transition-all"
          style={{ backgroundColor: '#B3D9FF', color: '#1E5A9E' }}
        >
          저장
        </button>
        <button
          onClick={onClose}
          className="flex-1 py-2 px-4 bg-white/60 text-text rounded-lg font-medium hover:bg-white/80 transition-all border border-white/80"
        >
          취소
        </button>
      </div>
    </Modal>
  )
}
