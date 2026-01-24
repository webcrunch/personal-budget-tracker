import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Konfigurera server för att hantera miljövariabler under utveckling
  server: {
    host: true, // Tillåt åtkomst från nätverk (krävs i Docker)
    port: 5173, // Standard Vite utvecklingsport
    // Detta används endast under LOKAL utveckling om du kör 'npm run dev' direkt.
    // Docker-bygget använder VITE_API_URL via args i Dockerfile.
    // proxy: {
    //   '/api': {
    //     target: 'http://backend:8080', // Proxy till backend-tjänsten i Docker-nätverket
    //     changeOrigin: true,
    //     rewrite: (path) => path.replace(/^\/api/, '/api'), // Behåll /api prefix
    //   },
    // },
  },
  build: {
    outDir: 'dist', // Standard output-mapp för Vite
  },
});
