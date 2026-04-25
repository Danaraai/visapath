const axios = require('axios');

const MCP_URL = 'https://veda-ai.nexla.io/mcp-express/';

function mcpHeaders() {
  return {
    Authorization: `Basic ${process.env.NEXLA_API_KEY}`,
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
  };
}

let _reqId = 0;
function nextId() { return ++_reqId; }

async function mcpPost(method, params) {
  const res = await axios.post(
    MCP_URL,
    { jsonrpc: '2.0', method, params, id: nextId() },
    { headers: mcpHeaders(), timeout: 20000 }
  );
  return res.data?.result ?? res.data;
}

// Cache tools list for the lifetime of the process
let _tools = null;
async function getTools() {
  if (_tools) return _tools;
  try {
    // Initialize MCP session first
    await mcpPost('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'VisaPath', version: '1.0.0' },
    });
    const result = await mcpPost('tools/list', {});
    _tools = result?.tools ?? [];
    console.log('[Nexla MCP] Available tools:', _tools.map(t => t.name).join(', '));
  } catch (err) {
    console.error('[Nexla MCP] Could not list tools:', err.message);
    _tools = [];
  }
  return _tools;
}

async function callTool(name, args) {
  const result = await mcpPost('tools/call', { name, arguments: args });
  // MCP returns content as [{type:'text', text:'...'}]
  const content = result?.content ?? [];
  return content
    .filter(c => c.type === 'text')
    .map(c => c.text)
    .join('\n')
    .trim();
}

async function ingestRequirements(consulateCountry, employmentStatus) {
  if (!process.env.NEXLA_API_KEY) {
    return mockRequirements(consulateCountry, employmentStatus);
  }

  try {
    const tools = await getTools();

    // Find the most relevant tool — prefer search/query/flow tools
    const tool = tools.find(t =>
      /search|query|data|flow|fetch|get/i.test(t.name)
    ) ?? tools[0];

    if (!tool) {
      console.warn('[Nexla MCP] No usable tools found, using mock');
      return mockRequirements(consulateCountry, employmentStatus);
    }

    console.log(`[Nexla MCP] Calling tool "${tool.name}" for ${consulateCountry}/${employmentStatus}`);

    const text = await callTool(tool.name, {
      query: `Schengen visa document requirements for ${consulateCountry} consulate, applicant employment status: ${employmentStatus}`,
      country: consulateCountry,
      employment_status: employmentStatus,
    });

    if (text) {
      // Augment mock requirements with Nexla context for display
      const base = mockRequirements(consulateCountry, employmentStatus);
      base.nexlaSource = text.slice(0, 400); // store for UI display
      return base;
    }
  } catch (err) {
    console.error('[Nexla MCP] Tool call failed:', err.message);
  }

  return mockRequirements(consulateCountry, employmentStatus);
}

function mockRequirements(country, employmentStatus) {
  const base = [
    { id: 'passport', label: 'Valid passport (2+ blank pages, valid 3 months beyond return date)', agentGenerated: false, category: 'Identity' },
    { id: 'photo', label: 'Two passport-size photos (35×45 mm, white background)', agentGenerated: false, category: 'Identity' },
    { id: 'application_form', label: 'Completed Schengen visa application form', agentGenerated: true, category: 'Application' },
    { id: 'cover_letter', label: 'Cover letter explaining travel purpose and itinerary', agentGenerated: true, category: 'Application' },
    { id: 'flight', label: 'Round-trip flight reservation (refundable/dummy ticket accepted)', agentGenerated: false, category: 'Travel' },
    { id: 'hotel', label: 'Hotel/accommodation bookings for full stay duration', agentGenerated: false, category: 'Travel' },
    { id: 'travel_insurance', label: 'Travel insurance (min €30,000 coverage, valid Schengen-wide)', agentGenerated: false, category: 'Insurance' },
    { id: 'bank_statements', label: 'Bank statements (last 3 months, min avg €3,000 balance)', agentGenerated: false, category: 'Financial' },
    { id: 'itinerary', label: 'Day-by-day travel itinerary', agentGenerated: true, category: 'Travel' },
  ];

  if (employmentStatus === 'employed') {
    base.push(
      { id: 'employer_letter', label: 'Employer verification letter (leave approval + salary confirmation)', agentGenerated: true, category: 'Employment', awaitingThirdParty: true },
      { id: 'pay_stubs', label: 'Last 3 pay stubs', agentGenerated: false, category: 'Employment' }
    );
  } else if (employmentStatus === 'self_employed') {
    base.push(
      { id: 'business_registration', label: 'Business registration documents', agentGenerated: false, category: 'Employment' },
      { id: 'tax_returns', label: 'Last 2 years tax returns', agentGenerated: false, category: 'Employment' }
    );
  } else if (employmentStatus === 'student') {
    base.push(
      { id: 'enrollment_letter', label: 'University enrollment confirmation letter', agentGenerated: false, category: 'Employment' },
      { id: 'student_id', label: 'Valid student ID', agentGenerated: false, category: 'Identity' }
    );
  } else if (employmentStatus === 'retired') {
    base.push(
      { id: 'pension_statement', label: 'Pension statement (last 3 months)', agentGenerated: false, category: 'Financial' }
    );
  }

  return { country, employmentStatus, requirements: base };
}

module.exports = { ingestRequirements };
