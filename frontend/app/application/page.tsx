'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Pipeline from '@/components/Pipeline';
import LiveLog from '@/components/LiveLog';
import { streamApplication, getSession } from '@/lib/api';

function ApplicationPage() {
  const router = useRouter();
  const params = useSearchParams();
  const sessionId = params.get('session') || '';

  const [logs, setLogs] = useState<string[]>([]);
  const [documents, setDocuments] = useState<any>(null);
  const [flaggedIdx, setFlaggedIdx] = useState(0);
  const [error, setError] = useState('');
  const started = useRef(false);

  useEffect(() => {
    if (!sessionId || started.current) return;
    started.current = true;

    const stop = streamApplication(
      sessionId,
      (msg) => setLogs(l => [...l, msg]),
      (data) => setDocuments(data.documents),
      (e) => setError(e),
    );
    return stop;
  }, [sessionId]);

  const completedFlagged = flaggedIdx;
  const totalFlagged = documents?.flaggedFields?.length || 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Pipeline current="application" />

      <div className="max-w-5xl mx-auto w-full px-6 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-1">Application Documents</h2>
          <p className="text-white/40 text-sm">Generating your cover letter, employer letter, and travel itinerary</p>
        </div>

        <div className="mb-6">
          <LiveLog logs={logs} title="application-agent.js" />
        </div>

        {error && (
          <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-6">{error}</div>
        )}

        {documents && (
          <div className="grid grid-cols-5 gap-6 animate-slide-in">
            {/* Generated documents — left 3 cols */}
            <div className="col-span-3 space-y-4">
              <h3 className="text-xs font-semibold text-white/40 tracking-wider">GENERATED DOCUMENTS</h3>

              <DocCard title="Cover Letter" content={documents.coverLetter} badge="Generated" />

              {documents.employerLetter && (
                <DocCard title="Employer Verification Letter (Template)" content={documents.employerLetter} badge="Template" badgeColor="yellow" />
              )}

              <DocCard title="Travel Itinerary" content={documents.itinerary} badge="Generated" />
            </div>

            {/* Flagged fields — right 2 cols */}
            <div className="col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-white/40 tracking-wider">REQUIRED FROM YOU</h3>
                <span className="text-xs text-white/30">{completedFlagged} / {totalFlagged}</span>
              </div>

              {documents.flaggedFields?.map((field: any, idx: number) => (
                <div key={field.id} className={`bg-white/[0.03] border rounded-xl p-4 transition-all ${
                  idx < flaggedIdx ? 'border-green-500/30 opacity-60' : 'border-yellow-500/20'
                }`}>
                  <div className="flex items-start gap-2 mb-2">
                    <button
                      onClick={() => setFlaggedIdx(i => Math.max(i, idx + 1))}
                      className={`w-4 h-4 rounded border flex-shrink-0 mt-0.5 transition-all ${
                        idx < flaggedIdx
                          ? 'bg-green-500 border-green-500'
                          : 'border-yellow-500/50 hover:border-yellow-400'
                      }`}
                    >
                      {idx < flaggedIdx && <span className="text-[10px] text-white flex items-center justify-center w-full h-full">✓</span>}
                    </button>
                    <div>
                      <div className="text-sm font-semibold text-yellow-300">{field.label}</div>
                      <div className="text-xs text-white/40 mt-1 leading-relaxed">{field.instructions}</div>
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={() => router.push(`/appointment?session=${sessionId}`)}
                className="w-full py-3 bg-blue-500 hover:bg-blue-400 rounded-xl font-bold text-sm transition-all mt-4"
              >
                Continue to Appointment →
              </button>
            </div>
          </div>
        )}

        {!documents && !error && (
          <div className="text-center text-white/30 py-12">
            <div className="text-4xl mb-3">📄</div>
            <div>Agents generating your documents...</div>
          </div>
        )}
      </div>
    </div>
  );
}

function DocCard({ title, content, badge, badgeColor = 'blue' }: any) {
  const [expanded, setExpanded] = useState(false);
  const preview = content?.slice(0, 300) + (content?.length > 300 ? '...' : '');

  const badgeClass = badgeColor === 'yellow'
    ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
    : 'bg-green-500/10 text-green-400 border-green-500/20';

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <span className="text-sm font-semibold">{title}</span>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${badgeClass}`}>{badge}</span>
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-xs text-white/30 hover:text-white/60"
          >
            {expanded ? 'collapse' : 'expand'}
          </button>
        </div>
      </div>
      <div className="p-4">
        <pre className="text-xs text-white/60 whitespace-pre-wrap font-sans leading-relaxed">
          {expanded ? content : preview}
        </pre>
        {!expanded && content?.length > 300 && (
          <button onClick={() => setExpanded(true)} className="text-xs text-blue-400 mt-2 hover:underline">Show full document</button>
        )}
      </div>
      <div className="px-4 pb-3">
        <button
          onClick={() => {
            const blob = new Blob([content], { type: 'text/plain' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${title.toLowerCase().replace(/\s+/g, '-')}.txt`;
            a.click();
          }}
          className="text-xs text-blue-400 hover:underline"
        >
          Download
        </button>
      </div>
    </div>
  );
}

export default function ApplicationPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white/30">Loading...</div>}>
      <ApplicationPage />
    </Suspense>
  );
}
