import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Only the Render deploy needs the "/iot-dashboard/" prefix (Cloudflare Worker
  // proxies pulseorigin.com.br/iot-dashboard/* there and strips it). Local dev
  // (`npm run dev`) and local production builds (`docker compose up --build`, which
  // serves from the root) must NOT get this prefix, so it's opt-in via env var
  // instead of tied to the build command - set VITE_BASE_PATH=/iot-dashboard/ only
  // in the Render Static Site's environment variables.
  base: process.env.VITE_BASE_PATH || '/',
  server: {
    host: true, // accept connections from other devices on the LAN (needed to view the dashboard on a phone)
  },
})
