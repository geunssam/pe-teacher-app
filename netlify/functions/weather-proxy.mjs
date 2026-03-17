/**
 * Netlify Function: 공공데이터 API 프록시 (기상청 + 에어코리아)
 *
 * API 키를 서버 사이드에 두어 클라이언트 번들 노출 방지.
 *
 * 환경변수 (Netlify 대시보드):
 *   PUBLIC_DATA_API_KEY — 공공데이터포털 API 키
 */

const ALLOWED_ORIGIN = 'https://pehub.netlify.app'

const TARGETS = {
  weather: 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0',
  air: 'https://apis.data.go.kr/B552584/ArpltnInforInqireSvc',
  station: 'https://apis.data.go.kr/B552584/MsrstnInfoInqireSvc',
}

export default async (request) => {
  const url = new URL(request.url)
  const target = url.searchParams.get('target') // "weather" or "air"
  const path = url.searchParams.get('path') // e.g. "getUltraSrtNcst"

  const resHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  }

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  const baseUrl = TARGETS[target]
  if (!baseUrl || !path) {
    return new Response(
      JSON.stringify({ error: 'invalid target or path' }),
      { status: 400, headers: resHeaders }
    )
  }

  const apiKey = process.env.PUBLIC_DATA_API_KEY
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'api_key_missing' }),
      { status: 500, headers: resHeaders }
    )
  }

  // 클라이언트가 보낸 쿼리 파라미터를 그대로 전달하되, serviceKey만 서버에서 주입
  const params = new URLSearchParams(url.search)
  params.delete('target')
  params.delete('path')
  params.set('serviceKey', apiKey)

  try {
    const apiRes = await fetch(`${baseUrl}/${path}?${params}`)
    const body = await apiRes.text()
    return new Response(body, {
      status: apiRes.status,
      headers: resHeaders,
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 502, headers: resHeaders }
    )
  }
}

export const config = {
  path: '/api/public-data',
}
