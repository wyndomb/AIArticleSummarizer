import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Utility function for consistent timestamp-based logging
 * Can be called with either:
 * - logWithTimestamp(message) - uses "AUTH" as default category
 * - logWithTimestamp(category, message) - uses specified category
 */
export function logWithTimestamp(message: string): void;
export function logWithTimestamp(category: string, message: string): void;
export function logWithTimestamp(
  categoryOrMessage: string,
  message?: string
): void {
  const timestamp = new Date().toISOString().substr(11, 12); // HH:MM:SS.mmm

  if (message === undefined) {
    // Single parameter version (backwards compatibility)
    console.log(`[${timestamp}] AUTH: ${categoryOrMessage}`);
  } else {
    // Two parameter version
    console.log(`[${timestamp}] ${categoryOrMessage}: ${message}`);
  }
}

// Generate a UUID for request tracking
export const generateUUID = (): string => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
