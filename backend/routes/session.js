const express = require('express');
const { v4: uuidv4 } = require('uuid');
const redis = require('../services/redis');
const strategyAgent = require('../agents/strategy');
const applicationAgent = require('../agents/application');
const documentAgent = require('../agents/document');
const appointmentAgent = require('../agents/appointment');

const router = express.Router();

// POST /api/session — create session from intake form
router.post('/', async (req, res) => {
  try {
    const { nationality, city, destination, travelDates, employmentStatus } = req.body;
    if (!nationality || !city || !destination || !travelDates || !employmentStatus) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const sessionId = uuidv4();
    const profile = { nationality, city, destination, travelDates, employmentStatus };
    await redis.set(`session:${sessionId}:profile`, profile);

    res.json({ sessionId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/session/:id — get full session state
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const [profile, strategy, documents, checklist, appointment] = await Promise.all([
    redis.get(`session:${id}:profile`),
    redis.get(`session:${id}:strategy`),
    redis.get(`session:${id}:documents`),
    redis.get(`session:${id}:checklist`),
    redis.get(`session:${id}:appointment`),
  ]);

  if (!profile) return res.status(404).json({ error: 'Session not found' });
  res.json({ sessionId: id, profile, strategy, documents, checklist, appointment });
});

// GET /api/session/:id/strategy/stream — SSE stream for strategy agent
router.get('/:id/strategy/stream', async (req, res) => {
  const { id } = req.params;
  const profile = await redis.get(`session:${id}:profile`);
  if (!profile) return res.status(404).json({ error: 'Session not found' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  const send = (type, data) => res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);

  // Heartbeat so the browser knows the connection is live
  send('ping', {});

  try {
    const strategy = await strategyAgent.run(id, profile, (msg) => {
      send('log', { message: msg });
    });
    send('strategy', { strategy });
    res.write('data: {"type":"done"}\n\n');
  } catch (err) {
    send('error', { message: err.message });
  } finally {
    res.end();
  }
});

// POST /api/session/:id/strategy/confirm — confirm consulate, spawn app + doc agents
router.post('/:id/strategy/confirm', async (req, res) => {
  const { id } = req.params;
  const [profile, strategy] = await Promise.all([
    redis.get(`session:${id}:profile`),
    redis.get(`session:${id}:strategy`),
  ]);
  if (!profile || !strategy) return res.status(404).json({ error: 'Session or strategy not found' });

  // Start appointment monitoring
  const appointment = await appointmentAgent.startMonitoring(id, strategy.recommended);

  res.json({ status: 'confirmed', appointment });
});

// GET /api/session/:id/application/stream — SSE stream for application agent
router.get('/:id/application/stream', async (req, res) => {
  const { id } = req.params;
  const [profile, strategy] = await Promise.all([
    redis.get(`session:${id}:profile`),
    redis.get(`session:${id}:strategy`),
  ]);
  if (!profile || !strategy) return res.status(404).json({ error: 'Session not found' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  const send = (type, data) => res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
  send('ping', {});

  try {
    const [documents, checklist] = await Promise.all([
      applicationAgent.run(id, profile, strategy, (msg) => send('log', { message: msg })),
      documentAgent.run(id, profile, strategy, (msg) => send('doc_log', { message: msg })),
    ]);
    send('done', { documents, checklist });
  } catch (err) {
    send('error', { message: err.message });
  } finally {
    res.end();
  }
});

// GET /api/session/:id/appointment — get appointment monitoring state
router.get('/:id/appointment', async (req, res) => {
  const state = await redis.get(`session:${req.params.id}:appointment`);
  if (!state) return res.status(404).json({ error: 'No appointment monitoring active' });
  res.json(state);
});

// POST /api/session/:id/checklist/:itemId — update checklist item status
router.post('/:id/checklist/:itemId', async (req, res) => {
  const { id, itemId } = req.params;
  const { status } = req.body;
  const documentAgent = require('../agents/document');
  const result = await documentAgent.updateItem(id, itemId, status);
  if (!result) return res.status(404).json({ error: 'Checklist not found' });
  res.json(result);
});

module.exports = router;
