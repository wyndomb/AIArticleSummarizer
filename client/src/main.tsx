import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
// Import the cache clearer to force module reloading during development
import "../clear-cache.js";

// Add a timestamp to force cache refresh
const timestamp = Date.now();
console.log(
  `[${new Date().toISOString()}] App starting, cache timestamp: ${timestamp}`
);

createRoot(document.getElementById("root")!).render(<App />);
