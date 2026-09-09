import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // As variáveis de ambiente vivem no .env da raiz do monorepo, não em frontend/.
  // Só as prefixadas com VITE_ chegam ao cliente.
  envDir: '..',
  server: {
    port: 5173,
  },
})
