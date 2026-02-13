/**
 * Netlify Function: 네이버 검색 API 프록시
 *
 * 브라우저에서 직접 호출 시 CORS 차단되므로
 * 서버(Netlify Function)를 거쳐 네이버 API를 호출합니다.
 *
 * 환경변수 (Netlify 대시보드 → Site settings → Environment variables):
 *   NAVER_SEARCH_CLIENT_ID     - developers.naver.com 애플리케이션 Client ID
 *   NAVER_SEARCH_CLIENT_SECRET - developers.naver.com 애플리케이션 Client Secret
 */

export default async (request) => {
  const url = new URL(request.url)
  const query = url.searchParams.get('query')
  const display = url.searchParams.get('display') || '10'
  const sort = url.searchParams.get('sort') || 'random'

  const resHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  }

  if (!query) {
    return new Response(JSON.stringify({ items: [] }), { status: 200, headers: resHeaders })
  }

  const clientId = process.env.NAVER_SEARCH_CLIENT_ID
  const clientSecret = process.env.NAVER_SEARCH_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return new Response(
      JSON.stringify({ items: [], _proxyError: 'credentials_missing' }),
      { status: 200, headers: resHeaders }
    )
  }

  try {
    const params = new URLSearchParams({ query, display: String(display), start: '1', sort })
    const apiRes = await fetch(
      `https://openapi.naver.com/v1/search/local.json?${params}`,
      {
        headers: {
          'X-Naver-Client-Id': clientId,
          'X-Naver-Client-Secret': clientSecret,
        },
      }
    )

    if (!apiRes.ok) {
      return new Response(
        JSON.stringify({ items: [], _proxyError: `naver_${apiRes.status}` }),
        { status: 200, headers: resHeaders }
      )
    }

    const data = await apiRes.json()
    return new Response(JSON.stringify(data), { status: 200, headers: resHeaders })
  } catch (err) {
    return new Response(
      JSON.stringify({ items: [], _proxyError: err.message }),
      { status: 200, headers: resHeaders }
    )
  }
}

export const config = {
  path: '/api/naver-search',
}
