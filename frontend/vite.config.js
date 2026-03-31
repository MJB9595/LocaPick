import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  css:{
    devSourcemap:true
  },
 server: {
    host: '0.0.0.0',
    port: 5173,
    watch: { usePolling: true, interval: 1000 },
    hmr: { host: 'localhost', port: 5173 },
    proxy: {
      // API: /api/members → localhost:8080/members
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      // 이미지: /uploads → localhost:8080/uploads
      '/uploads': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  }
});