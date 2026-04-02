import { useState } from 'react';
import { checkDrugInteractions } from '../api';
import { useToast } from '../components/ToastProvider';

const SEVERITY_STYLES = {
  critical: { bg: 'bg-accent-red/10', border: 'border-accent-red/40', text: 'text-accent-red', badge: 'bg-accent-red text-white', color: '#ef4444' },
  high: { bg: 'bg-accent-orange/10', border: 'border-accent-orange/40', text: 'text-accent-orange', badge: 'bg-accent-orange text-white', color: '#f97316' },
  moderate: { bg: 'bg-accent-yellow/10', border: 'border-accent-yellow/40', text: 'text-accent-yellow', badge: 'bg-accent-yellow text-black', color: '#eab308' },
  low: { bg: 'bg-accent-green/10', border: 'border-accent-green/40', text: 'text-accent-green', badge: 'bg-accent-green text-white', color: '#10b981' },
};

const QUICK_MEDS = [
  'Warfarin', 'Aspirin', 'Metformin', 'Lisinopril', 'Atorvastatin',
  'Ibuprofen', 'Omeprazole', 'Levothyroxine', 'Amlodipine', 'Clopidogrel',
  'Digoxin', 'Amiodarone', 'Spironolactone', 'Prednisone', 'Insulin',
  'Fluoxetine', 'Phenelzine', 'Ciprofloxacin', 'Tramadol', 'Clarithromycin',
  'Doxycycline', 'Sildenafil', 'Nitroglycerin', 'Metronidazole',
];

