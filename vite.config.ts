import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  base: mode === "github-pages" ? "/documentary-script-editor/" : "/",
  plugins: [react()],
  server: {
    port: 5174,
    host: "127.0.0.1",
    allowedHosts: [".loca.lt", ".trycloudflare.com"]
  },
  preview: {
    allowedHosts: [".loca.lt", ".trycloudflare.com"]
  }
}));
