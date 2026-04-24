const axios = require('axios');

const BASE = 'https://api.senso.ai';

function headers() {
  return { Authorization: `Bearer ${process.env.SENSO_API_KEY}`, 'Content-Type': 'application/json' };
}

// RAG search over historical visa outcomes
async function search(query) {
  if (!process.env.SENSO_API_KEY) return mockSearch(query);
  try {
    const res = await axios.post(`${BASE}/search`, { query, limit: 5 }, { headers: headers(), timeout: 15000 });
    return res.data;
  } catch {
    return mockSearch(query);
  }
}

// Publish outcome to cited.md knowledge base
async function publish(entry) {
  if (!process.env.SENSO_API_KEY) return { success: true, mock: true };
  try {
    const res = await axios.post(`${BASE}/knowledge/publish`, {
      type: 'cited.md',
      content: entry,
    }, { headers: headers(), timeout: 15000 });
    return res.data;
  } catch {
    return { success: false };
  }
}

function mockSearch(query) {
  return {
    results: [
      {
        title: 'Kazakh passport, SF → Italy via French consulate',
        content: 'Applied June 2025. French consulate SF. Wait 3 days for appointment. Approved in 9 days. Travel to Rome and Milan.',
        relevance: 0.95,
      },
      {
        title: 'US-based Kazakh passport holder Schengen tips',
        content: 'French consulate SF is most responsive for Kazakh nationals. High approval rate historically.',
        relevance: 0.88,
      },
    ],
    query,
  };
}

module.exports = { search, publish };
