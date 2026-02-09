const Redis = require('ioredis');
const { Redis: UpstashRedis } = require('@upstash/redis');
const env = require('../config/env');

/**
 * Redis Caching Service
 * Supports Upstash REST API (serverless) and traditional Redis (ioredis)
 * Falls back to in-memory LRU cache if Redis is not available
 */
class RedisService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.useInMemoryFallback = false;
    this.redisType = null; // 'upstash', 'ioredis', or 'memory'
    
    // In-memory fallback using LRU Cache
    this.memoryCache = new Map();
    this.memoryCacheMaxSize = 1000;
    this.memoryCacheOrder = [];

    // Cache TTL defaults (in seconds)
    this.defaultTTL = 3600; // 1 hour
    this.ttlConfig = {
      ucBoundaries: 86400,      // 24 hours
      townBoundaries: 86400,    // 24 hours
      categories: 86400,        // 24 hours
      hierarchyTree: 3600,      // 1 hour
      stats: 300,               // 5 minutes
      userSession: 900,         // 15 minutes
      complaintList: 60,        // 1 minute
      heatmapData: 300,         // 5 minutes
    };

    // Cache key prefixes
    this.prefixes = {
      ucBoundary: 'uc:boundary:',
      townBoundary: 'town:boundary:',
      categories: 'categories:all',
      hierarchyTree: 'hierarchy:tree',
      ucStats: 'stats:uc:',
      townStats: 'stats:town:',
      cityStats: 'stats:city:',
      complaints: 'complaints:list:',
      heatmap: 'heatmap:',
      user: 'user:',
    };
  }

  /**
   * Initialize Redis connection
   * Priority: Upstash REST API > Traditional Redis (ioredis) > In-memory fallback
   */
  async initialize() {
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    const redisUrl = env.redisUrl || process.env.REDIS_URL;

    // Try Upstash REST API first (best for serverless/edge)
    if (upstashUrl && upstashToken) {
      try {
        console.log('🔄 Connecting to Upstash Redis (REST API)...');
        this.client = new UpstashRedis({
          url: upstashUrl,
          token: upstashToken,
        });

        // Test connection
        await this.client.ping();
        
        this.isConnected = true;
        this.useInMemoryFallback = false;
        this.redisType = 'upstash';
        console.log('✅ Upstash Redis connected (REST API)');
        return this;
      } catch (error) {
        console.error('❌ Upstash Redis connection failed:', error.message);
        console.log('🔄 Falling back to traditional Redis...');
      }
    }

    // Fall back to traditional Redis (ioredis)
    if (redisUrl) {
      try {
        console.log('🔄 Connecting to traditional Redis (ioredis)...');
        this.client = new Redis(redisUrl, {
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          lazyConnect: true,
          connectTimeout: 10000,
          // Upstash requires TLS
          tls: redisUrl.includes('upstash.io') ? {} : undefined,
        });

        this.client.on('connect', () => {
          console.log('✅ Redis connected (ioredis)');
          this.isConnected = true;
          this.useInMemoryFallback = false;
          this.redisType = 'ioredis';
        });

        this.client.on('error', (err) => {
          console.error('Redis error:', err.message);
          if (!this.isConnected) {
            this.useInMemoryFallback = true;
            this.redisType = 'memory';
          }
        });

        this.client.on('close', () => {
          console.warn('Redis connection closed');
          this.isConnected = false;
          this.useInMemoryFallback = true;
          this.redisType = 'memory';
        });

        this.client.on('reconnecting', () => {
          console.log('Redis reconnecting...');
        });

        await this.client.connect();
        console.log('✅ Redis Service initialized (ioredis)');
      } catch (error) {
        console.error('❌ Redis connection failed:', error.message);
        console.warn('⚠️ Falling back to in-memory cache');
        this.useInMemoryFallback = true;
        this.redisType = 'memory';
      }
    } else {
      console.warn('⚠️ No Redis configuration found. Using in-memory cache fallback.');
      this.useInMemoryFallback = true;
      this.redisType = 'memory';
    }

    return this;
  }

  /**
   * Disconnect from Redis
   */
  async disconnect() {
    if (this.client) {
      if (this.redisType === 'ioredis') {
        await this.client.quit();
      }
      // Upstash REST API doesn't need explicit disconnect
      console.log('Redis disconnected');
    }
  }

  // ========== CORE CACHE OPERATIONS ==========

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {any} Cached value or null
   */
  async get(key) {
    try {
      if (this.useInMemoryFallback) {
        return this.memoryGet(key);
      }

      if (this.redisType === 'upstash') {
        // Upstash automatically handles JSON
        return await this.client.get(key);
      }

      // ioredis requires manual JSON parsing
      const data = await this.client.get(key);
      if (data) {
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      console.error(`Cache get error for ${key}:`, error.message);
      return null;
    }
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   */
  async set(key, value, ttl = this.defaultTTL) {
    try {
      if (this.useInMemoryFallback) {
        const serialized = JSON.stringify(value);
        return this.memorySet(key, serialized, ttl);
      }

      if (this.redisType === 'upstash') {
        // Upstash automatically handles JSON
        if (ttl) {
          await this.client.set(key, value, { ex: ttl });
        } else {
          await this.client.set(key, value);
        }
        return true;
      }

      // ioredis requires manual JSON stringification
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.client.setex(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }
      return true;
    } catch (error) {
      console.error(`Cache set error for ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   */
  async del(key) {
    try {
      if (this.useInMemoryFallback) {
        this.memoryCache.delete(key);
        return true;
      }

      await this.client.del(key);
      return true;
    } catch (error) {
      console.error(`Cache delete error for ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern
   * @param {string} pattern - Key pattern (e.g., "uc:boundary:*")
   * Note: Upstash REST API has limited KEYS support, use sparingly
   */
  async delByPattern(pattern) {
    try {
      if (this.useInMemoryFallback) {
        for (const key of this.memoryCache.keys()) {
          if (this.matchPattern(key, pattern)) {
            this.memoryCache.delete(key);
          }
        }
        return true;
      }

      if (this.redisType === 'upstash') {
        // Upstash REST API: KEYS command has limitations
        // For production, consider maintaining key lists in sets
        console.warn('Pattern deletion with Upstash has limitations. Consider using key sets.');
        const keys = await this.client.keys(pattern);
        if (keys && keys.length > 0) {
          await this.client.del(...keys);
        }
        return true;
      }

      // ioredis
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
      return true;
    } catch (error) {
      console.error(`Cache delete pattern error:`, error.message);
      return false;
    }
  }

  /**
   * Check if key exists
   * @param {string} key - Cache key
   */
  async exists(key) {
    try {
      if (this.useInMemoryFallback) {
        return this.memoryCache.has(key);
      }
      return await this.client.exists(key) === 1;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get TTL of a key
   * @param {string} key - Cache key
   */
  async ttl(key) {
    try {
      if (this.useInMemoryFallback) {
        const item = this.memoryCache.get(key);
        if (item && item.expires) {
          return Math.max(0, Math.floor((item.expires - Date.now()) / 1000));
        }
        return -1;
      }
      return await this.client.ttl(key);
    } catch (error) {
      return -1;
    }
  }

  // ========== SPECIALIZED CACHE METHODS ==========

  /**
   * Cache UC boundary
   */
  async cacheUCBoundary(ucId, boundary) {
    const key = this.prefixes.ucBoundary + ucId;
    return await this.set(key, boundary, this.ttlConfig.ucBoundaries);
  }

  /**
   * Get cached UC boundary
   */
  async getUCBoundary(ucId) {
    const key = this.prefixes.ucBoundary + ucId;
    return await this.get(key);
  }

  /**
   * Cache all UC boundaries
   */
  async cacheAllUCBoundaries(boundaries) {
    const key = this.prefixes.ucBoundary + 'all';
    return await this.set(key, boundaries, this.ttlConfig.ucBoundaries);
  }

  /**
   * Get all cached UC boundaries
   */
  async getAllUCBoundaries() {
    const key = this.prefixes.ucBoundary + 'all';
    return await this.get(key);
  }

  /**
   * Cache categories
   */
  async cacheCategories(categories) {
    return await this.set(this.prefixes.categories, categories, this.ttlConfig.categories);
  }

  /**
   * Get cached categories
   */
  async getCategories() {
    return await this.get(this.prefixes.categories);
  }

  /**
   * Cache hierarchy tree
   */
  async cacheHierarchyTree(tree) {
    return await this.set(this.prefixes.hierarchyTree, tree, this.ttlConfig.hierarchyTree);
  }

  /**
   * Get cached hierarchy tree
   */
  async getHierarchyTree() {
    return await this.get(this.prefixes.hierarchyTree);
  }

  /**
   * Cache statistics
   */
  async cacheStats(entityType, entityId, stats) {
    const key = `stats:${entityType}:${entityId}`;
    return await this.set(key, stats, this.ttlConfig.stats);
  }

  /**
   * Get cached statistics
   */
  async getStats(entityType, entityId) {
    const key = `stats:${entityType}:${entityId}`;
    return await this.get(key);
  }

  /**
   * Cache heatmap data
   */
  async cacheHeatmapData(queryHash, data) {
    const key = this.prefixes.heatmap + queryHash;
    return await this.set(key, data, this.ttlConfig.heatmapData);
  }

  /**
   * Get cached heatmap data
   */
  async getHeatmapData(queryHash) {
    const key = this.prefixes.heatmap + queryHash;
    return await this.get(key);
  }

  /**
   * Cache complaint list
   */
  async cacheComplaintList(queryHash, complaints, ttl = this.ttlConfig.complaintList) {
    const key = this.prefixes.complaints + queryHash;
    return await this.set(key, complaints, ttl);
  }

  /**
   * Get cached complaint list
   */
  async getComplaintList(queryHash) {
    const key = this.prefixes.complaints + queryHash;
    return await this.get(key);
  }

  // ========== CACHE INVALIDATION ==========

  /**
   * Invalidate UC-related caches
   */
  async invalidateUCCache(ucId) {
    await this.del(this.prefixes.ucBoundary + ucId);
    await this.del(this.prefixes.ucBoundary + 'all');
    await this.delByPattern(`${this.prefixes.ucStats}${ucId}*`);
    await this.del(this.prefixes.hierarchyTree);
    await this.delByPattern(`${this.prefixes.heatmap}*`);
  }

  /**
   * Invalidate complaint-related caches
   */
  async invalidateComplaintCache() {
    await this.delByPattern(`${this.prefixes.complaints}*`);
    await this.delByPattern(`${this.prefixes.heatmap}*`);
    await this.delByPattern('stats:*');
  }

  /**
   * Invalidate all stats caches
   */
  async invalidateStatsCache() {
    await this.delByPattern('stats:*');
  }

  /**
   * Clear all caches
   */
  async flushAll() {
    try {
      if (this.useInMemoryFallback) {
        this.memoryCache.clear();
        this.memoryCacheOrder = [];
        return true;
      }
      
      if (this.redisType === 'upstash') {
        await this.client.flushdb();
        return true;
      }
      
      await this.client.flushdb();
      return true;
    } catch (error) {
      console.error('Cache flush error:', error.message);
      return false;
    }
  }

  // ========== IN-MEMORY FALLBACK ==========

  /**
   * In-memory get with LRU eviction
   */
  memoryGet(key) {
    const item = this.memoryCache.get(key);
    if (!item) return null;

    // Check expiration
    if (item.expires && item.expires < Date.now()) {
      this.memoryCache.delete(key);
      return null;
    }

    // Move to end for LRU
    const idx = this.memoryCacheOrder.indexOf(key);
    if (idx > -1) {
      this.memoryCacheOrder.splice(idx, 1);
      this.memoryCacheOrder.push(key);
    }

    return JSON.parse(item.value);
  }

  /**
   * In-memory set with LRU eviction
   */
  memorySet(key, value, ttl) {
    // Evict oldest if at capacity
    while (this.memoryCache.size >= this.memoryCacheMaxSize) {
      const oldest = this.memoryCacheOrder.shift();
      if (oldest) {
        this.memoryCache.delete(oldest);
      }
    }

    const item = {
      value,
      expires: ttl ? Date.now() + (ttl * 1000) : null,
    };

    this.memoryCache.set(key, item);
    
    // Update LRU order
    const idx = this.memoryCacheOrder.indexOf(key);
    if (idx > -1) {
      this.memoryCacheOrder.splice(idx, 1);
    }
    this.memoryCacheOrder.push(key);

    return true;
  }

  /**
   * Simple pattern matching for in-memory cache
   */
  matchPattern(key, pattern) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(key);
  }

  // ========== UTILITIES ==========

  /**
   * Generate cache key hash from query parameters
   */
  generateQueryHash(params) {
    const sorted = Object.keys(params).sort().map(k => `${k}:${params[k]}`).join('|');
    return Buffer.from(sorted).toString('base64').replace(/[/+=]/g, '').substring(0, 32);
  }

  /**
   * Get cache health status
   */
  async getHealthStatus() {
    return {
      isConnected: this.isConnected,
      redisType: this.redisType,
      useInMemoryFallback: this.useInMemoryFallback,
      memoryCacheSize: this.memoryCache.size,
      memoryCacheMaxSize: this.memoryCacheMaxSize,
    };
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    if (this.useInMemoryFallback) {
      return {
        type: 'in-memory',
        keys: this.memoryCache.size,
        maxKeys: this.memoryCacheMaxSize,
      };
    }

    try {
      if (this.redisType === 'upstash') {
        const dbsize = await this.client.dbsize();
        return {
          type: 'upstash',
          keys: dbsize,
          info: 'Upstash REST API',
        };
      }

      // ioredis
      const info = await this.client.info('memory');
      const keyCount = await this.client.dbsize();
      
      return {
        type: 'ioredis',
        keys: keyCount,
        info: info,
      };
    } catch (error) {
      return { type: this.redisType, error: error.message };
    }
  }
}

// Export singleton instance
module.exports = new RedisService();
