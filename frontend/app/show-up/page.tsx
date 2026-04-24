'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Pipeline from '@/components/Pipeline';
import { getSession } from '@/lib/api';

function ShowUpPage() {
  const params = useSearchParams();
  const sessionId = params.get('session') || '';
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    if (sessionId) getSession(sessionId).then(setSession);
  }, [sessionId]);

  const strategy = session?.strategy;
  const documents = session?.documents;
  const checklist = session?.checklist;
  const profile = session?.profile;

  const completed = checklist?.items?.filter((i: any) => i.status === 'complete').length || 0;
  const total = checklist?.items?.length || 0;
  const allGreen = completed === total && total > 0;

  const downloadAll = () => {
    if (!documents) return;
    const parts = [
      '=== COVER LETTER ===\n\n' + (documents.coverLetter || ''),
      documents.employerLetter ? '\n\n=== EMPLOYER LETTER TEMPLATE ===\n\n' + documents.employerLetter : '',
      '\n\n=== TRAVEL ITINERARY ===\n\n' + (documents.itinerary || ''),
    ].join('');
    const blob = new Blob([parts], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'visapath-documents.txt';
    a.click();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Pipeline current="show-up" />

      <div className="max-w-3xl mx-auto w-full px-6 py-12">
        <div className="mb-8">
          {allGreen ? (
            <>
              <div className="text-4xl mb-3">✅</div>
              <h2 className="text-2xl font-bold mb-1">You're ready to apply!</h2>
              <p className="text-white/40 text-sm">All documents prepared. Show up to your appointment and you're good to go.</p>
            </>
          ) : (
            <>
              <div className="text-4xl mb-3">📋</div>
              <h2 className="text-2xl font-bold mb-1">Final Checklist</h2>
              <p className="text-white/40 text-sm">
                {completed}/{total} items complete — finish the remaining items before your appointment
              </p>
            </>
          )}
        </div>

        {/* Appointment card */}
        {strategy && (
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 mb-6">
            <div className="text-xs font-semibold text-white/40 tracking-wider mb-4">APPOINTMENT DETAILS</div>
            <div className="space-y-3">
              <Detail label="Consulate" value={`${strategy.recommended} Consulate General`} />
              <Detail label="Travel destination" value={profile?.destination || '—'} />
              <Detail label="Travel dates" value={profile?.travelDates || '—'} />
              <Detail label="Application type" value="Schengen Short-Stay Visa (Type C)" />
              <div className="pt-2 border-t border-white/5">
                <div className="text-xs text-white/30 mb-2">WHAT TO BRING</div>
                <ul className="text-sm text-white/60 space-y-1">
                  <li>• Original passport + all recent expired passports</li>
                  <li>• Printed copies of all generated documents</li>
                  <li>• Printed bank statements (last 3 months)</li>
                  <li>• Travel insurance certificate</li>
                  <li>• Hotel and flight confirmations (printed)</li>
                  <li>• Employer verification letter (original, signed)</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Checklist summary */}
        {checklist?.items && (
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 mb-6">
            <div className="text-xs font-semibold text-white/40 tracking-wider mb-4">DOCUMENT STATUS</div>
            <div className="space-y-2">
              {checklist.items.map((item: any) => (
                <div key={item.id} className="flex items-center gap-3 text-sm">
                  <span className={item.status === 'complete' ? 'text-green-400' : 'text-white/25'}>
                    {item.status === 'complete' ? '✓' : '○'}
                  </span>
                  <span className={item.status === 'complete' ? 'text-white/70' : 'text-white/30'}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reminders */}
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 mb-6">
          <div className="text-xs font-semibold text-white/40 tracking-wider mb-4">REMINDERS (AGENT-SCHEDULED)</div>
          <div className="space-y-3">
            {[
              { label: '14 days before travel', sub: 'Start gathering physical documents' },
              { label: '7 days before travel', sub: 'Document check — confirm all items complete' },
              { label: '3 days before travel', sub: 'Final review and packing' },
              { label: '1 day before travel', sub: 'Pack everything, confirm appointment time' },
            ].map(r => (
              <div key={r.label} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400/50 mt-1.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium">{r.label}</div>
                  <div className="text-xs text-white/30">{r.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Download button */}
        <button
          onClick={downloadAll}
          className="w-full py-4 bg-blue-500 hover:bg-blue-400 rounded-xl font-bold text-sm transition-all"
        >
          Download All Documents as ZIP
        </button>

        <div className="text-center text-xs text-white/20 mt-4">
          VisaPath • Autonomous Visa Preparation • Ship to Prod Hackathon 2026
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-white/40">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export default function ShowUpPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white/30">Loading...</div>}>
      <ShowUpPage />
    </Suspense>
  );
}
