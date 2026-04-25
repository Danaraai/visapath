export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const redis = require('@/lib/server/redis');
const applicationAgent = require('@/lib/server/agents/application');
const documentAgent = require('@/lib/server/agents/document');

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [profile, strategy] = await Promise.all([
    redis.get(`session:${id}:profile`),
    redis.get(`session:${id}:strategy`),
  ]);
  if (!profile || !strategy) return Response.json({ error: 'Session not found' }, { status: 404 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (type: string, data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type, ...data })}\n\n`));
      };
      send('ping', {});
      try {
        const [documents, checklist] = await Promise.all([
          applicationAgent.run(id, profile, strategy, (msg: string) => send('log', { message: msg })),
          documentAgent.run(id, profile, strategy, (msg: string) => send('doc_log', { message: msg })),
        ]);
        send('done', { documents, checklist });
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
