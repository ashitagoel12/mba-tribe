import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Only treat the root index.html as an entry point — ignore HTML files
  // that exist in data-collection/ and debug-panel/ subdirectories.
  optimizeDeps: {
    entries: ['index.html'],
  },
})
