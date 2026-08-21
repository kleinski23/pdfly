import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // es2022 target: required for mupdf's top-level await (Protect tool).
  // Modern-browser-only is fine — pdfjs-dist v6 already requires it.
  build: {
    target: 'es2022',
  },
  optimizeDeps: {
    // Keep mupdf unbundled so its WASM asset is served as a real file with the
    // correct MIME type (pre-bundling breaks the worker's fetch in dev).
    exclude: ['mupdf'],
    esbuildOptions: {
      target: 'es2022',
    },
  },
})
