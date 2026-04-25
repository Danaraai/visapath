const redis = require('@/lib/server/redis');
const appointmentAgent = require('@/lib/server/agents/appointment');

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [profile, strategy] = await Promise.all([
    redis.get(`session:${id}:profile`),
    redis.get(`session:${id}:strategy`),
  ]);
  if (!profile || !strategy) return Response.json({ error: 'Session or strategy not found' }, { status: 404 });

  const appointment = await appointmentAgent.startMonitoring(id, strategy.recommended);
  return Response.json({ status: 'confirmed', appointment });
}
