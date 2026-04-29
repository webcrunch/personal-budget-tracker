import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Laddar miljövariabler baserat på 'mode' (development/production)
  // Det tredje argumentet '' gör att vi laddar alla variabler, även de utan VITE_-prefix om vi vill
  const env = loadEnv(mode, process.cwd(), '');

  return {
    // Om VITE_BASE_PATH finns (t.ex. '/budgettracker/'), använd den, annars '/'
    base: env.VITE_BASE_PATH || '/',

    plugins: [react()],

    server: {
      host: true,
      port: 5173,
    },

    build: {
      outDir: 'dist',
    },
  };
});