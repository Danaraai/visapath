const redis = require('@/lib/server/redis');
const vapi = require('@/lib/server/vapi');

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [profile, strategy, notify, appointment] = await Promise.all([
    redis.get(`session:${id}:profile`),
    redis.get(`session:${id}:strategy`),
    redis.get(`session:${id}:notify`),
    redis.get(`session:${id}:appointment`),
  ]);

  if (!appointment) return Response.json({ error: 'No appointment monitoring active' }, { status: 404 });

  const updated = {
    ...appointment,
    status: 'slot_found',
    slotsFound: true,
    slotDetails: 'Available slot: This Tuesday at 2:30 PM — book immediately before it fills!',
  };
  await redis.set(`session:${id}:appointment`, updated, 86400);

  let callResult = 'skipped';
  if (notify?.phoneNumber) {
    try {
      await vapi.makeOutboundCall(notify.phoneNumber, {
        consulate: strategy?.recommended || appointment.consulate,
        destination: profile?.destination || 'your destination',
      });
      callResult = 'initiated';
    } catch (err: any) {
      console.error('[Vapi] Outbound call failed:', err.message);
      callResult = 'failed';
    }
  }

  return Response.json({ status: 'simulated', slot: updated, call: callResult });
}
