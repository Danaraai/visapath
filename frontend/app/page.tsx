'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Pipeline from '@/components/Pipeline';
import { createSession } from '@/lib/api';

const NATIONALITIES = [
  'Kazakhstani', 'American', 'Indian', 'Chinese', 'Brazilian', 'Mexican',
  'Russian', 'Ukrainian', 'Filipino', 'Vietnamese', 'Nigerian', 'Egyptian',
  'Pakistani', 'Bangladeshi', 'Ethiopian', 'Indonesian', 'Turkish', 'Iranian',
  'British', 'Canadian', 'Australian', 'German', 'French', 'Italian',
  'Spanish', 'Japanese', 'South Korean', 'Thai', 'Malaysian', 'Colombian',
];

const CITIES = [
  'San Francisco', 'New York', 'Los Angeles', 'Chicago', 'Houston',
  'Seattle', 'Boston', 'Washington DC', 'Miami', 'Austin',
];

const DESTINATIONS = [
  'Italy', 'France', 'Germany', 'Spain', 'Netherlands', 'Greece',
  'Portugal', 'Switzerland', 'Austria', 'Belgium', 'Czech Republic',
  'Poland', 'Croatia', 'Sweden', 'Norway', 'Denmark', 'Finland',
];

const EMPLOYMENT_OPTIONS = [
  { value: 'employed', label: 'Employed' },
  { value: 'self_employed', label: 'Self-employed' },
  { value: 'student', label: 'Student' },
  { value: 'retired', label: 'Retired' },
];

export default function IntakePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    nationality: '',
    city: '',
    destination: '',
    travelDates: '',
    employmentStatus: 'employed',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nationality || !form.city || !form.destination || !form.travelDates) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { sessionId } = await createSession(form);
      router.push(`/strategy?session=${sessionId}`);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Pipeline current="intake" />

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-xs text-blue-400 font-semibold tracking-wider mb-6">
            SHIP TO PROD HACKATHON • APRIL 2026
          </div>
          <h1 className="text-5xl font-bold tracking-tight mb-4">
            Visa<span className="text-blue-400">Path</span>
          </h1>
          <p className="text-white/50 text-lg max-w-md">
            5 agents. One visa. From strategy to appointment booking — fully automated.
          </p>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 mt-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">$49</div>
              <div className="text-xs text-white/40">per application</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">5</div>
              <div className="text-xs text-white/40">specialized agents</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">6</div>
              <div className="text-xs text-white/40">sponsor tools</div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full max-w-lg space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-white/40 font-semibold tracking-wider mb-2">PASSPORT NATIONALITY</label>
              <select
                value={form.nationality}
                onChange={e => set('nationality', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:bg-white/8 transition-all"
              >
                <option value="" className="bg-[#0a0a0f]">Select nationality</option>
                {NATIONALITIES.map(n => <option key={n} value={n} className="bg-[#0a0a0f]">{n}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-white/40 font-semibold tracking-wider mb-2">CURRENT CITY</label>
              <select
                value={form.city}
                onChange={e => set('city', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:bg-white/8 transition-all"
              >
                <option value="" className="bg-[#0a0a0f]">Select city</option>
                {CITIES.map(c => <option key={c} value={c} className="bg-[#0a0a0f]">{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-white/40 font-semibold tracking-wider mb-2">DESTINATION COUNTRY</label>
            <select
              value={form.destination}
              onChange={e => set('destination', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:bg-white/8 transition-all"
            >
              <option value="" className="bg-[#0a0a0f]">Select destination</option>
              {DESTINATIONS.map(d => <option key={d} value={d} className="bg-[#0a0a0f]">{d}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-white/40 font-semibold tracking-wider mb-2">TRAVEL DATES</label>
            <input
              type="text"
              placeholder="e.g. June 15 – June 28, 2026"
              value={form.travelDates}
              onChange={e => set('travelDates', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50 focus:bg-white/8 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs text-white/40 font-semibold tracking-wider mb-2">EMPLOYMENT STATUS</label>
            <div className="grid grid-cols-4 gap-2">
              {EMPLOYMENT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set('employmentStatus', opt.value)}
                  className={`py-3 px-2 rounded-xl text-xs font-semibold transition-all ${
                    form.employmentStatus === opt.value
                      ? 'bg-blue-500/20 border border-blue-500/40 text-blue-400'
                      : 'bg-white/5 border border-white/10 text-white/50 hover:text-white/80 hover:bg-white/8'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-blue-500 hover:bg-blue-400 disabled:bg-blue-500/40 disabled:cursor-not-allowed rounded-xl font-bold text-sm tracking-wide transition-all mt-2"
          >
            {loading ? 'Starting agents...' : 'Find My Visa Path — $49'}
          </button>

          <p className="text-center text-xs text-white/25">
            Demo mode — payment simulated for hackathon
          </p>
        </form>
      </div>
    </div>
  );
}
