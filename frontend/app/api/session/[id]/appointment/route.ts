const redis = require('@/lib/server/redis');

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const state = await redis.get(`session:${id}:appointment`);
  if (!state) return Response.json({ error: 'No appointment monitoring active' }, { status: 404 });
  return Response.json(state);
}
