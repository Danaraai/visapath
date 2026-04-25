import { NextRequest } from 'next/server';

const redis = require('@/lib/server/redis');

export async function POST(request: NextRequest) {
  try {
    const { nationality, city, destination, travelDates, employmentStatus } = await request.json();
    if (!nationality || !city || !destination || !travelDates || !employmentStatus) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const sessionId = crypto.randomUUID();
    await redis.set(`session:${sessionId}:profile`, { nationality, city, destination, travelDates, employmentStatus });
    return Response.json({ sessionId });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
