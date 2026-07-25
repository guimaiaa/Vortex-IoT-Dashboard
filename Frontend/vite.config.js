import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Served behind a Cloudflare Worker proxy at pulseorigin.com.br/iot-dashboard/ in
  // production, so every built asset path needs that prefix. Local dev keeps serving
  // from "/" so `npm run dev` still works at localhost:5173 without the prefix.
  base: command === 'build' ? '/iot-dashboard/' : '/',
  server: {
    host: true, // accept connections from other devices on the LAN (needed to view the dashboard on a phone)
  },
}))
