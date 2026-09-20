import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      buffer: 'buffer/',
    },
  },
  optimizeDeps: {
    include: ['buffer'],
  },
  server: {
    // Avoid Windows EBUSY crashes when watching zip dumps / asset packs
    watch: {
        ignored: [
          '**/tmp/**',
          '**/mod/**',
          '**/*.zip',
          '**/public/assets/ui/kenney-fantasy-borders/**',
          '**/public/assets/ui/parchment/_src/**',
          '**/public/assets/camp/delvers/_unpack/**',
        ],
    },
  },
})
