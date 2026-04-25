import { NextRequest } from 'next/server';

const documentAgent = require('@/lib/server/agents/document');

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const { id, itemId } = await params;
  const { status } = await request.json();
  const result = await documentAgent.updateItem(id, itemId, status);
  if (!result) return Response.json({ error: 'Checklist not found' }, { status: 404 });
  return Response.json(result);
}
