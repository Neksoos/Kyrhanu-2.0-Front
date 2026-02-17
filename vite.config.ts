import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: { host: true, port: 5173 },
  build: { sourcemap: false },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
});