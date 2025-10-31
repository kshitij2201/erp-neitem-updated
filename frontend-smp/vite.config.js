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
      host: "0.0.0.0", // Make sure it binds to external IPs
      strictPort: true,
      origin: isDevelopment
        ? "http://localhost:5174"
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
        ".tarstech.in",
        "localhost",
      ],
      proxy: {
        "/api": {
          target: "http://167.172.216.231:4000", // use localhost if backend is on same server
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
