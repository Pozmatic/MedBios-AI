import { useState, useEffect, useRef } from 'react';

function RiskScores({ riskScores = {} }) {
  const systems = riskScores.by_system || {};
  const overall = riskScores.overall || 0;
  const [animated, setAnimated] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const getRiskStyle = (score) => {
    if (score >= 70) return { bar: 'bg-accent-red', text: 'text-accent-red', label: 'HIGH', glow: 'shadow-accent-red/20' };
    if (score >= 40) return { bar: 'bg-accent-orange', text: 'text-accent-orange', label: 'MODERATE', glow: 'shadow-accent-orange/20' };
    return { bar: 'bg-accent-green', text: 'text-accent-green', label: 'LOW', glow: 'shadow-accent-green/20' };
  };

  const overallRisk = getRiskStyle(overall);
  const sortedSystems = Object.entries(systems).sort((a, b) => b[1] - a[1]);

  return (
    <div className="glass-card" ref={ref}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <svg className="w-4 h-4 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">Risk Assessment</h3>
      </div>

      {/* Overall Risk Circle */}
      <div className="flex items-center gap-6 mb-6 p-4 rounded-xl bg-accent-green/[0.03] border border-border-subtle">
        <div className="relative w-20 h-20 shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
            <circle
              cx="36" cy="36" r="30" fill="none"
              stroke={overall >= 70 ? '#ef4444' : overall >= 40 ? '#f97316' : '#22c55e'}
              strokeWidth="6" strokeLinecap="round"
              strokeDasharray={`${animated ? (overall / 100) * 188.5 : 0} 188.5`}
              style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.22, 1, 0.36, 1)' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-lg font-bold tabular-nums ${overallRisk.text}`}>{overall}%</span>
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-sm font-bold ${overallRisk.text}`}>Overall Risk: {overallRisk.label}</span>
          </div>
          <p className="text-xs text-text-muted leading-relaxed">
            {overall >= 70
              ? 'Multiple high-risk findings detected. Immediate clinical attention recommended.'
              : overall >= 40
                ? 'Moderate risk indicators present. Follow-up testing and lifestyle changes advised.'
                : 'Low overall risk profile. Continue maintaining healthy lifestyle habits.'}
          </p>
        </div>
      </div>

      {/* Per-system bars */}
      <div className="space-y-3">
        {sortedSystems.map(([system, score], i) => {
          const risk = getRiskStyle(score);
          return (
            <div key={system}>
              <div className="flex justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${risk.bar}`} />
                  <span className="text-sm text-text-secondary capitalize">{system}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold tabular-nums ${risk.text}`}>{score}%</span>
                  <span className={`px-1.5 py-0.5 rounded text-[0.5rem] font-bold ${
                    score >= 70 ? 'bg-accent-red/15 text-accent-red' : score >= 40 ? 'bg-accent-orange/15 text-accent-orange' : 'bg-accent-green/15 text-accent-green'
                  }`}>
                    {risk.label}
                  </span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-accent-green/5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${risk.bar} transition-all duration-1000`}
                  style={{
                    width: animated ? `${score}%` : '0%',
                    transitionDelay: `${i * 80}ms`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-5 pt-4 border-t border-border-subtle">
        {[
          { color: 'bg-accent-green', label: '0-39% Low' },
          { color: 'bg-accent-orange', label: '40-69% Moderate' },
          { color: 'bg-accent-red', label: '70-100% High' },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[0.6rem] text-text-muted">
            <span className={`w-2 h-2 rounded-full ${item.color}`} />
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default RiskScores;
