import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { findAvailablePort } from "./portCheck";

// Set development environment variables for easier debugging
if (process.env.NODE_ENV === "development") {
  process.env.DEBUG_SKIP_AUTH = "true";
  console.log("Running in development mode with auth checks disabled");
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Simple logging middleware
app.use((req, res, next) => {
  // Skip logging for static assets
  if (req.path.startsWith("/assets") || req.path.endsWith(".ico")) {
    return next();
  }

  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
  });
  next();
});

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Server error:", err);
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(statusCode).json({ error: message });
});

(async () => {
  // Register API routes
  const server = registerRoutes(app);

  // Setup Vite in development or serve static files in production
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Start the server with smarter port allocation
  const PREFERRED_PORT = 3000;
  const MAX_PORT_ATTEMPTS = 10;

  // Use the findAvailablePort utility to find an open port
  const availablePort = await findAvailablePort(
    PREFERRED_PORT,
    MAX_PORT_ATTEMPTS
  );

  if (!availablePort) {
    console.error(
      `Could not find an available port in range ${PREFERRED_PORT}-${
        PREFERRED_PORT + MAX_PORT_ATTEMPTS - 1
      }`
    );
    process.exit(1);
  }

  server
    .listen(availablePort, "0.0.0.0", () => {
      log(`Server running on port ${availablePort}`);
      // Print a clear message for users to access the app
      console.log(`\n📝 AI Article Analyzer is running!`);
      console.log(
        `🌐 Open http://localhost:${availablePort} in your browser to access the app\n`
      );
    })
    .on("error", (err: any) => {
      console.error("Failed to start server:", err);
      process.exit(1);
    });
})();
