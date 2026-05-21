import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // CoinSpot's latestprice endpoint sends no CORS headers, so the browser
      // can't call it directly. In dev, route /coinspot/* through Vite to the
      // real host (server-to-server, no CORS). See src/utils/coinspot.ts.
      '/coinspot': {
        target: 'https://www.coinspot.com.au',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/coinspot/, ''),
      },
    },
  },
});
