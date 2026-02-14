import { useEffect, useRef, useCallback } from 'react'
import { loadNaverMapScript } from '../../utils/loadNaverMapScript'
import { haversineDistanceKm } from '../../utils/haversine'

/* ── Utility functions ────────────────────────────────────────── */

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Geocode an address string via Naver Maps.
 * Tries the full address first, then a simplified version (road/jibun only).
 */
function geocodeAddr(naver, addr) {
  if (!naver?.maps?.Service?.geocode) {
    return Promise.resolve(null)
  }

  const withTimeout = (promise, timeoutMs = 2000) =>
    Promise.race([
      promise,
      new Promise((resolve) => {
        setTimeout(() => resolve(null), timeoutMs)
      }),
    ])

  const tryGeocode = (query) =>
    withTimeout(
      new Promise((resolve) => {
        naver.maps.Service.geocode({ query }, (status, response) => {
          if (status !== naver.maps.Service.Status.OK) {
            resolve(null)
            return
          }
          const item = response.v2?.addresses?.[0]
          resolve(item ? { lat: parseFloat(item.y), lon: parseFloat(item.x) } : null)
        })
      })
    )

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

async function resolveStationCoords(
  naver,
  station,
  locationHint = '',
  originLat = null,
  originLon = null
) {
  if (Number.isFinite(station?.lat) && Number.isFinite(station?.lon)) {
    return { lat: station.lat, lon: station.lon }
  }

  const stationName = String(station?.stationName || '').trim()
  const addr = String(station?.addr || '').trim()
  const hint = String(locationHint || '').trim()
  const queries = []
  const seen = new Set()

  const addQuery = (value, source = 'general') => {
    const query = String(value || '').trim()
    if (!query || seen.has(query)) {
      return
    }
    seen.add(query)
    queries.push({ query, source })
  }

  addQuery(addr, 'addr')
  if (stationName) addQuery(`${stationName} 측정소`, 'name')
  if (stationName) addQuery(stationName, 'name')
  if (stationName && hint) addQuery(`${hint} ${stationName}`, 'hint')

  for (const candidate of queries) {
    const coords = await geocodeAddr(naver, candidate.query)
    if (coords) {
      // 힌트 기반 쿼리가 현재 위치와 과도하게 가까운 좌표를 반환하면 오탐으로 간주
      if (
        candidate.source === 'hint' &&
        Number.isFinite(originLat) &&
        Number.isFinite(originLon)
      ) {
        const originDistance = haversineDistanceKm(originLat, originLon, coords.lat, coords.lon)
        const expectedDistance = Number.parseFloat(station?.distance)
        if (Number.isFinite(expectedDistance) && expectedDistance > 0.8 && originDistance < 0.2) {
          continue
        }
      }
      return coords
    }
  }

  return null
}

function makeMarkerIcon(name, focused) {
  const safeName = escapeHtml(name)
  if (focused) {
    return `<div style="display:flex;flex-direction:column;align-items:center;pointer-events:auto;">
      <div style="width:28px;height:28px;background:#E866A0;border:3px solid #fff;border-radius:50%;box-shadow:0 3px 12px rgba(232,102,160,0.6);"></div>
      <div style="margin-top:4px;font-size:13px;font-weight:700;color:#fff;background:#E866A0;padding:3px 10px;border-radius:8px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.25);">${safeName}</div>
    </div>`
  }
  return `<div style="display:flex;flex-direction:column;align-items:center;pointer-events:auto;">
    <div style="width:12px;height:12px;background:#E866A0;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(232,102,160,0.4);"></div>
    <div style="margin-top:2px;font-size:9px;font-weight:600;color:#2D3748;background:rgba(255,255,255,0.85);padding:1px 4px;border-radius:4px;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.1);">${safeName}</div>
  </div>`
}

/* ── StationMap component ─────────────────────────────────────── */

/**
 * StationMap
 * Naver Map with current-location marker + all station markers.
 * Handles geocoding, marker creation, focus/morph animation.
 *
 * Focus flow:
 * - Marker click -> calls onStationFocus(rawIndex) (parent handles toggle)
 * - Parent changes focusedIndex prop -> effect updates markers + pans map
 * - My-location button -> resets focus via onStationFocus(null) + pans map
 */
export default function StationMap({
  stations,
  centerLat,
  centerLon,
  locationName,
  focusedIndex,
  onStationFocus,
  onFocusError,
  onMapReady,
}) {
  const mapContainerRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const naverRef = useRef(null)
  // Array of { marker, coords } for each station (index-matched)
  const stationMarkersRef = useRef([])
  const idleListenerRef = useRef(null)
  const markersReadyRef = useRef(false)
  const pendingFocusIndexRef = useRef(null)
  const isInitializingRef = useRef(true)
  // Track the last focusedIndex we processed, to avoid redundant work
  const lastProcessedFocusRef = useRef(null)
  // Ref to always point to the latest onStationFocus callback (avoids stale closures in marker click listeners)
  const onStationFocusRef = useRef(onStationFocus)
  onStationFocusRef.current = onStationFocus

  /* ── idle listener helpers ── */

  const clearIdleListener = useCallback(() => {
    if (idleListenerRef.current && naverRef.current?.maps?.Event) {
      naverRef.current.maps.Event.removeListener(idleListenerRef.current)
      idleListenerRef.current = null
    }
  }, [])

  const runAfterMapIdle = useCallback((callback) => {
    const naver = naverRef.current
    const map = mapInstanceRef.current
    if (!naver || !map || typeof callback !== 'function') {
      callback?.()
      return
    }
    clearIdleListener()
    const listener = naver.maps.Event.addListener(map, 'idle', () => {
      clearIdleListener()
      callback()
    })
    idleListenerRef.current = listener
  }, [clearIdleListener])

  /* ── marker style updater ── */

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

  /* ── Apply focus to map (pan/morph + on-demand geocoding) ── */

  const applyFocusToMapRef = useRef(null)

  const applyFocusToMap = useCallback(async (newIndex) => {
    lastProcessedFocusRef.current = newIndex
    updateMarkerStyles(newIndex)

    const naver = naverRef.current
    const map = mapInstanceRef.current
    if (!naver || !map) return

    if (isInitializingRef.current || !markersReadyRef.current) {
      pendingFocusIndexRef.current = newIndex
      return
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
        markersReadyRef.current = false
        map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40, maxZoom: 15 })
        runAfterMapIdle(() => {
          markersReadyRef.current = true
          // Flush any pending focus that arrived during the fitBounds animation
          if (pendingFocusIndexRef.current != null) {
            const pending = pendingFocusIndexRef.current
            pendingFocusIndexRef.current = null
            if (applyFocusToMapRef.current) applyFocusToMapRef.current(pending)
          }
        })
      }
      return
    }

    let entry = stationMarkersRef.current[newIndex]

    // On-demand geocoding: if no marker was created during init, try now
    if (!entry?.coords) {
      const station = stations[newIndex]
      const coords = await resolveStationCoords(
        naver,
        station,
        locationName,
        centerLat,
        centerLon
      )
      // Bail out if focus changed while we were geocoding
      if (coords && lastProcessedFocusRef.current === newIndex) {
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
          onStationFocusRef.current(newIndex)
        })
        entry = { marker, coords: pos }
        stationMarkersRef.current[newIndex] = entry
      }
    }

    if (!entry?.coords) {
      onFocusError?.('해당 측정소 위치를 찾지 못했습니다. 다른 측정소를 선택해 주세요.')
      return
    }

    // Zoom in close to the station (~500m radius = zoom 16)
    if (typeof map.morph === 'function') {
      map.morph(entry.coords, 16)
    } else {
      map.panTo(entry.coords)
      map.setZoom(16, true)
    }
  }, [centerLat, centerLon, locationName, onFocusError, runAfterMapIdle, stations, updateMarkerStyles])

  // Keep ref updated for async callbacks
  applyFocusToMapRef.current = applyFocusToMap

  /* ── Initialize map + geocode all stations + place all markers ── */

  useEffect(() => {
    if (!mapContainerRef.current) return

    let unmounted = false

    const initMap = async () => {
      try {
        isInitializingRef.current = true
        markersReadyRef.current = false
        pendingFocusIndexRef.current = null

        await loadNaverMapScript()
        if (unmounted) return

        const naver = window.naver
        if (!naver?.maps) {
          throw new Error('NAVER_MAP_API_UNAVAILABLE')
        }
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
          scrollWheel: true,
          disableDoubleTapZoom: false,
          disableDoubleClickZoom: false,
        })
        mapInstanceRef.current = map

        // Current location marker (blue circle)
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
              const coords = await resolveStationCoords(
                naver,
                station,
                locationName,
                centerLat,
                centerLon
              )
              if (coords) {
                lat = coords.lat
                lon = coords.lon
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

          // Marker click -> tell parent (parent handles toggle logic)
          naver.maps.Event.addListener(marker, 'click', () => {
            onStationFocusRef.current(index)
          })

          return { marker, coords: pos }
        })

        stationMarkersRef.current = markers

        // fitBounds to show everything
        const markReady = () => {
          isInitializingRef.current = false
          markersReadyRef.current = true
          onMapReady?.()
          // Flush any pending focus
          if (pendingFocusIndexRef.current != null) {
            const pending = pendingFocusIndexRef.current
            pendingFocusIndexRef.current = null
            if (applyFocusToMapRef.current) applyFocusToMapRef.current(pending)
          }
        }

        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40, maxZoom: 15 })
          runAfterMapIdle(markReady)
        } else {
          markReady()
        }

      } catch (error) {
        console.warn('StationMap 지도 로드 실패:', error)
        isInitializingRef.current = false
        onMapReady?.()
      }
    }

    initMap()

    return () => {
      unmounted = true
      stationMarkersRef.current.forEach((entry) => {
        if (entry?.marker) entry.marker.setMap(null)
      })
      stationMarkersRef.current = []
      markersReadyRef.current = false
      pendingFocusIndexRef.current = null
      isInitializingRef.current = false
      clearIdleListener()
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy()
        mapInstanceRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearIdleListener, locationName, runAfterMapIdle, stations, centerLat, centerLon])

  /* ── React to focusedIndex changes from parent ── */

  useEffect(() => {
    const idx = focusedIndex ?? null
    if (idx === lastProcessedFocusRef.current) return
    applyFocusToMap(idx)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedIndex])

  /* ── My-location button handler ── */

  const handleMyLocation = useCallback(() => {
    const naver = naverRef.current
    const map = mapInstanceRef.current
    if (!naver || !map) return
    pendingFocusIndexRef.current = null
    lastProcessedFocusRef.current = null
    onStationFocusRef.current(null)
    updateMarkerStyles(null)
    const centerPos = new naver.maps.LatLng(centerLat, centerLon)
    if (typeof map.morph === 'function') {
      map.morph(centerPos, 14)
    } else {
      map.panTo(centerPos)
      map.setZoom(14, true)
    }
  }, [centerLat, centerLon, updateMarkerStyles])

  /* ── Render ── */

  return (
    <div className="relative">
      <div
        ref={mapContainerRef}
        className="w-full rounded-2xl overflow-hidden border border-white/60 mb-3"
        style={{ height: '280px', background: '#f0f0f0' }}
      />

      {/* My location button */}
      <button
        onClick={handleMyLocation}
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
  )
}
