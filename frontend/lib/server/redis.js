// Pure in-memory store — no native modules, safe for Vercel serverless
// Vercel reuses warm instances within a demo session so state persists
const memStore = new Map();

async function get(key) {
  return memStore.get(key) ?? null;
}

async function set(key, value) {
  memStore.set(key, value);
}

async function publish() {}

module.exports = { get, set, publish };
