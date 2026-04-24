'use client';

const STAGES = [
  { id: 'intake', label: 'INTAKE' },
  { id: 'strategy', label: 'STRATEGY' },
  { id: 'application', label: 'APPLICATION' },
  { id: 'appointment', label: 'APPOINTMENT' },
  { id: 'documents', label: 'DOCUMENTS' },
  { id: 'show-up', label: 'SHOW UP' },
];

const ORDER = ['intake', 'strategy', 'application', 'appointment', 'documents', 'show-up'];

interface PipelineProps {
  current: string;
}

export default function Pipeline({ current }: PipelineProps) {
  const currentIdx = ORDER.indexOf(current);

  return (
    <div className="w-full border-b border-white/10 bg-[#0d0d14]">
      <div className="max-w-5xl mx-auto px-6 py-4">
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.map((stage, idx) => {
            const done = idx < currentIdx;
            const active = idx === currentIdx;
            const locked = idx > currentIdx;
            return (
              <div key={stage.id} className="flex items-center gap-1 flex-shrink-0">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold tracking-wider transition-all ${
                  active ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' :
                  done ? 'text-green-400' :
                  'text-white/25'
                }`}>
                  {done && <span>✓</span>}
                  {active && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse inline-block" />}
                  {stage.label}
                </div>
                {idx < STAGES.length - 1 && (
                  <span className={`text-xs ${done ? 'text-white/30' : 'text-white/10'}`}>›</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
