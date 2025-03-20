import { createServer } from "net";

/**
 * Checks if a port is available for use
 * @param port The port to check
 * @returns A promise that resolves to true if the port is available, false otherwise
 */
export function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();

    server.once("error", (err: NodeJS.ErrnoException) => {
      // If the error is EADDRINUSE, the port is in use
      if (err.code === "EADDRINUSE") {
        resolve(false);
      } else {
        // For other errors, we'll assume the port is not available
        resolve(false);
      }
    });

    server.once("listening", () => {
      // If we made it here, the port is available
      server.close(() => {
        resolve(true);
      });
    });

    server.listen(port);
  });
}

/**
 * Finds an available port starting from the base port and incrementing until finding one
 * @param basePort The starting port to check
 * @param maxAttempts Maximum number of ports to check
 * @returns A promise that resolves to the first available port, or null if none found
 */
export async function findAvailablePort(
  basePort: number,
  maxAttempts: number = 10
): Promise<number | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const port = basePort + attempt;
    const available = await isPortAvailable(port);

    if (available) {
      return port;
    }
  }

  return null; // No available port found
}
