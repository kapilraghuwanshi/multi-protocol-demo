import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/grpc': {
        target: 'http://localhost:5500', // since grpc-http-proxy.js runs on 5500
        changeOrigin: true,
        secure: false,
      },
    },
  },
})