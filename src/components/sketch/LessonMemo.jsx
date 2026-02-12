/**
 * 수업 메모 입력
 * "수업 결정" 시 메모도 함께 저장
 */
export default function LessonMemo({ memo, onMemoChange }) {
  return (
    <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-xl border border-white/80 shadow-glass-strong">
      <h3 className="text-card-title mb-md">✏️ 수업 메모 (선택)</h3>
      <textarea
        value={memo}
        onChange={(e) => onMemoChange(e.target.value)}
        placeholder="오늘 수업에 대한 간단한 메모를 남겨보세요. 예: 날씨 좋음, 학생들 집중도 높음"
        className="w-full p-md bg-white/60 border border-white/80 rounded-lg text-body text-text placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
        rows={3}
      />
    </div>
  )
}
