import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

export default defineConfig({
  preview: {
    allowedHosts: true,
  },
  server: {
    allowedHosts: true,
    port: 8080,
    strictPort: false,
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    tailwindcss(),
    tanstackStart({
      server: { entry: "server" },
      spa: {
        enabled: true,
      },
    }),
    react(),
  ],
});
