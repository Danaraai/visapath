'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Pipeline from '@/components/Pipeline';
import { getAppointment, getSession } from '@/lib/api';

function AppointmentPage() {
  const router = useRouter();
  const params = useSearchParams();
  const sessionId = params.get('session') || '';

  const [state, setState] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!sessionId) return;
    getSession(sessionId).then(setSession);
    getAppointment(sessionId).then(setState);
  }, [sessionId]);

  // Simulate polling every 30s
  useEffect(() => {
    if (!sessionId) return;
    const interval = setInterval(() => {
      getAppointment(sessionId).then(setState);
      setTick(t => t + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const formatTime = (iso: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Pipeline current="appointment" />

      <div className="max-w-3xl mx-auto w-full px-6 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-1">Appointment Monitor</h2>
          <p className="text-white/40 text-sm">
            TinyFish Browser API is watching the consulate booking system in real time
          </p>
        </div>

        {/* Monitor status card */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 mb-6">
          {state ? (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-3 h-3 rounded-full ${state.slotsFound ? 'bg-green-400' : 'bg-blue-400 animate-pulse'}`} />
                <div className="font-semibold">
                  {state.slotsFound
                    ? 'Slot found!'
                    : `Monitoring ${state.consulate} consulate for available slots`}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white/[0.04] rounded-xl p-4">
                  <div className="text-xs text-white/40 mb-1">Last checked</div>
                  <div className="font-semibold text-sm">{formatTime(state.lastChecked)}</div>
                </div>
                <div className="bg-white/[0.04] rounded-xl p-4">
                  <div className="text-xs text-white/40 mb-1">Next check</div>
                  <div className="font-semibold text-sm">{formatTime(state.nextCheck)}</div>
                </div>
                <div className="bg-white/[0.04] rounded-xl p-4">
                  <div className="text-xs text-white/40 mb-1">Checks run</div>
                  <div className="font-semibold text-sm">{state.checksCount || 1}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs text-white/30 font-semibold tracking-wider mb-2">MONITOR LOG</div>
                {[...Array(Math.min(tick + 1, 5))].map((_, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-white/40 font-mono">
                    <span className="text-green-400/60">›</span>
                    <span>
                      {i === 0
                        ? `Started monitoring ${state.consulate} consulate booking system`
                        : `Checked ${state.consulate} consulate — no available slots yet (check #${i + 1})`}
                    </span>
                  </div>
                ))}
              </div>

              {state.slotsFound && (
                <div className="mt-6 bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                  <div className="font-bold text-green-400 mb-2">Appointment slot available!</div>
                  <div className="text-sm text-white/70">{state.slotDetails || 'Click the booking link below to secure your slot immediately.'}</div>
                  <button className="mt-3 bg-green-500 hover:bg-green-400 text-white font-bold text-sm px-4 py-2 rounded-lg transition-all">
                    Book This Slot →
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-white/30 text-center py-8">Loading monitor state...</div>
          )}
        </div>

        {/* Travel timeline */}
        {session?.strategy && (
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 mb-6">
            <div className="text-xs font-semibold text-white/40 tracking-wider mb-4">YOUR TIMELINE</div>
            <div className="space-y-3">
              <TimelineItem
                label="Visa submission deadline"
                sublabel="Must be 15 days before travel"
                status="pending"
              />
              <TimelineItem
                label="Appointment booked"
                sublabel={`${session.strategy.recommended} consulate — monitoring`}
                status="monitoring"
              />
              <TimelineItem
                label="Travel dates"
                sublabel={session.profile?.travelDates || '—'}
                status="upcoming"
              />
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => router.push(`/documents?session=${sessionId}`)}
            className="flex-1 py-4 bg-blue-500 hover:bg-blue-400 rounded-xl font-bold text-sm transition-all"
          >
            Continue to Documents →
          </button>
        </div>
      </div>
    </div>
  );
}

function TimelineItem({ label, sublabel, status }: { label: string; sublabel: string; status: string }) {
  const dot = status === 'done' ? 'bg-green-400' : status === 'monitoring' ? 'bg-blue-400 animate-pulse' : 'bg-white/20';
  return (
    <div className="flex items-start gap-3">
      <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${dot}`} />
      <div>
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-xs text-white/40">{sublabel}</div>
      </div>
    </div>
  );
}

export default function AppointmentPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white/30">Loading...</div>}>
      <AppointmentPage />
    </Suspense>
  );
}
