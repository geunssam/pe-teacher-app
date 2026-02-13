import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSettings } from '../hooks/useSettings'
import { useClassManager } from '../hooks/useClassManager'
import { findNearestStation } from '../services/weatherApi'
import toast from 'react-hot-toast'
import { confirm } from '../components/common/ConfirmDialog'
import GlassCard from '../components/common/GlassCard'
import LocationMapPicker from '../components/settings/LocationMapPicker'

function buildNearestStationMessage(baseName, stationName, distanceKm = null) {
  const safeBaseName = baseName || '선택 위치'
  const safeStationName = stationName || '측정소'
  const distanceText =
    Number.isFinite(distanceKm) && distanceKm > 0 ? ` (${distanceKm.toFixed(1)}km)` : ''
  return `${safeBaseName}에서 가장 가까운 측정소는 ${safeStationName}입니다!${distanceText}`
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const { location, updateLocation } = useSettings()
  const { resetClassSetup } = useClassManager()

  const [isDetecting, setIsDetecting] = useState(false)
  const [showMapPicker, setShowMapPicker] = useState(false)

  // 현재 위치 자동 감지
  const handleAutoDetect = () => {
    if (!navigator.geolocation) {
      toast.error('위치 서비스를 지원하지 않는 브라우저입니다')
      return
    }

    setIsDetecting(true)
    toast.loading('현재 위치를 확인하는 중...')

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude
        const lon = position.coords.longitude

        try {
          // 가장 가까운 측정소 찾기
          const station = await findNearestStation(lat, lon, '')
          const baseName = '현재 위치'

          updateLocation({
            name: baseName,
            address: '현재 위치(자동 감지)',
            lat,
            lon,
            stationName: station.stationName,
          })

          toast.dismiss()
          toast.success(buildNearestStationMessage(baseName, station.stationName, station.distance))
        } catch (error) {
          toast.dismiss()
          toast.error('측정소 조회에 실패했습니다')
        } finally {
          setIsDetecting(false)
        }
      },
      (error) => {
        toast.dismiss()
        setIsDetecting(false)

        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error('위치 권한이 거부되었습니다')
            break
          case error.POSITION_UNAVAILABLE:
            toast.error('위치 정보를 사용할 수 없습니다')
            break
          case error.TIMEOUT:
            toast.error('위치 확인 시간이 초과되었습니다')
            break
          default:
            toast.error('위치 확인 중 오류가 발생했습니다')
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }

  // 지도에서 위치 선택
  const handleMapSelect = async (lat, lon, placeInfo = null) => {
    toast.loading('측정소를 찾는 중...')
    setShowMapPicker(false)

    try {
      const baseName = placeInfo?.name || '선택한 학교'
      const addressLabel = placeInfo?.address || baseName || '지도에서 선택한 위치'
      const jibunAddress = placeInfo?.jibunAddress || ''
      const stationHint = [baseName, addressLabel, jibunAddress].filter(Boolean).join(' ')
      const station = await findNearestStation(lat, lon, stationHint)

      updateLocation({
        name: baseName,
        address: addressLabel,
        lat,
        lon,
        stationName: station.stationName,
      })

      toast.dismiss()
      toast.success(buildNearestStationMessage(baseName, station.stationName, station.distance))
    } catch (error) {
      toast.dismiss()
      toast.error('측정소 조회에 실패했습니다')
    }
  }

  // 학급 설정 초기화
  const handleResetClasses = async () => {
    const confirmed = await confirm(
      '학급 설정을 초기화하시겠습니까?\n모든 학급 데이터가 삭제됩니다.',
      '초기화',
      '취소'
    )

    if (confirmed) {
      resetClassSetup()
      toast.success('학급 설정이 초기화되었습니다')
      navigate('/setup')
    }
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-lg">
        <h1 className="text-page-title">⚙️ 설정</h1>
        <button
          onClick={() => navigate(-1)}
          className="py-2 px-4 bg-white/60 rounded-lg font-semibold hover:bg-white/80 transition-all border border-white/80"
        >
          ← 돌아가기
        </button>
      </div>

      <div className="space-y-xl">
        {/* 학교 위치 설정 */}
        <GlassCard>
          <div className="flex items-center justify-between gap-sm mb-md">
            <h2 className="text-card-title m-0">📍 학교 위치 설정</h2>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleAutoDetect}
                disabled={isDetecting}
                className="py-2 px-3 rounded-lg font-semibold text-sm transition-all text-white disabled:opacity-60"
                style={{ backgroundColor: '#7C9EF5' }}
              >
                {isDetecting ? '📍 확인중' : '📍 자동설정'}
              </button>

              <button
                onClick={() => setShowMapPicker(true)}
                className="py-2 px-3 bg-primary/10 text-primary rounded-lg font-semibold text-sm hover:bg-primary/20 transition-all border border-primary/30"
              >
                🗺️ 지도에서 찾기
              </button>
            </div>
          </div>

          {/* 현재 설정된 위치 */}
          {location.address && (
            <div className="mb-lg p-md bg-success/10 rounded-xl border border-success/30">
              <div className="flex items-center gap-3 overflow-x-auto whitespace-nowrap">
                <span className="text-xl shrink-0">✅</span>
                <div className="text-body-bold text-text shrink-0">
                  {location.name}
                </div>
                <div className="text-caption text-text-muted shrink-0">
                  📍 {location.address}
                </div>
                <div className="text-caption text-text-muted shrink-0">
                  🌫️ {location.name} 기준 최근접 측정소: {location.stationName}
                </div>
              </div>
            </div>
          )}
        </GlassCard>

        {/* 학급 설정 초기화 */}
        <GlassCard>
          <h2 className="text-card-title mb-md">🏫 학급 관리</h2>
          <p className="text-body text-muted mb-md">
            학급 설정을 다시 하거나 초기화할 수 있습니다.
          </p>

          <button
            onClick={handleResetClasses}
            className="w-full py-3 px-4 bg-warning/20 text-warning rounded-lg font-semibold hover:bg-warning/30 transition-all border border-warning/30"
          >
            🔄 학급 설정 초기화
          </button>
        </GlassCard>

        {/* 앱 정보 */}
        <GlassCard>
          <h2 className="text-card-title mb-md">ℹ️ 앱 정보</h2>
          <div className="space-y-sm text-body text-muted">
            <div>버전: 1.0.0 (Beta)</div>
            <div>개발: 초등 체육교사를 위한 PWA</div>
            <div className="text-caption">
              데이터 출처: 기상청, 에어코리아
            </div>
          </div>
        </GlassCard>
      </div>

      {/* 지도 모달 */}
      {showMapPicker && (
        <LocationMapPicker
          initialLat={location.lat}
          initialLon={location.lon}
          initialAddress={location.address || ''}
          onSelect={handleMapSelect}
          onCancel={() => setShowMapPicker(false)}
        />
      )}
    </div>
  )
}
