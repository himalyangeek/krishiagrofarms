import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves this project from /krishiagrofarms/, not domain root —
  // without this, built asset URLs would 404 the same way /src/main.jsx did.
  // Change this if you move to a custom domain or a user/org page (use '/' there).
  base: '/krishiagrofarms/',
})
