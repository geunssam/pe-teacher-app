// 저장 방식 선택 모달 — 기본 시간표 vs 이번 주만 | 부모→SchedulePage
import Modal from '../common/Modal'

export default function SaveTypeModal({ pendingPeriodData, onSaveToBase, onSaveToWeek, onClose }) {
  return (
    <Modal onClose={onClose} maxWidth="max-w-sm">
      <h2 className="text-lg font-bold mb-3 text-text text-center">
        {pendingPeriodData ? '어디에 저장할까요?' : '어디에서 삭제할까요?'}
      </h2>

      <p className="text-sm text-textMuted text-center mb-6">
        {pendingPeriodData
          ? `${pendingPeriodData.className} 수업을 추가합니다`
          : '수업을 삭제합니다'}
      </p>

      <div className="space-y-3">
        <button
          onClick={() => onSaveToBase(pendingPeriodData)}
          className="w-full py-3 px-4 rounded-xl font-semibold transition-all"
          style={{ backgroundColor: '#B3D9FF', color: '#1E5A9E' }}
        >
          기본 시간표
          <div className="text-xs font-normal mt-1 opacity-80">
            매주 반복되는 시간표에 적용
          </div>
        </button>

        <button
          onClick={() => onSaveToWeek(pendingPeriodData)}
          className="w-full py-3 px-4 rounded-xl font-semibold transition-all"
          style={{ backgroundColor: '#FFF9C4', color: '#8B7D00' }}
        >
          이번 주만
          <div className="text-xs font-normal mt-1 opacity-80">
            이번 주에만 적용 (기본 시간표 유지)
          </div>
        </button>

        <button
          onClick={onClose}
          className="w-full py-2 px-4 bg-white/60 text-text rounded-xl font-medium hover:bg-white/80 transition-all border border-white/80"
        >
          취소
        </button>
      </div>
    </Modal>
  )
}
