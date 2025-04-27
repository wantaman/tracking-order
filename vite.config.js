import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  // plugins: [react()],
  define: {
    global: 'window',
  },
  // server: {
  //   proxy: {
  //     '/ws': {
  //       target: 'http://localhost:9001',
  //       ws: true,
  //       changeOrigin: true,
  //     }
  //   }
  // }
  plugins: [react()],
  server: {
    proxy: {
      '/ws': {
        target: 'http://localhost:9001', // Backend URL
        changeOrigin: true,
        secure: false,
        ws: true, // Enable WebSocket
      },
      '/api': {
        target: 'http://localhost:9001',
        changeOrigin: true,
        secure: true,
      },
    }
  }
})

