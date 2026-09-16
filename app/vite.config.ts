import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // @solana/web3.js and some of its deps still reach for `global`.
    global: 'globalThis',
  },
  resolve: {
    alias: {
      // Browser shim for the `buffer` polyfill spl-token expects.
      buffer: 'buffer',
    },
  },
  optimizeDeps: {
    esbuildOptions: { target: 'es2020' },
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1600,
  },
  server: {
    port: 5173,
    host: true,
  },
});
