const axios = require('axios');

const BASE = 'https://agent.tinyfish.ai/v1';

function headers() {
  return { 'X-API-Key': process.env.TINYFISH_API_KEY, 'Content-Type': 'application/json' };
}

function hasKey() {
  return !!process.env.TINYFISH_API_KEY;
}

// Web search — returns ranked results with snippets and URLs
async function search(query) {
  if (hasKey()) {
    try {
      const res = await axios.get(`${BASE}/search`, {
        params: { query },
        headers: { 'X-API-Key': process.env.TINYFISH_API_KEY },
        timeout: 15000,
      });
      return {
        results: (res.data.results || []).map(r => ({
          source: r.site_name || new URL(r.url).hostname,
          title: r.title,
          text: r.snippet,
          url: r.url,
          position: r.position,
        })),
        query,
        via: 'TinyFish Search API',
      };
    } catch (e) {
      console.error('TinyFish search error:', e.response?.data || e.message);
    }
  }
  return redditFallback(query);
}

// Fetch + extract text from one or more URLs
async function fetchUrls(urls) {
  const urlList = Array.isArray(urls) ? urls : [urls];
  if (hasKey()) {
    try {
      const res = await axios.post(`${BASE}/fetch`, { urls: urlList }, { headers: headers(), timeout: 20000 });
      return res.data.results || [];
    } catch (e) {
      console.error('TinyFish fetch error:', e.response?.data || e.message);
    }
  }
  return urlList.map(url => ({ url, text: '', note: 'TinyFish key required for URL fetching' }));
}

// Browser session — returns a CDP WebSocket URL for Playwright to connect to
async function createBrowserSession(url) {
  if (hasKey()) {
    try {
      const res = await axios.post(`${BASE}/browser`, { url }, { headers: headers(), timeout: 15000 });
      return { sessionId: res.data.session_id, cdpUrl: res.data.cdp_url, via: 'TinyFish Browser API' };
    } catch (e) {
      console.error('TinyFish browser error:', e.response?.data || e.message);
    }
  }
  return { sessionId: null, cdpUrl: null, note: 'TinyFish key required for browser sessions' };
}

// Convenience: agentSearch still used by strategy agent — uses real TinyFish search
async function agentSearch(query) {
  return search(query);
}

// Convenience: fetchUrl (single URL) used by strategy agent
async function fetchUrl(url) {
  const results = await fetchUrls([url]);
  const r = results[0] || {};
  return { url, text: r.text || r.markdown || '', title: r.title, appointmentAvailable: null, note: 'Public page only — appointment calendar requires login' };
}

// Convenience: browserCheck used by appointment agent
async function browserCheck(url) {
  const session = await createBrowserSession(url);
  return {
    url,
    slotsFound: false,
    session,
    lastChecked: new Date().toISOString(),
    nextCheck: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    note: session.cdpUrl ? 'Browser session active (CDP)' : 'Monitoring via public page',
  };
}

// Reddit public JSON API fallback (no auth needed)
async function redditFallback(query) {
  const results = [];
  try {
    const url = `https://www.reddit.com/r/schengen/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&sort=new&t=year&limit=5`;
    const res = await axios.get(url, { headers: { 'User-Agent': 'VisaPath/1.0 (hackathon)' }, timeout: 8000 });
    for (const post of res.data?.data?.children || []) {
      const d = post.data;
      results.push({
        source: `r/${d.subreddit}`,
        title: d.title,
        text: d.title + (d.selftext ? ' — ' + d.selftext.slice(0, 200) : ''),
        url: `https://reddit.com${d.permalink}`,
        date: timeAgo(d.created_utc),
      });
    }
  } catch {}
  return { results, query, via: 'Reddit public API (fallback)' };
}

function timeAgo(unixTs) {
  const s = Math.floor(Date.now() / 1000) - unixTs;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 2592000) return `${Math.floor(s / 86400)} days ago`;
  return `${Math.floor(s / 2592000)} months ago`;
}

module.exports = { search, fetchUrls, fetchUrl, createBrowserSession, browserCheck, agentSearch };
