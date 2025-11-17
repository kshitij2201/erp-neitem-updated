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
          target: "http://localhost:4000", // Backend API URL
          changeOrigin: true, // Important for API calls, especially if your backend is on a different port or domain
          secure: false, // Disable SSL validation (useful for local dev with non-https backend)
        },
      },
    },
  };
});