function SeverityRing({ interactions }) {
  const counts = { critical: 0, high: 0, moderate: 0, low: 0 };
  interactions.forEach(i => { counts[i.severity] = (counts[i.severity] || 0) + 1; });
  const total = interactions.length || 1;
  const r = 45, circumference = 2 * Math.PI * r;
  let offset = 0;

  const segments = Object.entries(counts).filter(([, c]) => c > 0).map(([sev, count]) => {
    const pct = count / total;
    const dashLen = pct * circumference;
    const seg = { sev, count, dashLen, dashOffset: -offset, color: SEVERITY_STYLES[sev].color };
    offset += dashLen;
    return seg;
  });

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 100 100" className="w-28 h-28">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
        {segments.map((s, i) => (
          <circle key={i} cx="50" cy="50" r={r} fill="none" stroke={s.color} strokeWidth="6"
            strokeDasharray={`${s.dashLen} ${circumference - s.dashLen}`} strokeDashoffset={s.dashOffset}
            strokeLinecap="round" transform="rotate(-90 50 50)" className="transition-all duration-700"
          />
        ))}
        <text x="50" y="46" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">{interactions.length}</text>
        <text x="50" y="60" textAnchor="middle" fill="#64748b" fontSize="7" fontWeight="500">INTERACTIONS</text>
      </svg>
      <div className="flex gap-3 mt-2">
        {Object.entries(counts).filter(([, c]) => c > 0).map(([sev, count]) => (
          <div key={sev} className="text-center">
            <div className="text-sm font-bold" style={{ color: SEVERITY_STYLES[sev].color }}>{count}</div>
            <div className="text-[0.5rem] text-text-muted uppercase">{sev}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DrugInteractions() {
  const [medications, setMedications] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { addToast } = useToast();

  const addMed = (med) => {
    const normalized = med.trim().toLowerCase();
    if (normalized && !medications.some(m => m.toLowerCase() === normalized)) {
      setMedications(prev => [...prev, med.trim()]);
    }
    setInputValue('');
  };

  const removeMed = (index) => setMedications(prev => prev.filter((_, i) => i !== index));

  const handleCheck = async () => {
    if (medications.length < 2) { setError('Add at least 2 medications'); addToast('Add at least 2 medications', 'warning'); return; }
    setLoading(true);
    setError(null);
    try {
      const data = await checkDrugInteractions(medications);
      setResults(data);
      const count = data.drug_interactions?.length || 0;
      if (count > 0) addToast(`Found ${count} drug interaction(s)!`, 'warning');
      else addToast('No interactions found — medications appear safe together', 'success');
    } catch {
      setError('Failed to check interactions.');
      addToast('Connection error — is the backend running?', 'error');
    } finally {
      setLoading(false);
    }
  };

  const maxSeverity = results?.drug_interactions?.reduce((max, i) => {
    const order = { critical: 4, high: 3, moderate: 2, low: 1 };
    return (order[i.severity] || 0) > (order[max] || 0) ? i.severity : max;
  }, 'low') || 'low';

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 page-enter">
      <div className="slide-up mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-green/15 to-emerald-300/15 border border-accent-green/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-accent-green to-emerald-300 bg-clip-text text-transparent">
              Drug Interaction Checker
            </h1>
            <p className="text-text-secondary text-sm mt-0.5">30 interaction pairs · 65+ medication aliases · Real-time analysis</p>
          </div>
        </div>
      </div>

      {/* Medication Input Card */}
      <div className="glass-card mb-6 fade-in">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Patient Medications</h3>
          {medications.length > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-accent-green/15 text-accent-green font-medium">
              {medications.length} selected
            </span>
          )}
        </div>

        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addMed(inputValue)}
              placeholder="Type medication name..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-accent-green/5 border border-border-subtle text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-accent-green transition"
            />
          </div>
          <button
            onClick={() => addMed(inputValue)}
            disabled={!inputValue.trim()}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent-green to-emerald-300 text-white text-sm font-medium hover:opacity-90 transition disabled:opacity-40"
          >
            + Add
          </button>
        </div>

        <div className="mb-4">
          <p className="text-text-muted text-xs mb-2">Quick add common medications:</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_MEDS.map(med => {
              const isAdded = medications.some(m => m.toLowerCase() === med.toLowerCase());
              return (
                <button
                  key={med}
                  onClick={() => !isAdded && addMed(med)}
                  disabled={isAdded}
                  className={`px-2.5 py-1 rounded-lg text-xs transition ${
                    isAdded
                      ? 'bg-accent-green/15 text-accent-green border border-accent-green/30 cursor-default'
                      : 'border border-border-subtle text-text-muted hover:text-text-primary hover:border-text-muted hover:bg-accent-green/5'
                  }`}
                >
                  {isAdded ? '✓' : '+'} {med}
                </button>
              );
            })}
          </div>
        </div>

        {medications.length > 0 && (
          <div className="pt-3 border-t border-border-subtle">
            <div className="flex flex-wrap gap-2">
              {medications.map((med, i) => (
                <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent-green/15 text-accent-green text-sm border border-accent-green/20 group hover:bg-accent-green/25 transition">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-blue" />
                  {med}
                  <button onClick={() => removeMed(i)} className="text-accent-red/60 hover:text-accent-red text-xs ml-0.5 group-hover:text-accent-red transition">×</button>
                </span>
              ))}
              <button
                onClick={() => setMedications([])}
                className="px-3 py-1.5 rounded-full text-xs text-text-muted hover:text-accent-red hover:bg-accent-red/10 transition border border-transparent hover:border-accent-red/20"
              >
                Clear all
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Check Button */}
      <button
        onClick={handleCheck}
        disabled={loading || medications.length < 2}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-accent-green to-emerald-300 text-white font-semibold hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed mb-6 flex items-center justify-center gap-2 shadow-lg shadow-accent-green/15"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Analyzing interactions...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            Check {medications.length} Medication{medications.length !== 1 ? 's' : ''} for Interactions
          </>
        )}
      </button>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-accent-red/10 border border-accent-red/30 text-accent-red text-sm mb-6">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-4 fade-in">
          {/* Summary Panel */}
          <div className={`glass-card ${SEVERITY_STYLES[maxSeverity].border} border`}>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex-1">
                <h3 className={`text-sm font-bold uppercase tracking-wider ${SEVERITY_STYLES[maxSeverity].text}`}>
                  {maxSeverity.toUpperCase()} ALERT LEVEL
                </h3>
                <p className="text-text-secondary text-sm mt-0.5">
                  {results.drug_interactions?.length || 0} drug-drug interaction{(results.drug_interactions?.length || 0) !== 1 ? 's' : ''} found across {medications.length} medications
                </p>
              </div>
              {results.drug_interactions?.length > 0 && (
                <SeverityRing interactions={results.drug_interactions} />
              )}
            </div>
          </div>

          {/* No interactions found */}
          {results.drug_interactions?.length === 0 && (
            <div className="glass-card border border-accent-green/30 text-center py-8">
              <svg className="w-12 h-12 mx-auto text-accent-green mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-accent-green font-semibold">No Interactions Detected</p>
              <p className="text-text-muted text-sm mt-1">These medications appear safe to use together</p>
            </div>
          )}

          {/* Interaction Cards */}
          {results.drug_interactions?.map((interaction, i) => {
            const s = SEVERITY_STYLES[interaction.severity] || SEVERITY_STYLES.low;
            return (
              <div key={i} className={`glass-card ${s.border} border`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ background: s.color }}>
                      {i + 1}
                    </div>
                    <h4 className="font-semibold text-text-primary">
                      {interaction.drug1 || interaction.drug_a} ↔ {interaction.drug2 || interaction.drug_b}
                    </h4>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${s.badge}`}>
                    {interaction.severity?.toUpperCase()}
                  </span>
                </div>

                <div className={`${s.bg} rounded-xl p-3 mb-3`}>
                  <span className={`text-sm font-medium ${s.text}`}>{interaction.effect}</span>
                </div>

                {interaction.mechanism && (
                  <div className="mb-3">
                    <p className="text-[0.65rem] text-text-muted uppercase tracking-wider mb-1 font-semibold">Mechanism</p>
                    <p className="text-text-secondary text-sm leading-relaxed">{interaction.mechanism}</p>
                  </div>
                )}

                {interaction.recommendation && (
                  <div className="bg-accent-green/8 border border-accent-green/25 rounded-xl p-3">
                    <p className="text-[0.65rem] text-text-muted uppercase tracking-wider mb-1 font-semibold">
                      <span className="text-accent-green">✓</span> Clinical Recommendation
                    </p>
                    <p className="text-accent-green text-sm">{interaction.recommendation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!results && medications.length < 2 && (
        <div className="glass-card text-center py-12 fade-in">
          <svg className="w-16 h-16 mx-auto text-text-muted/30 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          <p className="text-text-muted text-sm mb-1">Add at least 2 medications to check for interactions</p>
          <p className="text-text-muted/60 text-xs">Our database covers 30 clinically significant drug-drug interaction pairs</p>
        </div>
      )}
    </div>
  );
}

export default DrugInteractions;
