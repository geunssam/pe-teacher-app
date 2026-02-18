// 위치 선택 — 네이버 지도에서 학교 위치를 클릭/검색으로 설정 | 부모→pages/SettingsPage.jsx, 지도SDK→utils/loadNaverMapScript.js, 검색→services/naverLocal.js
import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { loadNaverMapScript } from '../../utils/loadNaverMapScript'
import { searchPlace } from '../../services/naverLocal'

/**
 * LocationMapPicker
 * 네이버 지도에서 위치를 선택하는 모달 컴포넌트
 *
 * @param {Object} props
 * @param {number} props.initialLat - 초기 위도
 * @param {number} props.initialLon - 초기 경도
 * @param {Function} props.onSelect - 위치 선택 시 호출 (lat, lon)
 * @param {Function} props.onCancel - 취소 시 호출
 */
export default function LocationMapPicker({
  initialLat,
  initialLon,
  initialAddress = '',
  onSelect,
  onCancel,
}) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const naverRef = useRef(null)
  const markerRef = useRef(null)
  const searchMarkersRef = useRef([])
  const searchInFlightRef = useRef(false)
  const [isLoadingMap, setIsLoadingMap] = useState(true)
  const [mapInitError, setMapInitError] = useState('')
  const [placeQuery, setPlaceQuery] = useState('')
  const [isSearchingPlace, setIsSearchingPlace] = useState(false)
  const [placeResults, setPlaceResults] = useState([])
  const [selectedPlaceInfo, setSelectedPlaceInfo] = useState(null)
  const [selectedCoords, setSelectedCoords] = useState({
    lat: initialLat,
    lon: initialLon,
  })

  const clearSearchMarkers = () => {
    if (!searchMarkersRef.current.length) {
      return
    }

    searchMarkersRef.current.forEach((marker) => marker.setMap(null))
    searchMarkersRef.current = []
  }

  useEffect(() => {
    let isUnmounted = false

    const initializeMap = async () => {
      try {
        setIsLoadingMap(true)
        setMapInitError('')
        await loadNaverMapScript()

        if (isUnmounted || !mapRef.current) {
          return
        }

        const { naver } = window
        if (!naver || !naver.maps) {
          throw new Error('NAVER_MAP_API_UNAVAILABLE')
        }
        naverRef.current = naver

        // 지도 초기화
        const mapOptions = {
          center: new naver.maps.LatLng(initialLat, initialLon),
          zoom: 15,
          zoomControl: true,
          zoomControlOptions: {
            position: naver.maps.Position.TOP_RIGHT,
          },
        }

        const map = new naver.maps.Map(mapRef.current, mapOptions)
        mapInstanceRef.current = map

        // 초기 마커 생성
        const marker = new naver.maps.Marker({
          position: new naver.maps.LatLng(initialLat, initialLon),
          map,
          draggable: true,
        })
        markerRef.current = marker

        // 마커 드래그 이벤트
        naver.maps.Event.addListener(marker, 'dragend', (e) => {
          const lat = e.coord.lat()
          const lon = e.coord.lng()
          setSelectedPlaceInfo(null)
          setSelectedCoords({ lat, lon })
        })

        // 지도 클릭 이벤트
        naver.maps.Event.addListener(map, 'click', (e) => {
          const lat = e.coord.lat()
          const lon = e.coord.lng()

          // 마커 이동
          marker.setPosition(new naver.maps.LatLng(lat, lon))
          setSelectedPlaceInfo(null)
          setSelectedCoords({ lat, lon })
        })
        setIsLoadingMap(false)
      } catch (error) {
        console.error('Failed to initialize Naver map:', error)
        setIsLoadingMap(false)
        setMapInitError(
          '네이버 지도 인증 실패: 네이버 콘솔에서 Maps용 클라이언트 ID와 웹 서비스 URL을 확인하세요.'
        )
        toast.error('네이버 지도 인증 실패: 콘솔 설정 확인 필요')
      }
    }

    initializeMap()

    // cleanup
    return () => {
      isUnmounted = true
      clearSearchMarkers()

      if (markerRef.current) {
        markerRef.current.setMap(null)
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy()
      }
    }
  }, [initialLat, initialLon])

  const handleConfirm = () => {
    onSelect(selectedCoords.lat, selectedCoords.lon, selectedPlaceInfo)
  }

  const moveMainMarker = (lat, lon) => {
    const naver = naverRef.current
    const map = mapInstanceRef.current
    const marker = markerRef.current
    if (!naver || !map || !marker) {
      return
    }

    const position = new naver.maps.LatLng(lat, lon)
    marker.setPosition(position)
    map.panTo(position)
    setSelectedCoords({ lat, lon })
  }

  const renderSearchMarkers = (results) => {
    const naver = naverRef.current
    const map = mapInstanceRef.current
    if (!naver || !map) {
      return
    }

    clearSearchMarkers()

    const bounds = new naver.maps.LatLngBounds()

    results.forEach((place) => {
      const marker = new naver.maps.Marker({
        position: new naver.maps.LatLng(place.lat, place.lon),
        map,
      })

      naver.maps.Event.addListener(marker, 'click', () => {
        moveMainMarker(place.lat, place.lon)
        setPlaceQuery(place.name)
        setSelectedPlaceInfo({
          name: place.name,
          address: place.roadAddress || place.address || place.name,
          jibunAddress: place.address || '',
        })
      })

      searchMarkersRef.current.push(marker)
      bounds.extend(new naver.maps.LatLng(place.lat, place.lon))
    })

    if (results.length > 1) {
      map.fitBounds(bounds, {
        top: 80,
        right: 80,
        bottom: 80,
        left: 80,
      })
    } else if (results.length === 1) {
      map.panTo(new naver.maps.LatLng(results[0].lat, results[0].lon))
    }
  }

  const handleSearchPlace = async () => {
    if (searchInFlightRef.current) {
      return
    }

    const query = placeQuery.trim()
    if (!query) {
      toast.error('학교명 또는 장소명을 입력하세요')
      return
    }

    searchInFlightRef.current = true
    try {
      setIsSearchingPlace(true)
      let results = await searchPlace(query, {
        enableFallback: false,
        excludeBroad: true,
        hintLat: selectedCoords.lat,
        hintLon: selectedCoords.lon,
        hintAddress: selectedPlaceInfo?.address || initialAddress,
      })

      if (!results.length) {
        results = await searchPlace(query, {
          enableFallback: true,
          excludeBroad: false,
          hintLat: selectedCoords.lat,
          hintLon: selectedCoords.lon,
          hintAddress: selectedPlaceInfo?.address || initialAddress,
        })
      }

      const sliced = results.slice(0, 15)
      setPlaceResults(sliced)

      if (!sliced.length) {
        toast.error('결과가 없습니다. 지역명+학교명 일부로 검색해보세요 (예: 대전 동서초)')
        clearSearchMarkers()
        return
      }

      renderSearchMarkers(sliced)
    } catch (error) {
      console.error('Place search failed:', error)
      toast.error('장소 검색에 실패했습니다')
    } finally {
      setIsSearchingPlace(false)
      searchInFlightRef.current = false
    }
  }

  const handleSelectPlace = (place) => {
    moveMainMarker(place.lat, place.lon)
    setPlaceQuery(place.name)
    setSelectedPlaceInfo({
      name: place.name,
      address: place.roadAddress || place.address || place.name,
      jibunAddress: place.address || '',
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 p-4 overflow-y-auto">
      <div className="min-h-full flex items-center justify-center">
        <div className="w-full max-w-4xl h-[85vh] bg-bg rounded-3xl overflow-hidden shadow-2xl flex flex-col my-8">
        {/* 헤더 */}
        <div className="p-4 bg-gradient-to-r from-primary/90 to-primary/70 text-white shrink-0">
          <h2 className="text-lg font-bold">🗺️ 지도에서 위치 선택</h2>
          <p className="text-sm opacity-90 mt-0.5">
            학교를 검색하거나 지도를 클릭하세요
          </p>
        </div>

        {/* 지도 영역 */}
        <div className="relative flex-1 min-h-0">
          <div ref={mapRef} className="w-full h-full" />

          <div className="absolute top-3 right-3 z-10 w-[280px] max-w-[calc(100%-1.5rem)]">
            <div className="bg-white/95 backdrop-blur-sm border border-white/80 rounded-xl shadow-md p-2">
              <div className="flex gap-1.5">
                <input
                  value={placeQuery}
                  onChange={(e) => setPlaceQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearchPlace()
                    }
                  }}
                  placeholder="학교명 또는 장소 검색"
                  className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-white/80 bg-white/80 text-sm"
                />
                <button
                  onClick={handleSearchPlace}
                  disabled={isSearchingPlace}
                  className="px-2.5 py-1.5 rounded-lg text-sm font-semibold text-white shrink-0"
                  style={{ backgroundColor: '#7C9EF5' }}
                >
                  {isSearchingPlace ? '...' : '검색'}
                </button>
              </div>

              {placeResults.length > 0 && (
                <div className="mt-1.5 max-h-28 overflow-auto rounded-lg border border-white/80 bg-white/90">
                  {placeResults.map((place, idx) => (
                    <button
                      key={`${place.name}-${idx}`}
                      onClick={() => handleSelectPlace(place)}
                      className="w-full text-left px-2.5 py-1.5 border-b last:border-b-0 border-white/60 hover:bg-primary/10 transition-all"
                    >
                      <div className="text-xs font-semibold text-text truncate">{place.name}</div>
                      <div className="text-[11px] text-textMuted truncate">
                        {place.roadAddress || place.address}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {isLoadingMap && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/85">
              <div className="text-sm font-semibold text-textMuted">지도를 불러오는 중...</div>
            </div>
          )}

          {mapInitError && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/90 p-lg">
              <div className="max-w-md text-center p-md rounded-xl border border-danger/30 bg-danger/10">
                <div className="text-body-bold text-danger mb-xs">지도 인증 실패</div>
                <div className="text-caption text-textMuted mb-sm">{mapInitError}</div>
                <div className="text-caption text-textMuted">
                  현재 주소: {window.location.origin}
                </div>
              </div>
            </div>
          )}

          {/* 선택 정보 표시 */}
          {selectedPlaceInfo && (
            <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-xl shadow-md border border-white/80 max-w-[280px]">
              <div className="text-xs text-muted">선택한 장소</div>
              <div className="text-sm font-semibold truncate">{selectedPlaceInfo.name}</div>
              <div className="text-xs text-textMuted truncate">{selectedPlaceInfo.address}</div>
            </div>
          )}
        </div>

        {/* 버튼 영역 */}
        <div className="p-md bg-white/60 flex gap-md shrink-0">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 bg-white/80 rounded-xl font-semibold hover:bg-white transition-all border border-white/80 text-sm"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={Boolean(mapInitError)}
            className="flex-1 py-2.5 px-4 rounded-xl font-semibold transition-all text-white text-sm"
            style={{ backgroundColor: '#7C9EF5' }}
          >
            이 위치로 설정
          </button>
        </div>
        </div>
      </div>
    </div>
  )
}
