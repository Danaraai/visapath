const axios = require('axios');

// Nexla ingest: normalize consulate document requirements
async function ingestRequirements(consulateCountry, employmentStatus) {
  if (!process.env.NEXLA_API_KEY) return mockRequirements(consulateCountry, employmentStatus);
  try {
    const res = await axios.post(
      'https://dataops.nexla.io/api/v1/ingest',
      { source: `schengen_requirements_${consulateCountry.toLowerCase()}`, context: { employmentStatus } },
      { headers: { Authorization: `Bearer ${process.env.NEXLA_API_KEY}` }, timeout: 15000 }
    );
    return res.data;
  } catch {
    return mockRequirements(consulateCountry, employmentStatus);
  }
}

function mockRequirements(country, employmentStatus) {
  const base = [
    { id: 'passport', label: 'Valid passport (2+ blank pages, valid 3 months beyond return date)', agentGenerated: false, category: 'Identity' },
    { id: 'photo', label: 'Two passport-size photos (35x45mm, white background)', agentGenerated: false, category: 'Identity' },
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
  }

  return { country, employmentStatus, requirements: base };
}

module.exports = { ingestRequirements };
