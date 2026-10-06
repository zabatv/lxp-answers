import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' keeps asset paths relative so it works on any static host (Render)
export default defineConfig({
  plugins: [react()],
  base: './',
})
