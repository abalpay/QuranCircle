/**
 * Utility functions for the server
 */

/**
 * Generates a random short code for URLs
 * @param length - The length of the code to generate (default: 6)
 * @returns A random alphanumeric string
 */
export function generateShortCode(length: number = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * Creates a short URL from the base URL and short code
 * @param baseUrl - The base URL of the application (optional, defaults to relative URL)
 * @param shortCode - The short code to append
 * @returns The complete short URL
 */
export function createShortUrl(baseUrl: string | null = null, shortCode: string): string {
  // If we're not given a base URL, just use a relative path
  // This ensures the URL works in both development and production
  if (!baseUrl) {
    return `/s/${shortCode}`;
  }
  
  // Remove trailing slash from baseUrl if it exists
  const baseUrlFormatted = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${baseUrlFormatted}/s/${shortCode}`;
}