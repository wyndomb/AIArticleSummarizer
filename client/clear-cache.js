// Clear browser cache helper
// This file is only used during development to force a complete reload of all modules

// Add a random query parameter to all module imports
if (import.meta.hot) {
  const timestamp = Date.now();

  // Force module reloading
  import.meta.hot.accept();

  // Log to console that cache clearing is happening
  console.log(`[${new Date().toISOString()}] Clearing module cache...`);

  // Display a message to the developer
  console.log(
    "%c🧹 Module cache cleared! All modules will be reloaded.",
    "background: #4CAF50; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;"
  );
}

export const clearCacheTimestamp = Date.now();
