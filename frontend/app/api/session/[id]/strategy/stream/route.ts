export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const redis = require('@/lib/server/redis');
const strategyAgent = require('@/lib/server/agents/strategy');

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await redis.get(`session:${id}:profile`);
  if (!profile) return Response.json({ error: 'Session not found' }, { status: 404 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (type: string, data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type, ...data })}\n\n`));
      };
      send('ping', {});
      try {
        const strategy = await strategyAgent.run(id, profile, (msg: string) => send('log', { message: msg }));
        send('strategy', { strategy });
        send('done', {});
      } catch (err: any) {
        send('error', { message: err.message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
