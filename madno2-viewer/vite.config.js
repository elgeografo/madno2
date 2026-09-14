import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Ruta bajo la que se sirve la app en webserver03.leftcape.com
  base: '/03_FINAL/papers/01_MADNO2/',
  publicDir: 'public-prod', // Solo incluir archivos de public-prod en producción
})
