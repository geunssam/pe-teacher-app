import { useEffect, useRef, useState, useCallback } from 'react'
import { loadNaverMapScript } from '../../utils/loadNaverMapScript'

/**
 * Geocode an address string via Naver Maps.
 * Tries the full address first, then a simplified version (road/jibun only).
 */
function geocodeAddr(naver, addr) {
  const tryGeocode = (query) =>
    new Promise((resolve) => {
      naver.maps.Service.geocode({ query }, (status, response) => {
        if (status !== naver.maps.Service.Status.OK) { resolve(null); return }
        const item = response.v2?.addresses?.[0]
        resolve(item ? { lat: parseFloat(item.y), lon: parseFloat(item.x) } : null)
      })
    })

  // Build candidate queries from most specific to least specific
  const candidates = [addr]

  // "대전 유성구 대학로 407 보건환경연구원" → "대전 유성구 대학로 407"
  const road = addr.match(/^(.+(?:로|길)\s*\d+(?:-\d+)?(?:번길\s*\d+(?:-\d+)?)?)/)
  if (road && road[1] !== addr) candidates.push(road[1])

  // "대전 서구 월평동160-5 도로변(...)" → "대전 서구 월평동160-5"
  const jibun = addr.match(/^(.+(?:동|리|읍|면)\s*\d+(?:-\d+)?)/)
  if (jibun && jibun[1] !== addr) candidates.push(jibun[1])

  // Remove parenthetical content: "대전 서구 둔산서로 84(근로자 종합복지관)" → "대전 서구 둔산서로 84"
  const noParens = addr.replace(/\s*\(.*?\)/g, '').trim()
  if (noParens !== addr) candidates.push(noParens)

  // Last resort: first 3 tokens (e.g. "대전 유성구 대학로")
  const tokens = addr.split(/\s+/)
  if (tokens.length >= 3) candidates.push(tokens.slice(0, 3).join(' '))

  // Deduplicate
  const unique = [...new Set(candidates)]

  // Try each candidate sequentially until one succeeds
  return unique.reduce(
    (chain, query) => chain.then((result) => result || tryGeocode(query)),
    Promise.resolve(null)
  )
}

function makeMarkerIcon(name, focused) {
  if (focused) {
    return `<div style="display:flex;flex-direction:column;align-items:center;pointer-events:auto;">
      <div style="width:28px;height:28px;background:#E866A0;border:3px solid #fff;border-radius:50%;box-shadow:0 3px 12px rgba(232,102,160,0.6);"></div>
      <div style="margin-top:4px;font-size:13px;font-weight:700;color:#fff;background:#E866A0;padding:3px 10px;border-radius:8px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.25);">${name}</div>
    </div>`
  }
  return `<div style="display:flex;flex-direction:column;align-items:center;pointer-events:auto;">
    <div style="width:12px;height:12px;background:#E866A0;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(232,102,160,0.4);"></div>
    <div style="margin-top:2px;font-size:9px;font-weight:600;color:#2D3748;background:rgba(255,255,255,0.85);padding:1px 4px;border-radius:4px;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.1);">${name}</div>
  </div>`
}

/**
 * StationPicker
 * 지도에 현재 위치 + 모든 측정소 마커를 표시, 카드 탭 시 해당 마커 강조
 */
