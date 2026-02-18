// 색상 피커 모달 — 학급 색상 선택 | 부모→SchedulePage
import { CLASS_COLOR_PRESETS } from '../../constants/classColors'
import Modal from '../common/Modal'
import toast from 'react-hot-toast'

export default function ColorPickerModal({ classInfo, onSelectColor, onClose }) {
  return (
    <Modal onClose={onClose} zIndex="z-[60]">
      <h2 className="text-xl font-bold mb-4 text-text text-center">
        {classInfo.grade}학년 {classInfo.classNum}반 색상 선택
      </h2>

      {/* 미리보기 */}
      <div
        className="mb-4 p-4 rounded-xl text-center"
        style={{ backgroundColor: classInfo.color?.bg || CLASS_COLOR_PRESETS[0].bg }}
      >
        <div
          className="font-bold"
          style={{ color: classInfo.color?.text || CLASS_COLOR_PRESETS[0].text }}
        >
          {classInfo.grade}학년 {classInfo.classNum}반
        </div>
      </div>

      {/* 색상 팔레트 */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {CLASS_COLOR_PRESETS.map((color, index) => (
          <button
            key={index}
            onClick={() => {
              onSelectColor(classInfo.id, color)
              toast.success('색상이 변경되었습니다')
              onClose()
            }}
            className="p-3 rounded-xl hover:scale-105 transition-all border-4"
            style={{
              backgroundColor: color.bg,
              borderColor: classInfo.color?.bg === color.bg ? color.text : 'transparent',
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

      <button
        onClick={onClose}
        className="w-full py-2 px-4 bg-white/60 text-text rounded-lg font-medium hover:bg-white/80 transition-all border border-white/80"
      >
        닫기
      </button>
    </Modal>
  )
}
