import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isDevelopment = mode === "development";

  return {
    plugins: [tailwindcss(), react()],
    server: {
      port: 5174,
      host: "0.0.0.0", // Make sure Vite binds to all IPs, so it's accessible externally
      strictPort: true, // Ensure the port is strictly enforced
      origin: isDevelopment
        ? "http://167.172.216.231:5174"
        : "https://erp.tarstech.in",
      hmr: isDevelopment
        ? {
            protocol: "ws",
            host: "localhost",
            port: 5174,
          }
        : {
            protocol: "wss",
            host: "erp.tarstech.in",
            port: 5174,
          },
      allowedHosts: [
        "localhost",
        "127.0.0.1",
        "erp.tarstech.in",
        ".tarstech.in", // This allows any subdomain of tarstech.in
        "167.172.216.231", // Add your server IP here for direct access if needed
      ],
    proxy: {
      "/api": {
        target: "https://backenderp.tarstech.in", // Use local backend if running, otherwise update to your backend server
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, "/api"), // Keep /api in path
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            console.error('[vite-proxy] error:', err.message);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('[vite-proxy] ' + req.method + ' ' + req.url);
          });
        }
      }
    }
    },
  };
});
