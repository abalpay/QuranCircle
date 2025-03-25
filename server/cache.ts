/**
 * Simple in-memory cache with TTL for frequently accessed data
 */

// Cache TTL constants (in milliseconds)
export const CACHE_TTL = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000
};

interface CacheItem<T> {
  data: T;
  expiresAt: number;
}

class Cache {
  private cache: Map<string, CacheItem<any>> = new Map();
  
  /**
   * Set a value in the cache with a specific TTL
   * @param key Cache key
   * @param value Value to store
   * @param ttlMs Time-to-live in milliseconds (default: 60 seconds)
   */
  set<T>(key: string, value: T, ttlMs: number = 60000): void {
    const expiresAt = Date.now() + ttlMs;
    this.cache.set(key, { data: value, expiresAt });
  }
  
  /**
   * Get a value from the cache
   * @param key Cache key
   * @returns The cached value or undefined if not found or expired
   */
  get<T>(key: string): T | undefined {
    const item = this.cache.get(key);
    
    // Return undefined if item not found or expired
    if (!item || item.expiresAt < Date.now()) {
      if (item) {
        // Clean up expired item
        this.cache.delete(key);
      }
      return undefined;
    }
    
    return item.data as T;
  }
  
  /**
   * Check if a key exists in the cache and is not expired
   * @param key Cache key
   * @returns True if the key exists and is not expired
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item || item.expiresAt < Date.now()) {
      if (item) {
        // Clean up expired item
        this.cache.delete(key);
      }
      return false;
    }
    return true;
  }
  
  /**
   * Delete a specific key from the cache
   * @param key Cache key
   */
  delete(key: string): void {
    this.cache.delete(key);
  }
  
  /**
   * Delete all keys that match a pattern (prefix)
   * @param keyPrefix The prefix to match
   */
  deleteByPrefix(keyPrefix: string): void {
    // Convert keys() iterator to array to avoid iterator issues
    Array.from(this.cache.keys()).forEach(key => {
      if (key.startsWith(keyPrefix)) {
        this.cache.delete(key);
      }
    });
  }
  
  /**
   * Clear all items from the cache
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Get a value from the cache, or compute and store it if not present
   * @param key Cache key
   * @param factory Function to compute the value if not in cache
   * @param ttlMs Time-to-live in milliseconds
   * @returns The cached or computed value
   */
  async getOrSet<T>(
    key: string, 
    factory: () => Promise<T>,
    ttlMs: number = 60000
  ): Promise<T> {
    const cachedValue = this.get<T>(key);
    if (cachedValue !== undefined) {
      return cachedValue;
    }
    
    const value = await factory();
    this.set(key, value, ttlMs);
    return value;
  }
}

// Export a singleton instance
export const cache = new Cache();