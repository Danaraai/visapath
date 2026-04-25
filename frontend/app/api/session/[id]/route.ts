const redis = require('@/lib/server/redis');

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [profile, strategy, documents, checklist, appointment] = await Promise.all([
    redis.get(`session:${id}:profile`),
    redis.get(`session:${id}:strategy`),
    redis.get(`session:${id}:documents`),
    redis.get(`session:${id}:checklist`),
    redis.get(`session:${id}:appointment`),
  ]);
  if (!profile) return Response.json({ error: 'Session not found' }, { status: 404 });
  return Response.json({ sessionId: id, profile, strategy, documents, checklist, appointment });
}
