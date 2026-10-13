import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Emit every asset (incl. small font subsets) as a real file instead of a
  // data: URI, so the Content-Security-Policy can stay at font-src 'self'.
  build: { assetsInlineLimit: 0 },
  test: { testTimeout: 30000 },
})
