import express, { type Express } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { type Server } from "http";
import viteConfig from "../vite.config";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const clientRoot = path.resolve(__dirname, "..", "client");
  const clientSrcPath = path.resolve(clientRoot, "src");

  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    root: clientRoot,
    base: "/", // Ensure base path is correctly set
    resolve: {
      alias: {
        "@": clientSrcPath,
        "@shared": path.resolve(__dirname, "..", "shared"),
        "@components": path.resolve(clientSrcPath, "components"),
        "@hooks": path.resolve(clientSrcPath, "hooks"),
        "@pages": path.resolve(clientSrcPath, "pages"),
        "@lib": path.resolve(clientSrcPath, "lib"),
      },
    },
    server: {
      ...serverOptions,
      middlewareMode: true,
      fs: {
        strict: false,
        allow: [
          path.resolve(__dirname, ".."),
          clientRoot,
          path.resolve(clientRoot, "src"),
          path.resolve(clientRoot, "src", "components"),
          path.resolve(clientRoot, "src", "hooks"),
          path.resolve(clientRoot, "src", "pages"),
          path.resolve(clientRoot, "src", "lib"),
        ],
      },
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
    appType: "custom",
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        // Don't exit on error, just log it
      },
    },
  });

  app.use(vite.middlewares);

  // Define proper MIME types
  const mimeTypes = {
    ".js": "application/javascript",
    ".mjs": "application/javascript",
    ".ts": "application/javascript",
    ".tsx": "application/javascript",
    ".jsx": "application/javascript",
    ".css": "text/css",
    ".html": "text/html",
    ".json": "application/json",
  };

  // Serve static files from the client/public directory
  app.use("/public", express.static(path.resolve(clientRoot, "public")));

  // Add custom middleware for handling assets to ensure proper MIME types
  app.use("/assets", (req, res, next) => {
    try {
      // Get file extension from request path
      const ext = path.extname(req.path);
      // Check if we have a MIME type for this extension
      if (mimeTypes[ext as keyof typeof mimeTypes]) {
        res.type(mimeTypes[ext as keyof typeof mimeTypes]);
      }
      next();
    } catch (err) {
      next();
    }
  });

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(clientRoot, "index.html");

      // Always reload the index.html file from disk in case it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");

      // Apply Vite's HTML transforms
      const transformedHtml = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(transformedHtml);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      console.error("Vite HTML transform error:", e);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  // Define proper MIME types for production
  const mimeTypes = {
    ".js": "application/javascript",
    ".mjs": "application/javascript",
    ".ts": "application/javascript",
    ".tsx": "application/javascript",
    ".jsx": "application/javascript",
    ".css": "text/css",
    ".html": "text/html",
    ".json": "application/json",
  };

  // Set headers for production static files
  app.use(
    express.static(distPath, {
      setHeaders: (res, filePath) => {
        const ext = path.extname(filePath);
        if (mimeTypes[ext as keyof typeof mimeTypes]) {
          res.setHeader(
            "Content-Type",
            mimeTypes[ext as keyof typeof mimeTypes]
          );
        }
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("X-Content-Type-Options", "nosniff");
      },
    })
  );

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
