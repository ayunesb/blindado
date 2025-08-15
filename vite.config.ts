import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react()],
  root: '.',
  build: {
    rollupOptions: {
      input: {
        client: resolve(__dirname, 'public/client.html'),
        guard: resolve(__dirname, 'public/guard.html'),
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
    copyPublicDir: false,
  },
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    port: 5174,
    host: true,
  },
})
