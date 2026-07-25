import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // jsPDF has an optional dynamic import for dompurify (only used by its
    // .html() method, which this app doesn't call). Excluding it here stops
    // Vite's dev-server dependency scanner from erroring on that unused path.
    exclude: ['jspdf'],
  },
})
