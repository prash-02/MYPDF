import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000
  },
  optimizeDeps: {
    exclude: ['@react-pdf/renderer']
  },
  build: {
    commonjsOptions: {
      include: []
    }
  }
})
