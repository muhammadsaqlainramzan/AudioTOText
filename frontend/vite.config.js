import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

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
    fs: {
      allow: [path.resolve(currentDir, '..')],
    },
  },
});
