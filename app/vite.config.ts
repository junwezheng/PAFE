import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * PreStocks serves no `Access-Control-Allow-Origin`, so the browser can't call
 * it directly. Dev and preview proxy `/api/prestocks` exactly as the Vercel
 * rewrite does in production (see `vercel.json`), keeping the app a static
 * build with no server of its own.
 */
const prestocksProxy = {
  '/api/prestocks': {
    target: 'https://prestocks.com',
    changeOrigin: true,
  },
};

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
    proxy: prestocksProxy,
  },
  preview: {
    proxy: prestocksProxy,
  },
});
