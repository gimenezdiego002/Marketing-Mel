import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// envDir points at the repo root so the single project .env supplies VITE_* to the client.
// Bind IPv4 explicitly: the default localhost binding is ::1-only here, which the
// 127.0.0.1 URLs in the README, smoke script, and CORS allowlist cannot reach.
export default defineConfig({ plugins: [react()], envDir: '../..', server: { host: '127.0.0.1', port: 5173 } })
