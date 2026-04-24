const Redis = require('ioredis');

let client;

function getRedis() {
  if (!client) {
    client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      lazyConnect: true,
      retryStrategy: () => null, // don't retry in dev if redis is down
    });
    client.on('error', () => {}); // suppress connection errors in dev
  }
  return client;
}

// In-memory fallback for dev without Redis
const memStore = new Map();

async function get(key) {
  try {
    const val = await getRedis().get(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return memStore.get(key) || null;
  }
}

async function set(key, value, ttlSeconds = 3600) {
  try {
    await getRedis().setex(key, ttlSeconds, JSON.stringify(value));
  } catch {
    memStore.set(key, value);
  }
}

async function publish(channel, message) {
  try {
    await getRedis().publish(channel, JSON.stringify(message));
  } catch {}
}

module.exports = { get, set, publish };
