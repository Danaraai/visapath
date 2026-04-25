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

// Aliases to handle natural speech variants
const NATIONALITY_MAP: Record<string, string> = {
  'kazakh': 'Kazakhstani', 'kazakhstani': 'Kazakhstani', 'kazakhstan': 'Kazakhstani',
  'american': 'American', 'us citizen': 'American', 'united states': 'American',
  'indian': 'Indian', 'india': 'Indian',
  'chinese': 'Chinese', 'china': 'Chinese',
  'brazilian': 'Brazilian', 'brazil': 'Brazilian',
  'mexican': 'Mexican', 'mexico': 'Mexican',
  'russian': 'Russian', 'russia': 'Russian',
  'ukrainian': 'Ukrainian', 'ukraine': 'Ukrainian',
  'filipino': 'Filipino', 'philippines': 'Filipino',
  'vietnamese': 'Vietnamese', 'vietnam': 'Vietnamese',
  'nigerian': 'Nigerian', 'nigeria': 'Nigerian',
  'egyptian': 'Egyptian', 'egypt': 'Egyptian',
  'pakistani': 'Pakistani', 'pakistan': 'Pakistani',
  'bangladeshi': 'Bangladeshi', 'bangladesh': 'Bangladeshi',
  'ethiopian': 'Ethiopian', 'ethiopia': 'Ethiopian',
  'indonesian': 'Indonesian', 'indonesia': 'Indonesian',
  'turkish': 'Turkish', 'turkey': 'Turkish',
  'iranian': 'Iranian', 'iran': 'Iranian',
  'british': 'British', 'uk': 'British', 'united kingdom': 'British',
  'canadian': 'Canadian', 'canada': 'Canadian',
  'australian': 'Australian', 'australia': 'Australian',
  'german': 'German', 'germany': 'German',
  'french': 'French', 'france': 'French',
  'italian': 'Italian', 'italy': 'Italian',
  'spanish': 'Spanish', 'spain': 'Spanish',
  'japanese': 'Japanese', 'japan': 'Japanese',
  'south korean': 'South Korean', 'korean': 'South Korean', 'south korea': 'South Korean',
  'thai': 'Thai', 'thailand': 'Thai',
  'malaysian': 'Malaysian', 'malaysia': 'Malaysian',
  'colombian': 'Colombian', 'colombia': 'Colombian',
};

const CITY_MAP: Record<string, string> = {
  'san francisco': 'San Francisco', 'sf': 'San Francisco', 'san fran': 'San Francisco',
  'new york': 'New York', 'nyc': 'New York', 'new york city': 'New York',
  'los angeles': 'Los Angeles', 'la': 'Los Angeles',
  'chicago': 'Chicago',
  'houston': 'Houston',
  'seattle': 'Seattle',
  'boston': 'Boston',
  'washington dc': 'Washington DC', 'washington': 'Washington DC', 'dc': 'Washington DC',
  'miami': 'Miami',
  'austin': 'Austin',
};

const DESTINATION_MAP: Record<string, string> = {
  'italy': 'Italy', 'italian': 'Italy', 'rome': 'Italy', 'milan': 'Italy',
  'france': 'France', 'french': 'France', 'paris': 'France',
  'germany': 'Germany', 'german': 'Germany', 'berlin': 'Germany',
  'spain': 'Spain', 'spanish': 'Spain', 'madrid': 'Spain', 'barcelona': 'Spain',
  'netherlands': 'Netherlands', 'dutch': 'Netherlands', 'amsterdam': 'Netherlands', 'holland': 'Netherlands',
  'greece': 'Greece', 'greek': 'Greece', 'athens': 'Greece',
  'portugal': 'Portugal', 'lisbon': 'Portugal',
  'switzerland': 'Switzerland', 'swiss': 'Switzerland', 'zurich': 'Switzerland',
  'austria': 'Austria', 'vienna': 'Austria',
  'belgium': 'Belgium', 'brussels': 'Belgium',
  'czech republic': 'Czech Republic', 'czech': 'Czech Republic', 'prague': 'Czech Republic',
  'poland': 'Poland', 'warsaw': 'Poland',
  'croatia': 'Croatia', 'dubrovnik': 'Croatia',
  'sweden': 'Sweden', 'stockholm': 'Sweden',
  'norway': 'Norway', 'oslo': 'Norway',
  'denmark': 'Denmark', 'copenhagen': 'Denmark',
  'finland': 'Finland', 'helsinki': 'Finland',
};

