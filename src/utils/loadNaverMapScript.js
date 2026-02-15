// 네이버 지도 로더 — 네이버 지도 SDK 스크립트를 동적으로 로드 | 사용처→LocationMapPicker.jsx, StationMap.jsx, API키→.env.local
const NAVER_MAPS_KEY_ID =
  import.meta.env.VITE_NAVER_MAPS_KEY_ID ||
  import.meta.env.VITE_NAVER_KEY_ID ||
  import.meta.env.VITE_NAVER_CLIENT_ID

const NAVER_MAP_SCRIPT_ID = 'naver-map-sdk'

let scriptLoadPromise = null
let authValidationPromise = null

function hasValidKeyId() {
  if (!NAVER_MAPS_KEY_ID) {
    return false
  }

  if (NAVER_MAPS_KEY_ID.includes('YOUR_')) {
    return false
  }

  return true
}

function createAuthError(details = 'Invalid authentication information.') {
  return new Error(
    `NAVER_MAP_AUTH_FAILED (${window.location.origin}) - ${details}`
  )
}

function validateNaverMapAuth() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('NAVER_MAP_BROWSER_ONLY'))
  }

  if (authValidationPromise) {
    return authValidationPromise
  }

  authValidationPromise = new Promise((resolve, reject) => {
    const callbackName = `__naverMapAuthCallback_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const url = encodeURIComponent(window.location.href.split('#')[0])
    const validateUrl =
      `https://oapi.map.naver.com/v3/auth?ncpKeyId=${NAVER_MAPS_KEY_ID}` +
      `&url=${url}&time=${Date.now()}&callback=${callbackName}`

    let validateScript = null

    const cleanup = () => {
      if (validateScript && validateScript.parentNode) {
        validateScript.parentNode.removeChild(validateScript)
      }
      delete window[callbackName]
    }

    window[callbackName] = (payload = {}) => {
      cleanup()

      if (payload.result) {
        resolve(true)
        return
      }

      authValidationPromise = null
      const errorDetails = payload.error?.details || payload.error?.message
      reject(createAuthError(errorDetails))
    }

    validateScript = document.createElement('script')
    validateScript.async = true
    validateScript.defer = true
    validateScript.src = validateUrl
    validateScript.onerror = () => {
      cleanup()
      authValidationPromise = null
      reject(new Error('NAVER_MAP_VALIDATE_REQUEST_FAILED'))
    }

    document.head.appendChild(validateScript)
  })

  return authValidationPromise
}

export async function loadNaverMapScript() {
  if (typeof window === 'undefined') {
    throw new Error('NAVER_MAP_BROWSER_ONLY')
  }

  if (window.naver?.maps) {
    return window.naver.maps
  }

  if (!hasValidKeyId()) {
    throw new Error('NAVER_MAP_KEY_ID_MISSING')
  }

  await validateNaverMapAuth()

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
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${NAVER_MAPS_KEY_ID}&submodules=geocoder`
    script.onload = () => {
      script.dataset.loaded = 'true'
      handleLoaded()
    }
    script.onerror = handleError

    document.head.appendChild(script)
  })

  return scriptLoadPromise
}
