// 학생 pill 카드 — Roster + Team 공유 컴포넌트 | PEPick tag-student-card 이식
export default function StudentPill({
  student,
  onClick,
  onRemove,
  draggable = false,
  isDragging = false,
  isEditing = false,
  dropIndicator = null, // 'before' | 'after' | null
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}) {
  const genderBg = student.gender === '여'
    ? 'rgba(255,105,180,0.08)'
    : 'rgba(100,149,237,0.08)'

  const genderBorder = student.gender === '여'
    ? 'rgba(255,105,180,0.25)'
    : 'rgba(100,149,237,0.25)'

  const dropShadow = dropIndicator === 'before'
    ? 'inset 3px 0 0 #7C9EF5'
    : dropIndicator === 'after'
      ? 'inset -3px 0 0 #7C9EF5'
      : undefined

  return (
    <div
      className={`
        group relative inline-flex items-center gap-1 px-2.5 py-1 rounded-lg
        cursor-pointer select-none transition-all text-[11px] font-medium
        border backdrop-blur-sm
        ${isDragging ? 'opacity-45' : 'opacity-100'}
        ${isEditing ? 'border-blue-500/45 shadow-sm' : ''}
        ${!isEditing ? 'hover:brightness-95' : ''}
      `}
      style={{
        backgroundColor: genderBg,
        borderColor: isEditing ? undefined : genderBorder,
        height: '28px',
        boxShadow: dropShadow,
      }}
      draggable={draggable}
      onClick={onClick}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDrop={onDrop}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <span className="text-gray-500 font-semibold">{student.num}.</span>
      <span className="text-gray-800 truncate max-w-[52px]">
        {student.name || '미입력'}
      </span>

      {/* hover 시 ✕ 버튼 */}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove(student.id)
          }}
          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white/90 text-red-400 hover:text-red-600 hover:bg-white
            flex items-center justify-center shadow-sm border border-red-200/50
            opacity-0 group-hover:opacity-100 transition-opacity text-[10px] leading-none"
        >
          ✕
        </button>
      )}
    </div>
  )
}
