import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSettings } from '../hooks/useSettings'
import { useClassManager } from '../hooks/useClassManager'
import { findNearestStation } from '../services/weatherApi'
import { CITY_COORDS } from '../utils/gridConvert'
import toast from 'react-hot-toast'
import { confirm } from '../components/common/ConfirmDialog'
import GlassCard from '../components/common/GlassCard'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { location, updateLocation, resetSettings } = useSettings()
  const { resetClassSetup } = useClassManager()

  const [isDetecting, setIsDetecting] = useState(false)
  const [showCitySelect, setShowCitySelect] = useState(false)

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
          const station = await findNearestStation(lat, lon)

          updateLocation({
            name: '현재 위치',
            address: `위도 ${lat.toFixed(4)}, 경도 ${lon.toFixed(4)}`,
            lat,
            lon,
            stationName: station.stationName,
          })

          toast.dismiss()
          toast.success(
            `위치 설정 완료!\n대기질 측정소: ${station.stationName}${
              station.distance ? ` (${station.distance.toFixed(1)}km)` : ''
            }`
          )
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

  // 도시 선택
  const handleSelectCity = async (cityName, coords) => {
    toast.loading('측정소를 찾는 중...')

    try {
      const station = await findNearestStation(coords.lat, coords.lon)

      updateLocation({
        name: cityName,
        address: cityName,
        lat: coords.lat,
        lon: coords.lon,
        stationName: station.stationName,
      })

      toast.dismiss()
      toast.success(
        `${cityName} 설정 완료!\n대기질 측정소: ${station.stationName}${
          station.distance ? ` (${station.distance.toFixed(1)}km)` : ''
        }`
      )

      setShowCitySelect(false)
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

  // 전체 설정 초기화
  const handleResetAll = async () => {
    const confirmed = await confirm(
      '모든 설정을 초기화하시겠습니까?\n학급, 시간표, 위치 정보가 모두 삭제됩니다.',
      '전체 초기화',
      '취소'
    )

    if (confirmed) {
      resetSettings()
      resetClassSetup()
      toast.success('모든 설정이 초기화되었습니다')
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
          <h2 className="text-card-title mb-md">📍 학교 위치 설정</h2>
          <p className="text-body text-muted mb-md">
            위치를 설정하면 날씨와 대기질 정보가 정확해집니다.
          </p>

          {/* 현재 설정된 위치 */}
          {location.address && (
            <div className="mb-lg p-md bg-success/10 rounded-xl border border-success/30">
              <div className="flex items-start gap-2">
                <span className="text-xl">✅</span>
                <div className="flex-1">
                  <div className="text-body-bold text-success mb-xs">
                    {location.name}
                  </div>
                  <div className="text-caption text-text-muted">
                    📍 {location.address}
                  </div>
                  <div className="text-caption text-text-muted">
                    🌫️ 대기질 측정소: {location.stationName}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 위치 설정 버튼 */}
          <div className="space-y-sm">
            <button
              onClick={handleAutoDetect}
              disabled={isDetecting}
              className="w-full py-3 px-4 rounded-xl font-semibold transition-all text-white"
              style={{ backgroundColor: '#7C9EF5' }}
            >
              {isDetecting ? '위치 확인 중...' : '📍 현재 위치로 자동 설정'}
            </button>

            <button
              onClick={() => setShowCitySelect(!showCitySelect)}
              className="w-full py-3 px-4 bg-white/60 rounded-xl font-semibold hover:bg-white/80 transition-all border border-white/80"
            >
              🗺️ 주요 도시 선택
            </button>
          </div>

          {/* 도시 선택 패널 */}
          {showCitySelect && (
            <div className="mt-md p-md bg-white/60 rounded-xl border border-white/80">
              <div className="text-body-bold mb-sm">주요 도시 선택</div>
              <div className="grid grid-cols-2 gap-sm">
                {Object.entries(CITY_COORDS).map(([cityName, coords]) => (
                  <button
                    key={cityName}
                    onClick={() => handleSelectCity(cityName, coords)}
                    className="py-2 px-3 bg-white/80 rounded-lg font-semibold hover:bg-primary/10 hover:text-primary transition-all border border-white/80"
                  >
                    {cityName}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 안내 메시지 */}
          <div className="mt-md p-md bg-primary/10 rounded-xl border border-primary/30">
            <div className="text-caption text-text-muted">
              💡 <strong>자동 설정</strong>: 학교에서 버튼 클릭 → 자동으로 위치 감지
              <br />
              💡 <strong>도시 선택</strong>: 시청 위치 기준으로 날씨 정보 제공
              <br />
              💡 날씨는 도시 단위로 충분히 정확합니다
            </div>
          </div>
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

        {/* 전체 초기화 */}
        <GlassCard>
          <h2 className="text-card-title mb-md">⚠️ 위험 영역</h2>
          <p className="text-body text-muted mb-md">
            모든 설정을 초기화합니다. 이 작업은 되돌릴 수 없습니다.
          </p>

          <button
            onClick={handleResetAll}
            className="w-full py-3 px-4 bg-danger/20 text-danger rounded-lg font-semibold hover:bg-danger/30 transition-all border border-danger/30"
          >
            🗑️ 전체 설정 초기화
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
    </div>
  )
}
