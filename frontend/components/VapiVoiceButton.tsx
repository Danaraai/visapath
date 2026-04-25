'use client';
import { useState, useRef, useCallback } from 'react';

export interface ExtractedData {
  nationality?: string;
  city?: string;
  destination?: string;
  travelDates?: string;
  employmentStatus?: string;
}

interface Props {
  onFilled: (data: ExtractedData) => void;
}

type Status = 'idle' | 'connecting' | 'active' | 'processing' | 'done' | 'error';

const NATIONALITIES = ['american', 'indian', 'chinese', 'brazilian', 'mexican', 'russian', 'ukrainian', 'filipino', 'vietnamese', 'nigerian', 'egyptian', 'pakistani', 'bangladeshi', 'ethiopian', 'indonesian', 'turkish', 'iranian', 'british', 'canadian', 'australian', 'german', 'french', 'italian', 'spanish', 'japanese', 'south korean', 'thai', 'malaysian', 'colombian', 'kazakhstani'];
const CITIES = ['san francisco', 'new york', 'los angeles', 'chicago', 'houston', 'seattle', 'boston', 'washington dc', 'miami', 'austin'];
const DESTINATIONS = ['italy', 'france', 'germany', 'spain', 'netherlands', 'greece', 'portugal', 'switzerland', 'austria', 'belgium', 'czech republic', 'poland', 'croatia', 'sweden', 'norway', 'denmark', 'finland'];

function capitalize(s: string) {
  return s.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
}

function extractFromTranscript(lines: string[]): ExtractedData {
  const text = lines.join(' ').toLowerCase();
  const data: ExtractedData = {};

  for (const n of NATIONALITIES) {
    if (text.includes(n)) { data.nationality = capitalize(n); break; }
  }
  for (const c of CITIES) {
    if (text.includes(c)) { data.city = capitalize(c); break; }
  }
  for (const d of DESTINATIONS) {
    if (text.includes(d)) { data.destination = capitalize(d); break; }
  }

  if (text.includes('self-employed') || text.includes('self employed') || text.includes('freelan')) {
    data.employmentStatus = 'self_employed';
  } else if (text.includes('student')) {
    data.employmentStatus = 'student';
  } else if (text.includes('retired')) {
    data.employmentStatus = 'retired';
  } else if (text.includes('employed') || text.includes('work') || text.includes('job') || text.includes('company')) {
    data.employmentStatus = 'employed';
  }

  const monthNames = 'january|february|march|april|may|june|july|august|september|october|november|december';
  const dateRe = new RegExp(
    `(${monthNames})\\s+\\d{1,2}(?:[\\s\\S]*?(?:to|through|–|-)\\s*(?:${monthNames})?\\s*\\d{1,2})?[,\\s]+\\d{4}`,
    'i'
  );
  const dateMatch = text.match(dateRe);
  if (dateMatch) {
    data.travelDates = dateMatch[0].replace(/\b\w/g, c => c.toUpperCase()).trim();
  }

  return data;
}

export default function VapiVoiceButton({ onFilled }: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [lines, setLines] = useState<string[]>([]);
  const [errMsg, setErrMsg] = useState('');
  const vapiRef = useRef<any>(null);
  const linesRef = useRef<string[]>([]);

  const appendLine = (line: string) => {
    linesRef.current = [...linesRef.current, line];
    setLines([...linesRef.current]);
  };

  const startCall = useCallback(async () => {
    setStatus('connecting');
    linesRef.current = [];
    setLines([]);
    setErrMsg('');

    try {
      const configRes = await fetch('/api/vapi/config');
      const { publicKey, assistant } = await configRes.json();

      if (!publicKey) {
        setErrMsg('Vapi not configured — add VAPI_PUBLIC_KEY to .env and restart backend');
        setStatus('error');
        return;
      }

      // Dynamic import avoids SSR crash
      const { default: Vapi } = await import('@vapi-ai/web');
      const instance = new Vapi(publicKey);
      vapiRef.current = instance;

      instance.on('call-start', () => setStatus('active'));

      instance.on('message', (msg: any) => {
        if (msg.type === 'transcript' && msg.transcriptType === 'final') {
          appendLine(`${msg.role === 'assistant' ? 'AI' : 'You'}: ${msg.transcript}`);
        }
      });

      instance.on('call-end', () => {
        setStatus('processing');
        setTimeout(() => {
          const extracted = extractFromTranscript(linesRef.current);
          onFilled(extracted);
          setStatus('done');
        }, 600);
      });

      instance.on('error', (err: any) => {
        setErrMsg(err?.message || 'Call failed — check your Vapi key');
        setStatus('error');
      });

      await instance.start(assistant);
    } catch (err: any) {
      setErrMsg(err?.message || 'Failed to load voice SDK');
      setStatus('error');
    }
  }, [onFilled]);

  const stopCall = useCallback(() => {
    vapiRef.current?.stop();
  }, []);

  if (status === 'done') {
    return (
      <div className="flex items-center gap-2 text-green-400 text-sm bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
        <CheckIcon />
        <span>Form filled from voice — review and submit below</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={status === 'active' ? stopCall : startCall}
        disabled={status === 'connecting' || status === 'processing'}
        className={`w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
          status === 'active'
            ? 'bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25'
            : status === 'connecting' || status === 'processing'
            ? 'bg-white/5 border border-white/10 text-white/25 cursor-not-allowed'
            : 'bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 hover:border-blue-500/40'
        }`}
      >
        {status === 'idle' && <><MicIcon /><span>Talk to VisaPath instead</span></>}
        {status === 'connecting' && <><SpinnerIcon /><span>Connecting voice agent…</span></>}
        {status === 'active' && <><PulseIcon /><span>Speaking — tap to end call</span></>}
        {status === 'processing' && <><SpinnerIcon /><span>Processing your answers…</span></>}
        {status === 'error' && <><MicIcon /><span>Retry voice input</span></>}
      </button>

      {errMsg && (
        <p className="text-xs text-red-400/70 text-center">{errMsg}</p>
      )}

      {status === 'active' && lines.length > 0 && (
        <div className="bg-white/[0.02] border border-white/10 rounded-xl p-3 max-h-20 overflow-y-auto space-y-0.5">
          {lines.slice(-4).map((l, i) => (
            <div key={i} className="text-xs text-white/35 font-mono leading-relaxed truncate">{l}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function MicIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="w-4 h-4 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function PulseIcon() {
  return (
    <span className="relative flex h-3 w-3 flex-shrink-0">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
    </span>
  );
}
