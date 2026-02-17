import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    base: '/',
    server: {
      port: 5176,
      open: true,
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      },
      proxy: {
        '/api/naver-search': {
          target: 'https://openapi.naver.com',
          changeOrigin: true,
          rewrite: (path) => {
            const qs = path.includes('?') ? path.substring(path.indexOf('?')) : ''
            return `/v1/search/local.json${qs}`
          },
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              const id = env.VITE_NAVER_SEARCH_CLIENT_ID || env.VITE_NAVER_CLIENT_ID || ''
              const secret = env.VITE_NAVER_SEARCH_CLIENT_SECRET || env.VITE_NAVER_CLIENT_SECRET || ''
              if (id) proxyReq.setHeader('X-Naver-Client-Id', id)
              if (secret) proxyReq.setHeader('X-Naver-Client-Secret', secret)
            })
          },
        },
        '/genkit': {
          target: 'http://localhost:3400',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/genkit/, ''),
        },
      },
    },
  }
})
