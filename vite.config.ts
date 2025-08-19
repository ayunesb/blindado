import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react()],
  root: '.',
  build: {
    rollupOptions: {
      input: {
  index: resolve(__dirname, 'index.html'),
        client: resolve(__dirname, 'client.html'),
        guard: resolve(__dirname, 'guard.html'),
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
  port: 5173,
    host: true,
  },
  preview: {
  port: 4173,
    host: true,
  },
})
