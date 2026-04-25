// In-memory fallback for demo — use REDIS_URL (Upstash or any Redis) in Vercel env vars for persistence
const memStore = new Map();

let client;
function getRedis() {
  if (!client && process.env.REDIS_URL && !process.env.REDIS_URL.includes('localhost')) {
    try {
      const Redis = require('ioredis');
      client = new Redis(process.env.REDIS_URL, {
        lazyConnect: true,
        retryStrategy: () => null,
        tls: process.env.REDIS_URL.startsWith('rediss://') ? {} : undefined,
      });
      client.on('error', () => {});
    } catch { client = null; }
  }
  return client;
}

async function get(key) {
  try {
    const r = getRedis();
    if (r) {
      const val = await r.get(key);
      return val ? JSON.parse(val) : null;
    }
  } catch {}
  return memStore.get(key) ?? null;
}

async function set(key, value, ttlSeconds = 3600) {
  try {
    const r = getRedis();
    if (r) {
      await r.setex(key, ttlSeconds, JSON.stringify(value));
      return;
    }
  } catch {}
  memStore.set(key, value);
}

async function publish(channel, message) {
  try {
    const r = getRedis();
    if (r) await r.publish(channel, JSON.stringify(message));
  } catch {}
}

module.exports = { get, set, publish };
