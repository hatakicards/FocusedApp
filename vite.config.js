import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      // Il plugin @base44/vite-plugin forniva questo alias automaticamente
      // (usato da import "@/..." in tutto il progetto, vedi jsconfig.json).
      // Rimosso il plugin, va dichiarato qui esplicitamente.
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
