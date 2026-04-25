const axios = require('axios');

const BASE_URL = 'https://api.vapi.ai';

function headers() {
  return {
    Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

async function makeOutboundCall(phoneNumber, { consulate, destination }) {
  if (!process.env.VAPI_API_KEY || !process.env.VAPI_PHONE_NUMBER_ID) {
    console.log('[Vapi] Skipping call — VAPI_API_KEY or VAPI_PHONE_NUMBER_ID not set');
    return null;
  }

  const res = await axios.post(
    `${BASE_URL}/call/phone`,
    {
      phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
      customer: { number: phoneNumber },
      assistant: {
        firstMessage: `Hi! This is VisaPath. We found an available appointment slot at the ${consulate} Consulate General for your ${destination} visa. This slot may fill up fast — please log in to VisaPath to book it now. Would you like me to repeat the details?`,
        model: {
          provider: 'anthropic',
          model: 'claude-haiku-4-5-20251001',
          systemPrompt: `You are VisaPath's appointment alert agent calling to notify about an available visa slot at ${consulate} for ${destination}. Be brief and warm. After confirming they heard the news, encourage them to book immediately and say goodbye.`,
        },
        voice: { provider: 'openai', voiceId: 'nova' },
        endCallMessage: 'Good luck with your visa application! Goodbye!',
        maxDurationSeconds: 120,
      },
    },
    { headers: headers() }
  );

  return res.data;
}

function getWebAssistantConfig() {
  return {
    name: 'VisaPath Intake',
    firstMessage:
      "Hi! I'm VisaPath's AI assistant. I'll gather your visa details in under a minute. First — what nationality passport do you hold?",
    model: {
      provider: 'anthropic',
      model: 'claude-haiku-4-5-20251001',
      systemPrompt: `You are VisaPath's intake specialist. Gather exactly 5 items through natural conversation:

1. Passport nationality — one of: American, Indian, Chinese, Brazilian, Mexican, Russian, Ukrainian, Filipino, Vietnamese, Nigerian, Egyptian, Pakistani, Bangladeshi, Ethiopian, Indonesian, Turkish, Iranian, British, Canadian, Australian, German, French, Italian, Spanish, Japanese, South Korean, Thai, Malaysian, Colombian, Kazakhstani
2. Current US city — one of: San Francisco, New York, Los Angeles, Chicago, Houston, Seattle, Boston, Washington DC, Miami, Austin
3. Schengen destination — one of: Italy, France, Germany, Spain, Netherlands, Greece, Portugal, Switzerland, Austria, Belgium, Czech Republic, Poland, Croatia, Sweden, Norway, Denmark, Finland
4. Travel dates — ask for start and end date, e.g. "June 15 to June 22, 2026"
5. Employment status — one of: employed, self_employed, student, retired

Ask one question at a time. Keep responses to 1 sentence. Once you have all 5, call the submit_form_data function immediately with the exact values.`,
      tools: [
        {
          type: 'function',
          function: {
            name: 'submit_form_data',
            description: 'Submit the collected visa application data to fill the form',
            parameters: {
              type: 'object',
              properties: {
                nationality: { type: 'string', description: 'Passport nationality, e.g. Kazakhstani' },
                city: { type: 'string', description: 'Current US city, e.g. San Francisco' },
                destination: { type: 'string', description: 'Schengen destination country, e.g. Italy' },
                travelDates: { type: 'string', description: 'Travel dates as a string, e.g. June 15 to June 22, 2026' },
                employmentStatus: { type: 'string', enum: ['employed', 'self_employed', 'student', 'retired'] },
              },
              required: ['nationality', 'city', 'destination', 'travelDates', 'employmentStatus'],
            },
          },
        },
      ],
    },
    voice: { provider: 'openai', voiceId: 'nova' },
    endCallMessage: "Your form is ready — let's find your visa path!",
    maxDurationSeconds: 180,
  };
}

module.exports = { makeOutboundCall, getWebAssistantConfig };
