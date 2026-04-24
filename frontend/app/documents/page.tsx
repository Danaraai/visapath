'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Pipeline from '@/components/Pipeline';
import { getSession, updateChecklistItem } from '@/lib/api';

type ChecklistItem = {
  id: string;
  label: string;
  category: string;
  status: 'complete' | 'pending' | 'awaiting';
  agentGenerated?: boolean;
  awaitingThirdParty?: boolean;
};

function DocumentsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const sessionId = params.get('session') || '';

  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    getSession(sessionId).then(s => {
      setSession(s);
      if (s.checklist?.items) setItems(s.checklist.items);
      setLoading(false);
    });
  }, [sessionId]);

  const toggle = async (item: ChecklistItem) => {
    if (item.agentGenerated) return;
    const newStatus = item.status === 'complete' ? 'pending' : 'complete';
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: newStatus } : i));
    await updateChecklistItem(sessionId, item.id, newStatus);
  };

  const categories = [...new Set(items.map(i => i.category))];
  const completed = items.filter(i => i.status === 'complete').length;
  const total = items.length;
  const pct = total ? Math.round((completed / total) * 100) : 0;

  const agentItems = items.filter(i => i.agentGenerated);
  const userItems = items.filter(i => !i.agentGenerated && !i.awaitingThirdParty);
  const thirdPartyItems = items.filter(i => i.awaitingThirdParty);

  return (
    <div className="min-h-screen flex flex-col">
      <Pipeline current="documents" />

      <div className="max-w-3xl mx-auto w-full px-6 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-1">Document Checklist</h2>
          <p className="text-white/40 text-sm">
            Powered by Nexla — requirements normalized from {session?.strategy?.recommended || 'your'} consulate
          </p>
        </div>

        {/* Progress bar */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold">{completed} of {total} complete</span>
            <span className="text-sm text-blue-400 font-bold">{pct}%</span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center text-white/30 py-12">Loading checklist...</div>
        ) : (
          <div className="space-y-6">
            <CheckSection title="Agent-generated" icon="🤖" items={agentItems} onToggle={toggle} />
            <CheckSection title="Required from you" icon="👤" items={userItems} onToggle={toggle} />
            {thirdPartyItems.length > 0 && (
              <CheckSection title="Awaiting third party" icon="📧" items={thirdPartyItems} onToggle={toggle} />
            )}
          </div>
        )}

        <div className="mt-8">
          <button
            onClick={() => router.push(`/show-up?session=${sessionId}`)}
            className="w-full py-4 bg-blue-500 hover:bg-blue-400 rounded-xl font-bold text-sm transition-all"
          >
            Continue to Show Up →
          </button>
        </div>
      </div>
    </div>
  );
}

function CheckSection({ title, icon, items, onToggle }: {
  title: string;
  icon: string;
  items: ChecklistItem[];
  onToggle: (item: ChecklistItem) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="text-xs font-semibold text-white/40 tracking-wider mb-3">{icon} {title.toUpperCase()}</div>
      <div className="space-y-2">
        {items.map(item => (
          <div
            key={item.id}
            onClick={() => onToggle(item)}
            className={`flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
              item.status === 'complete'
                ? 'bg-green-500/5 border-green-500/20'
                : item.awaitingThirdParty
                ? 'bg-yellow-500/5 border-yellow-500/20 cursor-default'
                : 'bg-white/[0.03] border-white/8 hover:border-white/15'
            }`}
          >
            <div className={`w-5 h-5 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center ${
              item.status === 'complete'
                ? 'bg-green-500 border-green-500'
                : item.awaitingThirdParty
                ? 'border-yellow-500/50'
                : 'border-white/20'
            }`}>
              {item.status === 'complete' && <span className="text-[11px] text-white">✓</span>}
              {item.awaitingThirdParty && item.status !== 'complete' && <span className="text-[10px] text-yellow-400">⏳</span>}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-medium ${item.status === 'complete' ? 'text-white/50 line-through' : 'text-white'}`}>
                {item.label}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-white/25">{item.category}</span>
                {item.agentGenerated && (
                  <span className="text-xs bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded">auto-complete</span>
                )}
                {item.awaitingThirdParty && item.status !== 'complete' && (
                  <span className="text-xs bg-yellow-500/10 text-yellow-400 px-1.5 py-0.5 rounded">email sent — awaiting reply</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DocumentsPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white/30">Loading...</div>}>
      <DocumentsPage />
    </Suspense>
  );
}