function matchMap(text: string, map: Record<string, string>): string | undefined {
  // Sort by key length descending so longer phrases match first
  const keys = Object.keys(map).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (text.includes(key)) return map[key];
  }
  return undefined;
}

function extractFromTranscript(lines: string[]): ExtractedData {
  const text = lines.join(' ').toLowerCase();
  const data: ExtractedData = {};

  data.nationality = matchMap(text, NATIONALITY_MAP);
  data.city = matchMap(text, CITY_MAP);
  data.destination = matchMap(text, DESTINATION_MAP);

  if (text.includes('self-employed') || text.includes('self employed') || text.includes('freelan')) {
    data.employmentStatus = 'self_employed';
  } else if (text.includes('student')) {
    data.employmentStatus = 'student';
  } else if (text.includes('retired')) {
    data.employmentStatus = 'retired';
  } else if (text.includes('employed') || text.includes('work') || text.includes('job') || text.includes('company')) {
    data.employmentStatus = 'employed';
  }

  // Match dates: "June 15 to June 22" / "June 15-22" / "15th to 22nd of June" / "June 15 through June 28, 2026"
  const months = 'january|february|march|april|may|june|july|august|september|october|november|december';
  const patterns = [
    new RegExp(`(${months})\\s+\\d{1,2}(?:st|nd|rd|th)?(?:\\s+(?:to|through|until|-)\\s+(?:${months})?\\s*\\d{1,2}(?:st|nd|rd|th)?)?(?:[,\\s]+\\d{4})?`, 'i'),
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      // Append year if missing
      let dateStr = m[0].trim().replace(/\b\w/g, c => c.toUpperCase());
      if (!/\d{4}/.test(dateStr)) dateStr += ', 2026';
      data.travelDates = dateStr;
      break;
    }
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

  const finishWithData = useCallback((data: ExtractedData) => {
    setStatus('processing');
    setTimeout(() => {
      onFilled(data);
      setStatus('done');
    }, 400);
  }, [onFilled]);

  const startCall = useCallback(async () => {
    setStatus('connecting');
    linesRef.current = [];
    setLines([]);
    setErrMsg('');

    try {
      const configRes = await fetch('/api/vapi/config');
      const { publicKey, assistant } = await configRes.json();

      if (!publicKey) {
        setErrMsg('Vapi not configured — add VAPI_PUBLIC_KEY to Vercel env vars');
        setStatus('error');
        return;
      }

      const { default: Vapi } = await import('@vapi-ai/web');
      const instance = new Vapi(publicKey);
      vapiRef.current = instance;

      instance.on('call-start', () => setStatus('active'));

      instance.on('message', (msg: any) => {
        // Collect transcript for fallback extraction
        if (msg.type === 'transcript' && msg.transcriptType === 'final') {
          appendLine(`${msg.role === 'assistant' ? 'AI' : 'You'}: ${msg.transcript}`);
        }

        // Primary: tool call with structured data — reliable, no regex needed
        if (msg.type === 'tool-calls') {
          const call = msg.toolCallList?.[0] ?? msg.toolCalls?.[0];
          if (call?.function?.name === 'submit_form_data') {
            try {
              const args = typeof call.function.arguments === 'string'
                ? JSON.parse(call.function.arguments)
                : call.function.arguments;
              instance.stop();
              finishWithData(args);
            } catch {}
          }
        }
      });

      // Fallback: extract from transcript when call ends naturally
      instance.on('call-end', () => {
        if (status === 'done' || status === 'processing') return;
        const extracted = extractFromTranscript(linesRef.current);
        finishWithData(extracted);
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
  }, [onFilled, finishWithData, status]);

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
        {status === 'processing' && <><SpinnerIcon /><span>Filling your form…</span></>}
        {status === 'error' && <><MicIcon /><span>Retry voice input</span></>}
      </button>

      {errMsg && <p className="text-xs text-red-400/70 text-center">{errMsg}</p>}

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
