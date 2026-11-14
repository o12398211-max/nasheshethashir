import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    // the online game server (npm run dev starts both)
    proxy: { '/socket.io': { target: 'http://localhost:3001', ws: true } },
  },
})
