import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  clearScreen: false,
  server: {
    // Bind IPv4 explicitly — WebView2 on Windows is more reliable with 127.0.0.1 than localhost
    port: 1420,
    strictPort: true,
    host: host || "127.0.0.1",
    hmr: host
      ? { protocol: "ws", host, port: 1421 }
      : true,
    watch: { ignored: ["**/src-tauri/**"] },
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: "esnext",
    minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
});
