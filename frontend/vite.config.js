import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          vendor: ['axios', 'react-hook-form', 'react-hot-toast', 'react-icons'],
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
  },
});
