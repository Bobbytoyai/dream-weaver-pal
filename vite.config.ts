import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-ui": ["@radix-ui/react-dialog", "@radix-ui/react-tooltip", "@radix-ui/react-popover", "@radix-ui/react-select", "@radix-ui/react-tabs", "sonner", "class-variance-authority", "clsx", "tailwind-merge"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-recharts": ["recharts"],
          "bobby-content": [
            "./src/lib/bobby-content/blagues.ts",
            "./src/lib/bobby-content/histoires.ts",
            "./src/lib/bobby-content/chansons.ts",
            "./src/lib/bobby-content/bibliotheque.ts",
            "./src/lib/bobby-content/cerveau.ts",
            "./src/lib/bobby-content/contenu.ts",
            "./src/lib/bobby-content/index.ts",
          ],
        },
      },
    },
  },
}));
