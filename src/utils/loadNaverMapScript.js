const NAVER_MAPS_CLIENT_ID =
  import.meta.env.VITE_NAVER_MAPS_CLIENT_ID || import.meta.env.VITE_NAVER_CLIENT_ID

const NAVER_MAP_SCRIPT_ID = 'naver-map-sdk'

let scriptLoadPromise = null

function hasValidClientId() {
  if (!NAVER_MAPS_CLIENT_ID) {
    return false
  }

  if (NAVER_MAPS_CLIENT_ID.includes('YOUR_')) {
    return false
  }

  return true
}

function createAuthError() {
  return new Error(
    `NAVER_MAP_AUTH_FAILED (${window.location.origin}) - 네이버 콘솔 웹 서비스 URL 설정을 확인하세요.`
  )
}

export function loadNaverMapScript() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('NAVER_MAP_BROWSER_ONLY'))
  }

  if (window.naver?.maps) {
    return Promise.resolve(window.naver.maps)
  }

  if (!hasValidClientId()) {
    return Promise.reject(new Error('NAVER_MAP_CLIENT_ID_MISSING'))
  }

  if (scriptLoadPromise) {
    return scriptLoadPromise
  }

  scriptLoadPromise = new Promise((resolve, reject) => {
    const handleLoaded = () => {
      if (window.naver?.maps) {
        resolve(window.naver.maps)
        return
      }

      scriptLoadPromise = null
      reject(createAuthError())
    }

    const handleError = () => {
      scriptLoadPromise = null
      reject(new Error('NAVER_MAP_SCRIPT_LOAD_FAILED'))
    }

    const existingScript = document.getElementById(NAVER_MAP_SCRIPT_ID)

    if (existingScript) {
      if (existingScript.dataset.loaded === 'true') {
        handleLoaded()
        return
      }

      existingScript.addEventListener('load', handleLoaded, { once: true })
      existingScript.addEventListener('error', handleError, { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = NAVER_MAP_SCRIPT_ID
    script.async = true
    script.defer = true
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${NAVER_MAPS_CLIENT_ID}`
    script.onload = () => {
      script.dataset.loaded = 'true'
      handleLoaded()
    }
    script.onerror = handleError

    document.head.appendChild(script)
  })

  return scriptLoadPromise
}
