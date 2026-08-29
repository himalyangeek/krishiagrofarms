import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // GitHub Pages serves the built app from /krishiagrofarms/, not domain root —
  // without this, built asset URLs would 404 the same way /src/main.jsx did.
  // Only applied for `vite build`; local dev keeps serving from '/' so
  // localhost:5173 still works without the subpath. Change '/krishiagrofarms/'
  // if you move to a custom domain or a user/org page (use '/' there instead).
  base: command === 'build' ? '/krishiagrofarms/' : '/',
}))
