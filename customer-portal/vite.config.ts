import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 5173,

    // DEV only:
    // Allow temporary Cloudflare Quick Tunnel hostnames
    // so the mobile browser can reach the local Vite server.
    allowedHosts: [".trycloudflare.com"],
  },
});
