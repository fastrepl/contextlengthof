import { defineConfig, loadEnv } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const catalogProxyTarget =
    env.VITE_CATALOG_API_PROXY_TARGET || "http://127.0.0.1:8000";

  return {
    plugins: [svelte()],
    server: {
      // Enable SPA fallback for client-side routing
      historyApiFallback: true,
      // When VITE_USE_LOCAL_CATALOG_API=true, the app fetches /model_catalog (same origin);
      // proxy to litellm-model-catalog-api so the browser avoids CORS.
      proxy: {
        "/model_catalog": {
          target: catalogProxyTarget,
          changeOrigin: true,
        },
      },
    },
    preview: {
      proxy: {
        "/model_catalog": {
          target: catalogProxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
