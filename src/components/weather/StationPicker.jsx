import { useState } from 'react'
import StationMap from './StationMap'
import StationList from './StationList'

/**
 * StationPicker
 * Orchestrator: owns focusedIndex state, composes StationMap + StationList.
 * External API (props) is unchanged from the original 612-line version.
 */
export default function StationPicker({
  locationName,
  source,
  stations,
  centerLat,
  centerLon,
  onSelect,
  onCancel,
}) {
  const label = source === 'gps' ? '현재 위치는' : '선택한 위치는'
  const [focusedIndex, setFocusedIndex] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [focusError, setFocusError] = useState('')

  const hasCenter = Number.isFinite(centerLat) && Number.isFinite(centerLon)

  /** Toggle-aware focus handler shared by both StationMap and StationList */
  const handleStationFocus = (index) => {
    // Toggle: clicking the same station again deselects it
    const newIndex = focusedIndex === index ? null : index
    setFocusedIndex(newIndex)
    setFocusError('')
  }

  const handleFocusError = (msg) => {
    setFocusError(msg)
  }

  const handleMapReady = () => {
    setIsLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-[24px] border border-white/60 p-5"
        style={{
          background: 'linear-gradient(145deg, rgba(255,255,255,0.85), rgba(255,255,255,0.6))',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
        }}
      >
        {/* Header */}
        <h2 className="text-base font-bold text-[#2D3748] mb-3">🌫️ 주변 측정소 선택</h2>

        {/* Location info */}
        <p className="text-sm text-[#718096] mb-3">
          📍 {label}{' '}
          <span className="font-semibold text-[#2D3748]">"{locationName}"</span>
          {' '}입니다.
        </p>

        {/* Map */}
        {hasCenter && (
          <div className="relative">
            <StationMap
              stations={stations}
              centerLat={centerLat}
              centerLon={centerLon}
              locationName={locationName}
              focusedIndex={focusedIndex}
              onStationFocus={handleStationFocus}
              onFocusError={handleFocusError}
              onMapReady={handleMapReady}
            />
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl" style={{ background: 'rgba(255,255,255,0.5)' }}>
                <span className="text-xs font-semibold text-[#718096]">측정소 위치 확인 중...</span>
              </div>
            )}
          </div>
        )}

        {/* Station list + buttons */}
        <StationList
          stations={stations}
          focusedIndex={focusedIndex}
          onStationFocus={handleStationFocus}
          onSelect={onSelect}
          onCancel={onCancel}
          focusError={focusError}
        />
      </div>
    </div>
  )
}
