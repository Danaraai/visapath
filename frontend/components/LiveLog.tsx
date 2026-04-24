'use client';
import { useEffect, useRef } from 'react';

interface LiveLogProps {
  logs: string[];
  title?: string;
}

export default function LiveLog({ logs, title = 'Agent Activity' }: LiveLogProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [logs]);

  return (
    <div className="bg-[#0d0d18] border border-white/10 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10 bg-white/[0.02]">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
        </div>
        <span className="text-xs text-white/40 font-mono ml-2">{title}</span>
        {logs.length > 0 && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-blue-400">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse inline-block" />
            running
          </span>
        )}
      </div>
      <div ref={ref} className="h-48 overflow-y-auto p-4 font-mono text-xs space-y-1.5">
        {logs.length === 0 && (
          <span className="text-white/20">Waiting to start...</span>
        )}
        {logs.map((log, i) => (
          <div key={i} className="text-green-400/80 animate-slide-in flex gap-2">
            <span className="text-white/20 select-none">›</span>
            <span>{log}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
