import { NextRequest } from 'next/server';

const redis = require('@/lib/server/redis');

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { phoneNumber } = await request.json();
  if (!phoneNumber) return Response.json({ error: 'phoneNumber required' }, { status: 400 });

  const profile = await redis.get(`session:${id}:profile`);
  if (!profile) return Response.json({ error: 'Session not found' }, { status: 404 });

  await redis.set(`session:${id}:notify`, { phoneNumber }, 86400);
  return Response.json({ status: 'saved', phoneNumber });
}
