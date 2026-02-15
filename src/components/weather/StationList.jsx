// 측정소 목록 — 거리순 측정소 리스트 표시 | 부모→StationPicker.jsx, 거리계산→utils/haversine.js
/**
 * StationList
 * Pure UI component: renders station cards + action buttons.
 */
export default function StationList({
  stations,
  focusedIndex,
  onStationFocus,
  onSelect,
  onCancel,
  focusError,
}) {
  const focusedStation = focusedIndex != null ? stations[focusedIndex] : null

  return (
    <>
      {/* Focus error message */}
      {focusError && (
        <div className="mb-3 px-2 py-1.5 rounded-lg bg-warning/20 border border-warning/30 text-[11px] text-text">
          {focusError}
        </div>
      )}

      {/* Station card list */}
      <div className="space-y-1.5 max-h-[35vh] overflow-y-auto">
        {stations.map((station, index) => {
          const isFirst = index === 0
          const isFocused = focusedIndex === index
          return (
            <button
              key={station.stationName}
              onClick={() => onStationFocus(index)}
              className={`
                w-full text-left px-4 py-2.5 rounded-2xl border transition-all
                ${isFocused
                  ? 'bg-[#E866A0]/15 border-[#E866A0]/50 ring-2 ring-[#E866A0]/30'
                  : isFirst
                    ? 'bg-[#7CE0A3]/10 border-[#7CE0A3]/30 hover:bg-[#7CE0A3]/20'
                    : 'bg-white/50 border-white/60 hover:bg-white/80'
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  {isFirst && !isFocused && <span className="text-base">⭐</span>}
                  {isFocused && <span className="text-base">📍</span>}
                  <span className={`text-sm font-bold text-[#2D3748] truncate ${!isFirst && !isFocused ? 'ml-[26px]' : ''}`}>
                    {station.stationName}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {station.distance != null && (
                    <span className="text-xs text-[#718096]">{station.distance}km</span>
                  )}
                  {isFirst && !isFocused && (
                    <span className="text-[10px] font-semibold text-[#7CE0A3] bg-[#7CE0A3]/15 px-1.5 py-0.5 rounded-md">
                      추천
                    </span>
                  )}
                </div>
              </div>
              {station.addr && (
                <p className={`text-[11px] text-[#718096] mt-0.5 truncate ${isFirst || isFocused ? 'ml-[26px]' : 'ml-[26px]'}`}>
                  {station.addr}
                </p>
              )}
            </button>
          )
        })}
      </div>

      {/* Action buttons */}
      <div className="mt-3 flex gap-2">
        <button
          onClick={onCancel}
          className={`${focusedStation ? 'flex-1' : 'w-full'} py-2.5 rounded-2xl text-sm font-semibold text-[#718096] bg-white/50 border border-white/60 hover:bg-white/80 transition-all`}
        >
          취소
        </button>
        {focusedStation && (
          <button
            onClick={() => onSelect(focusedStation)}
            className="flex-1 py-2.5 rounded-2xl text-sm font-bold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #E866A0, #D44E88)' }}
          >
            {focusedStation.stationName} 선택
          </button>
        )}
      </div>
    </>
  )
}
