const vapi = require('@/lib/server/vapi');

export async function GET() {
  return Response.json({
    publicKey: process.env.VAPI_PUBLIC_KEY || '',
    assistant: vapi.getWebAssistantConfig(),
  });
}
