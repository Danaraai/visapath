// Empty string = relative URLs → works on Vercel (same host) and localhost
const BASE = '';

export interface IntakeData {
  nationality: string;
  city: string;
  destination: string;
  travelDates: string;
  employmentStatus: string;
}

export async function createSession(data: IntakeData): Promise<{ sessionId: string }> {
  const res = await fetch(`${BASE}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create session');
  return res.json();
}

export async function getSession(id: string) {
  const res = await fetch(`${BASE}/api/session/${id}`);
  if (!res.ok) throw new Error('Session not found');
  return res.json();
}

export function streamStrategy(sessionId: string, onLog: (msg: string) => void, onStrategy: (s: any) => void, onError: (e: string) => void) {
  const es = new EventSource(`${BASE}/api/session/${sessionId}/strategy/stream`);
  es.onmessage = (e) => {
    const data = JSON.parse(e.data);
    if (data.type === 'log') onLog(data.message);
    else if (data.type === 'strategy') onStrategy(data.strategy);
    else if (data.type === 'done') es.close();
    else if (data.type === 'error') { onError(data.message); es.close(); }
  };
  es.onerror = () => { onError('Connection lost'); es.close(); };
  return () => es.close();
}

export async function confirmStrategy(sessionId: string) {
  const res = await fetch(`${BASE}/api/session/${sessionId}/strategy/confirm`, { method: 'POST' });
  return res.json();
}

export function streamApplication(sessionId: string, onLog: (msg: string) => void, onDone: (d: any) => void, onError: (e: string) => void) {
  const es = new EventSource(`${BASE}/api/session/${sessionId}/application/stream`);
  es.onmessage = (e) => {
    const data = JSON.parse(e.data);
    if (data.type === 'log' || data.type === 'doc_log') onLog(data.message);
    else if (data.type === 'done') { onDone(data); es.close(); }
    else if (data.type === 'error') { onError(data.message); es.close(); }
  };
  es.onerror = () => { onError('Connection lost'); es.close(); };
  return () => es.close();
}

export async function getAppointment(sessionId: string) {
  const res = await fetch(`${BASE}/api/session/${sessionId}/appointment`);
  return res.json();
}

export async function updateChecklistItem(sessionId: string, itemId: string, status: string) {
  const res = await fetch(`${BASE}/api/session/${sessionId}/checklist/${itemId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  return res.json();
}

export async function notifyMe(sessionId: string, phoneNumber: string) {
  const res = await fetch(`${BASE}/api/session/${sessionId}/notify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber }),
  });
  if (!res.ok) throw new Error('Failed to save phone number');
  return res.json();
}

export async function simulateSlot(sessionId: string) {
  const res = await fetch(`${BASE}/api/session/${sessionId}/simulate-slot`, { method: 'POST' });
  if (!res.ok) throw new Error('Simulate failed');
  return res.json();
}
