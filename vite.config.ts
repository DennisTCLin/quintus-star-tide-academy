import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://127.0.0.1:4197' } },
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].v-[hash].js',
        chunkFileNames: 'assets/[name].v-[hash].js',
        assetFileNames: 'assets/[name].v-[hash][extname]',
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts', 'src/__tests__/**/*.test.mjs'],
  },
})
