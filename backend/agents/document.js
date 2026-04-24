const nexla = require('../services/nexla');
const redis = require('../services/redis');

async function run(sessionId, profile, strategy, onLog) {
  const log = (msg) => onLog && onLog(msg);

  log(`Loading ${strategy.recommended} consulate requirements via Nexla...`);
  const { requirements } = await nexla.ingestRequirements(strategy.recommended, profile.employmentStatus);

  log(`Normalized ${requirements.length} requirements for ${profile.employmentStatus} applicant`);

  const checklist = requirements.map(item => ({
    ...item,
    status: item.agentGenerated ? 'complete' : 'pending',
    completedAt: item.agentGenerated ? new Date().toISOString() : null,
  }));

  log('Checklist generated. Agent-generated items marked complete.');

  await redis.set(`session:${sessionId}:checklist`, { items: checklist, updatedAt: new Date().toISOString() });
  return { items: checklist };
}

async function updateItem(sessionId, itemId, status) {
  const data = await redis.get(`session:${sessionId}:checklist`);
  if (!data) return null;
  const items = data.items.map(i => i.id === itemId ? { ...i, status, completedAt: status === 'complete' ? new Date().toISOString() : null } : i);
  await redis.set(`session:${sessionId}:checklist`, { items, updatedAt: new Date().toISOString() });
  return { items };
}

module.exports = { run, updateItem };
