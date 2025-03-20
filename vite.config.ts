import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path, { dirname } from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// This function is used to define config so we can access env variables during development
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Load from both root directory and client directory
  const rootEnv = loadEnv(mode, path.resolve(__dirname, "."));
  const clientEnv = loadEnv(mode, path.resolve(__dirname, "client"));

  // Merge the environment variables, preferring client env vars if duplicated
  const env = { ...rootEnv, ...clientEnv };

  const clientSrcPath = path.resolve(__dirname, "client", "src");

  console.log("Loaded environment variables:", Object.keys(env).join(", "));
  console.log("Client src path:", clientSrcPath);

  return {
    plugins: [
      react({
        // Explicitly set the JSX runtime
        jsxRuntime: "automatic",
      }),
      runtimeErrorOverlay(),
      themePlugin(),
    ],
    resolve: {
      alias: {
        "@": clientSrcPath,
        "@shared": path.resolve(__dirname, "shared"),
        "@components": path.resolve(clientSrcPath, "components"),
        "@hooks": path.resolve(clientSrcPath, "hooks"),
        "@pages": path.resolve(clientSrcPath, "pages"),
        "@lib": path.resolve(clientSrcPath, "lib"),
      },
    },
    root: path.resolve(__dirname, "client"),
    publicDir: path.resolve(__dirname, "client", "public"),
    base: "/", // Explicitly set base path to root
    build: {
      outDir: path.resolve(__dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      watch: {
        usePolling: true,
      },
      fs: {
        strict: false,
        allow: [
          path.resolve(__dirname),
          path.resolve(__dirname, "client"),
          path.resolve(__dirname, "client/src"),
        ],
      },
      // Add explicit MIME type configuration
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
    // Make available all loaded env variables in Vite
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
        env.VITE_SUPABASE_URL
      ),
      "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(
        env.VITE_SUPABASE_ANON_KEY
      ),
    },
  };
});
