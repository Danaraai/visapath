const tinyfish = require('../tinyfish');
const redis = require('../redis');

const CONSULATE_BOOKING_URLS = {
  France: 'https://france-visas.gouv.fr/en/web/france-visas/',
  Germany: 'https://www.vfsvisaonline.com/Germany-Global-Online-Appointment_Zone2/',
  Italy: 'https://vistoperitalia.esteri.it/',
  Spain: 'https://www.vfsglobal.com/Spain/USA/',
  Netherlands: 'https://www.vfsglobal.com/netherlands/usa/',
};

async function startMonitoring(sessionId, consulate) {
  const url = CONSULATE_BOOKING_URLS[consulate] || CONSULATE_BOOKING_URLS['France'];
  const state = {
    consulate,
    url,
    status: 'monitoring',
    startedAt: new Date().toISOString(),
    lastChecked: new Date().toISOString(),
    nextCheck: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    checksCount: 1,
    slotsFound: false,
  };
  await redis.set(`session:${sessionId}:appointment`, state, 86400);
  return state;
}

async function checkSlots(sessionId) {
  const state = await redis.get(`session:${sessionId}:appointment`);
  if (!state) return null;

  const result = await tinyfish.browserCheck(state.url);
  const updated = {
    ...state,
    lastChecked: new Date().toISOString(),
    nextCheck: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    checksCount: (state.checksCount || 0) + 1,
    slotsFound: result.slotsFound || false,
  };

  if (result.slotsFound) {
    updated.status = 'slot_found';
    updated.slotDetails = result.slotDetails;
  }

  await redis.set(`session:${sessionId}:appointment`, updated, 86400);
  return updated;
}

module.exports = { startMonitoring, checkSlots };
