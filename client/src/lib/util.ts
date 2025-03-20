/**
 * Utility functions for the application
 */

/**
 * Generates a RFC4122 v4 compliant UUID
 * Used for generating unique identifiers for requests, etc.
 */
export function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Logs a message with a timestamp prefix
 * Useful for debugging timing issues
 */
export function logWithTimestamp(prefix: string, message: string): void {
  const timestamp = new Date().toISOString().substr(11, 12); // HH:MM:SS.mmm
  console.log(`[${timestamp}] ${prefix}: ${message}`);
}

/**
 * Safely parses JSON without throwing
 * @param jsonString The JSON string to parse
 * @param fallback Optional fallback value if parsing fails
 * @returns The parsed object or the fallback value
 */
export function safeJsonParse<T>(jsonString: string, fallback: T): T {
  try {
    return JSON.parse(jsonString) as T;
  } catch (e) {
    return fallback;
  }
}

/**
 * Delays execution for a specified number of milliseconds
 * @param ms Milliseconds to delay
 * @returns A promise that resolves after the delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Truncates a string to a maximum length and adds ellipsis if truncated
 * @param str The string to truncate
 * @param maxLength Maximum length before truncation
 * @returns The truncated string
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + "...";
}

/**
 * Formats a date as a readable string
 * @param date The date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Checks if a URL is valid
 * @param url The URL to validate
 * @returns True if the URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}