export default function StationPicker({ locationName, source, stations, centerLat, centerLon, onSelect, onCancel }) {
  const label = source === 'gps' ? '현재 위치는' : '선택한 위치는'
  const mapContainerRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const naverRef = useRef(null)
  // Array of { marker, coords } for each station (index-matched)
  const stationMarkersRef = useRef([])
  const focusedIndexRef = useRef(null)
  const handleFocusRef = useRef(null)
  const idleListenerRef = useRef(null)
  const [focusedIndex, setFocusedIndex] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const hasCenter = Number.isFinite(centerLat) && Number.isFinite(centerLon)

  // Initialize map + geocode all stations + place all markers
  useEffect(() => {
    if (!hasCenter || !mapContainerRef.current) return

    let unmounted = false

    const initMap = async () => {
      try {
        await loadNaverMapScript()
        if (unmounted) return

        const naver = window.naver
        if (!naver?.maps) return
        naverRef.current = naver

        // Wait for geocoder submodule
        if (!naver.maps.Service?.geocode) {
          await new Promise((r) => {
            let n = 0
            const id = setInterval(() => {
              if (naver.maps.Service?.geocode || ++n >= 30) { clearInterval(id); r() }
            }, 100)
          })
        }
        if (unmounted) return

        const center = new naver.maps.LatLng(centerLat, centerLon)
        const map = new naver.maps.Map(mapContainerRef.current, {
          center,
          zoom: 12,
          zoomControl: true,
          zoomControlOptions: { position: naver.maps.Position.RIGHT_CENTER, style: naver.maps.ZoomControlStyle.SMALL },
          draggable: true,
          scrollWheel: false,
          disableDoubleTapZoom: false,
          disableDoubleClickZoom: false,
        })
        mapInstanceRef.current = map

        // Current location marker (red circle)
        new naver.maps.Marker({
          position: center,
          map,
          icon: {
            content: `<div style="width:16px;height:16px;background:#7C9EF5;border:2.5px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(124,158,245,0.5);"></div>`,
            anchor: new naver.maps.Point(8, 8),
          },
          clickable: false,
        })

        // Geocode all stations in parallel
        const resolved = await Promise.all(
          stations.map(async (station) => {
            let lat = station.lat
            let lon = station.lon
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
              if (station.addr && naver.maps.Service?.geocode) {
                const coords = await geocodeAddr(naver, station.addr)
                if (coords) { lat = coords.lat; lon = coords.lon }
              }
            }
            return { ...station, lat, lon }
          })
        )
        if (unmounted) return

        // Place all station markers + fitBounds
        const bounds = new naver.maps.LatLngBounds(center, center)
        const markers = resolved.map((station, index) => {
          if (!Number.isFinite(station.lat) || !Number.isFinite(station.lon)) return null

          const pos = new naver.maps.LatLng(station.lat, station.lon)
          bounds.extend(pos)

          const marker = new naver.maps.Marker({
            position: pos,
            map,
            icon: {
              content: makeMarkerIcon(station.stationName, false),
              anchor: new naver.maps.Point(6, 6),
            },
            clickable: true,
            zIndex: 10,
          })

          naver.maps.Event.addListener(marker, 'click', () => {
            if (handleFocusRef.current) handleFocusRef.current(index)
          })

          return { marker, coords: pos }
        })

        stationMarkersRef.current = markers

        // fitBounds to show everything
        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 })
          const listener = naver.maps.Event.addListener(map, 'idle', () => {
            naver.maps.Event.removeListener(listener)
            idleListenerRef.current = null
            if (map.getZoom() > 15) map.setZoom(15)
          })
          idleListenerRef.current = listener
        }

        setIsLoading(false)
      } catch (error) {
        console.warn('StationPicker 지도 로드 실패:', error)
        setIsLoading(false)
      }
    }

    initMap()

    return () => {
      unmounted = true
      stationMarkersRef.current.forEach((entry) => {
        if (entry?.marker) entry.marker.setMap(null)
      })
      stationMarkersRef.current = []
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Update marker styles when focusedIndex changes
  const updateMarkerStyles = useCallback((newIndex) => {
    const naver = naverRef.current
    if (!naver) return

    stationMarkersRef.current.forEach((entry, i) => {
      if (!entry?.marker) return
      const name = stations[i]?.stationName || ''
      const isFocused = i === newIndex
      entry.marker.setIcon({
        content: makeMarkerIcon(name, isFocused),
        anchor: isFocused ? new naver.maps.Point(14, 14) : new naver.maps.Point(6, 6),
      })
      entry.marker.setZIndex(isFocused ? 100 : 10)
    })
  }, [stations])

  const handleStationFocus = async (index) => {
    const newIndex = focusedIndexRef.current === index ? null : index
    focusedIndexRef.current = newIndex
    setFocusedIndex(newIndex)
    updateMarkerStyles(newIndex)

    const naver = naverRef.current
    const map = mapInstanceRef.current
    if (!naver || !map) return

    // fitBounds idle 리스너가 남아있으면 즉시 제거 (첫 클릭 충돌 방지)
    if (idleListenerRef.current) {
      naver.maps.Event.removeListener(idleListenerRef.current)
      idleListenerRef.current = null
    }

    if (newIndex == null) {
      // Reset to show all
      const bounds = new naver.maps.LatLngBounds(
        new naver.maps.LatLng(centerLat, centerLon),
        new naver.maps.LatLng(centerLat, centerLon)
      )
      stationMarkersRef.current.forEach((entry) => {
        if (entry?.coords) bounds.extend(entry.coords)
      })
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 })
      }
      return
    }

    let entry = stationMarkersRef.current[newIndex]

    // On-demand geocoding: if no marker was created during init, try now
    if (!entry?.coords) {
      const station = stations[newIndex]
      if (station?.addr && naver.maps.Service?.geocode) {
        const coords = await geocodeAddr(naver, station.addr)
        if (coords && focusedIndexRef.current === newIndex) {
          const pos = new naver.maps.LatLng(coords.lat, coords.lon)
          const marker = new naver.maps.Marker({
            position: pos,
            map,
            icon: {
              content: makeMarkerIcon(station.stationName, true),
              anchor: new naver.maps.Point(14, 14),
            },
            clickable: true,
            zIndex: 100,
          })
          naver.maps.Event.addListener(marker, 'click', () => {
            if (handleFocusRef.current) handleFocusRef.current(newIndex)
          })
          entry = { marker, coords: pos }
          stationMarkersRef.current[newIndex] = entry
        }
      }
    }

    if (!entry?.coords) return

    // Zoom in close to the station (~500m radius = zoom 16)
    map.panTo(entry.coords)
    map.setZoom(16)
  }

  // Keep ref always pointing to the latest handler (for marker click closures)
  handleFocusRef.current = handleStationFocus

  const focusedStation = focusedIndex != null ? stations[focusedIndex] : null

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
            <div
              ref={mapContainerRef}
              className="w-full rounded-2xl overflow-hidden border border-white/60 mb-3"
              style={{ height: '280px', background: '#f0f0f0' }}
            />
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl" style={{ background: 'rgba(255,255,255,0.5)' }}>
                <span className="text-xs font-semibold text-[#718096]">측정소 위치 확인 중...</span>
              </div>
            )}
            {/* My location button */}
            <button
              onClick={() => {
                const naver = naverRef.current
                const map = mapInstanceRef.current
                if (!naver || !map) return
                map.panTo(new naver.maps.LatLng(centerLat, centerLon))
                map.setZoom(14)
              }}
              className="absolute top-3 right-3 z-10 w-9 h-9 flex items-center justify-center bg-white rounded-lg border border-gray-200 shadow-md hover:bg-gray-50 transition-all"
              title="선택한 위치로 이동"
              style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C9EF5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <line x1="12" y1="2" x2="12" y2="6" />
                <line x1="12" y1="18" x2="12" y2="22" />
                <line x1="2" y1="12" x2="6" y2="12" />
                <line x1="18" y1="12" x2="22" y2="12" />
              </svg>
            </button>
            {/* Legend */}
            <div className="absolute bottom-5 left-2 flex gap-2">
              <span className="flex items-center gap-1 text-[10px] text-[#2D3748] bg-white/80 rounded-md px-1.5 py-0.5 shadow-sm">
                <span style={{ width: 8, height: 8, background: '#7C9EF5', borderRadius: '50%', display: 'inline-block' }} /> 현재
              </span>
              <span className="flex items-center gap-1 text-[10px] text-[#2D3748] bg-white/80 rounded-md px-1.5 py-0.5 shadow-sm">
                <span style={{ width: 8, height: 8, background: '#E866A0', borderRadius: '50%', display: 'inline-block' }} /> 측정소
              </span>
            </div>
          </div>
        )}

        {/* Station list */}
        <div className="space-y-1.5 max-h-[35vh] overflow-y-auto">
          {stations.map((station, index) => {
            const isFirst = index === 0
            const isFocused = focusedIndex === index
            return (
              <button
                key={station.stationName}
                onClick={() => handleStationFocus(index)}
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
      </div>
    </div>
  )
}
