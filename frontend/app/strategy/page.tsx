'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Pipeline from '@/components/Pipeline';
import LiveLog from '@/components/LiveLog';
import { streamStrategy, confirmStrategy } from '@/lib/api';

function StrategyPage() {
  const router = useRouter();
  const params = useSearchParams();
  const sessionId = params.get('session') || '';

  const [logs, setLogs] = useState<string[]>([]);
  const [strategy, setStrategy] = useState<any>(null);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (!sessionId || started.current) return;
    started.current = true;

    const stop = streamStrategy(
      sessionId,
      (msg) => setLogs(l => [...l, msg]),
      (s) => setStrategy(s),
      (e) => setError(e),
    );
    return stop;
  }, [sessionId]);

  const handleConfirm = async (overrideConsulate?: string) => {
    setConfirming(true);
    await confirmStrategy(sessionId);
    router.push(`/application?session=${sessionId}`);
  };

  const statusColor = (status: string) => {
    if (status === 'recommended') return 'text-green-400 bg-green-500/10 border-green-500/20';
    if (status === 'available') return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    return 'text-red-400 bg-red-500/10 border-red-500/20';
  };

  const waitLabel = (days: number) => {
    if (days <= 3) return `${days} days — this week`;
    if (days <= 14) return `${days} days`;
    return `${days} days — long wait`;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Pipeline current="strategy" />

      <div className="max-w-4xl mx-auto w-full px-6 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-1">Strategy Analysis</h2>
          <p className="text-white/40 text-sm">
            Researching real-time appointment availability across all Schengen consulates in your city
          </p>
        </div>

        {/* Live log */}
        <div className="mb-8">
          <LiveLog logs={logs} title="strategy-agent.js" />
        </div>

        {error && (
          <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-6">
            {error}
          </div>
        )}

        {strategy && (
          <div className="space-y-6 animate-slide-in">
            {/* Recommendation card */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-xs text-blue-400 font-semibold tracking-wider mb-1">RECOMMENDED CONSULATE</div>
                  <div className="text-2xl font-bold">{strategy.recommended} Consulate</div>
                  <div className="text-green-400 text-sm font-semibold mt-1">
                    Appointments available in {strategy.waitDays} days
                  </div>
                </div>
                <div className="bg-green-500/20 border border-green-500/30 rounded-xl px-4 py-2 text-center">
                  <div className="text-2xl font-bold text-green-400">{strategy.waitDays}d</div>
                  <div className="text-xs text-white/40">wait</div>
                </div>
              </div>

              <p className="text-white/70 text-sm leading-relaxed mb-3">{strategy.reasoning}</p>

              {strategy.availabilityNote && (
                <div className="flex items-start gap-2 bg-yellow-500/5 border border-yellow-500/15 rounded-lg px-3 py-2 mb-3">
                  <span className="text-yellow-400 text-xs mt-0.5">ℹ</span>
                  <p className="text-yellow-300/70 text-xs leading-relaxed">{strategy.availabilityNote}</p>
                </div>
              )}

              {strategy.legalNote && (
                <p className="text-white/40 text-xs italic">{strategy.legalNote}</p>
              )}
            </div>

            {/* Consulate comparison */}
            {strategy.consulates && strategy.consulates.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-white/50 tracking-wider mb-3">ALL CONSULATES IN YOUR CITY</h3>
                <div className="space-y-2">
                  {strategy.consulates.map((c: any) => (
                    <div key={c.country} className={`p-4 rounded-xl border ${statusColor(c.status)}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-sm">{c.country} Consulate</span>
                          {c.status === 'recommended' && (
                            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-semibold">RECOMMENDED</span>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold">{waitLabel(c.waitDays)}</div>
                          <div className="text-xs opacity-60">{c.note}</div>
                        </div>
                      </div>
                      {(c.bookingUrl || c.bookingNote) && (
                        <div className="flex items-center gap-3 mt-1">
                          {c.bookingUrl && (
                            <a
                              href={c.bookingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2"
                            >
                              Book appointment →
                            </a>
                          )}
                          {c.bookingNote && (
                            <span className="text-xs text-white/25">{c.bookingNote}</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reddit Sources */}
            {strategy.redditSources && strategy.redditSources.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-white/50 tracking-wider mb-3">
                  REDDIT SOURCES
                  <span className="ml-2 text-white/25 font-normal normal-case">live data from Reddit API</span>
                </h3>
                <div className="space-y-2">
                  {strategy.redditSources.map((s: any, i: number) => (
                    <div key={i} className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-orange-400 font-semibold">{s.source}</span>
                        <span className="text-xs text-white/25">{s.date}</span>
                      </div>
                      <p className="text-sm text-white/60 leading-relaxed">{s.text?.slice(0, 250)}</p>
                      {s.url && (
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-block underline underline-offset-2"
                        >
                          View post →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => handleConfirm()}
                disabled={confirming}
                className="flex-1 py-4 bg-blue-500 hover:bg-blue-400 disabled:bg-blue-500/40 rounded-xl font-bold text-sm transition-all"
              >
                {confirming ? 'Setting up...' : `Use ${strategy.recommended} Consulate →`}
              </button>
            </div>
          </div>
        )}

        {!strategy && !error && logs.length === 0 && (
          <div className="text-center text-white/30 py-12">
            <div className="text-4xl mb-3">🔍</div>
            <div>Initializing strategy agents...</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StrategyPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white/30">Loading...</div>}>
      <StrategyPage />
    </Suspense>
  );
}
