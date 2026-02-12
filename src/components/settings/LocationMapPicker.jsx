import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { loadNaverMapScript } from '../../utils/loadNaverMapScript'

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
export default function LocationMapPicker({ initialLat, initialLon, onSelect, onCancel }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)
  const [selectedCoords, setSelectedCoords] = useState({
    lat: initialLat,
    lon: initialLon,
  })

  useEffect(() => {
    let isUnmounted = false

    const initializeMap = async () => {
      try {
        await loadNaverMapScript()

        if (isUnmounted || !mapRef.current) {
          return
        }

        const { naver } = window
        if (!naver || !naver.maps) {
          throw new Error('NAVER_MAP_API_UNAVAILABLE')
        }

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
          setSelectedCoords({ lat, lon })
        })

        // 지도 클릭 이벤트
        naver.maps.Event.addListener(map, 'click', (e) => {
          const lat = e.coord.lat()
          const lon = e.coord.lng()

          // 마커 이동
          marker.setPosition(new naver.maps.LatLng(lat, lon))
          setSelectedCoords({ lat, lon })
        })
      } catch (error) {
        console.error('Failed to initialize Naver map:', error)
        toast.error('네이버 지도 인증 실패: 네이버 콘솔의 웹 서비스 URL 설정을 확인하세요')
      }
    }

    initializeMap()

    // cleanup
    return () => {
      isUnmounted = true

      if (markerRef.current) {
        markerRef.current.setMap(null)
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy()
      }
    }
  }, [initialLat, initialLon])

  const handleConfirm = () => {
    onSelect(selectedCoords.lat, selectedCoords.lon)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-md">
      <div className="w-full max-w-2xl bg-cream rounded-3xl overflow-hidden shadow-2xl">
        {/* 헤더 */}
        <div className="p-lg bg-gradient-to-r from-primary/90 to-primary/70 text-white">
          <h2 className="text-xl font-bold mb-xs">🗺️ 지도에서 위치 선택</h2>
          <p className="text-sm opacity-90">
            지도를 클릭하거나 마커를 드래그해서 위치를 선택하세요
          </p>
        </div>

        {/* 지도 영역 */}
        <div className="relative">
          <div
            ref={mapRef}
            className="w-full h-[60vh] min-h-[400px]"
          />

          {/* 좌표 정보 표시 */}
          <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-xl shadow-md border border-white/80">
            <div className="text-xs text-muted">선택한 위치</div>
            <div className="text-sm font-semibold">
              위도: {selectedCoords.lat.toFixed(6)}
            </div>
            <div className="text-sm font-semibold">
              경도: {selectedCoords.lon.toFixed(6)}
            </div>
          </div>
        </div>

        {/* 버튼 영역 */}
        <div className="p-lg bg-white/60 flex gap-md">
          <button
            onClick={onCancel}
            className="flex-1 py-3 px-4 bg-white/80 rounded-xl font-semibold hover:bg-white transition-all border border-white/80"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-3 px-4 rounded-xl font-semibold transition-all text-white"
            style={{ backgroundColor: '#7C9EF5' }}
          >
            ✅ 이 위치로 설정
          </button>
        </div>

        {/* 안내 메시지 */}
        <div className="px-lg pb-lg">
          <div className="p-md bg-primary/10 rounded-xl border border-primary/30">
            <div className="text-caption text-text-muted">
              💡 지도를 클릭하거나 마커를 드래그하여 정확한 위치를 선택하세요
              <br />
              💡 확인 버튼을 누르면 자동으로 가장 가까운 대기질 측정소를 찾습니다
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
