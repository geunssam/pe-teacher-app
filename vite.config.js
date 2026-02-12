import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'

  return {
    plugins: [react()],
    base: isProduction ? '/pe-teacher-app/' : '/',
    server: {
      port: 5174,
      open: true,
    },
  }
})
