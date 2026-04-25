require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/session', require('./routes/session'));

app.get('/api/vapi/config', (req, res) => {
  const vapi = require('./services/vapi');
  res.json({
    publicKey: process.env.VAPI_PUBLIC_KEY || '',
    assistant: vapi.getWebAssistantConfig(),
  });
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`VisaPath backend running on http://localhost:${PORT}`));
