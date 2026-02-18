// 학급 선택 모달 — 시간표 셀에 배정할 학급 선택 | 부모→SchedulePage
import Modal from '../common/Modal'

export default function ClassSelectModal({ classes, onSelectClass, onOpenColorPicker, onClose }) {
  return (
    <Modal onClose={onClose} maxWidth="max-w-3xl">
      <h2 className="text-xl font-bold mb-4 text-text">학급 선택</h2>

      <div className="grid grid-cols-4 gap-3 mb-4 max-h-80 overflow-y-auto">
        {classes.map((classInfo) => (
          <div
            key={classInfo.id}
            className="relative p-3 rounded-lg text-center transition-all border-2 cursor-pointer hover:scale-105"
            style={{
              backgroundColor: classInfo.color?.bg || '#FCE7F3',
              borderColor: classInfo.color?.text || '#9F1239',
              color: classInfo.color?.text || '#9F1239',
            }}
            onClick={() => onSelectClass(classInfo)}
          >
            <button
              onClick={(e) => {
                e.stopPropagation()
                onOpenColorPicker(classInfo)
              }}
              className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-lg hover:bg-black/10 transition-all"
              title="색상 변경"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            </button>

            <div className="font-semibold">
              {classInfo.grade}학년 {classInfo.classNum}반
            </div>
            <div className="text-xs mt-1 opacity-80">
              {classInfo.studentCount}명
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onClose}
        className="w-full py-2 px-4 bg-white/60 text-text rounded-lg font-medium hover:bg-white/80 transition-all border border-white/80"
      >
        취소
      </button>
    </Modal>
  )
}
