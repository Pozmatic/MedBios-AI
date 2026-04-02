import { useState } from 'react';

const SEVERITY_CONFIG = {
  critical_high: {
    border: 'border-accent-red',
    bg: 'bg-accent-red/10',
    icon: 'bg-accent-red',
    text: 'text-accent-red',
    label: 'CRITICAL HIGH',
  },
  critical_low: {
    border: 'border-accent-red',
    bg: 'bg-accent-red/10',
    icon: 'bg-accent-red',
    text: 'text-accent-red',
    label: 'CRITICAL LOW',
  },
  high: {
    border: 'border-accent-orange',
    bg: 'bg-accent-orange/10',
    icon: 'bg-accent-orange',
    text: 'text-accent-orange',
    label: 'ELEVATED',
  },
  low: {
    border: 'border-accent-yellow',
    bg: 'bg-accent-yellow/10',
    icon: 'bg-accent-yellow',
    text: 'text-accent-yellow',
    label: 'LOW',
  },
};

function CriticalAlerts({ labValues = [], insights = [] }) {
  const [dismissed, setDismissed] = useState([]);

  const criticals = labValues
    .filter(l => (l.status === 'critical_high' || l.status === 'critical_low') && !dismissed.includes(l.test_name));

  const highRisk = insights
    .filter(i => i.confidence === 'high' && !dismissed.includes(`insight-${i.condition}`));

  if (!criticals.length && !highRisk.length) return null;

  return (
    <div className="space-y-2 mb-6 fade-in">
      {/* Labelled banner for critical labs */}
      {criticals.map((lab, i) => {
        const cfg = SEVERITY_CONFIG[lab.status] || SEVERITY_CONFIG.high;
        return (
          <div key={i} className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${cfg.border} ${cfg.bg} animate-pulse-once`}>
            <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${cfg.icon} ring-4 ring-current/20`} />
            <div className="flex-1 min-w-0">
              <span className={`text-xs font-bold uppercase tracking-wider ${cfg.text}`}>{cfg.label}</span>
              <p className="text-sm text-text-primary mt-0.5">
                <strong>{lab.test_name}</strong>: {lab.value} {lab.unit || ''} — significantly outside reference range
                {lab.reference_min != null && ` (ref: ${lab.reference_min}–${lab.reference_max})`}
              </p>
            </div>
            <button
              onClick={() => setDismissed(d => [...d, lab.test_name])}
              className="text-text-muted hover:text-text-secondary text-lg leading-none shrink-0"
              title="Dismiss"
            >
              &times;
            </button>
          </div>
        );
      })}

      {/* High-confidence clinical concerns */}
      {highRisk.slice(0, 3).map((insight, i) => (
        <div key={`i-${i}`} className="flex items-start gap-3 px-4 py-3 rounded-xl border border-accent-green/40 bg-accent-green/10">
          <span className="mt-0.5 w-2 h-2 rounded-full shrink-0 bg-accent-green ring-4 ring-purple-400/20" />
          <div className="flex-1 min-w-0">
            <span className="text-xs font-bold uppercase tracking-wider text-accent-green">CLINICAL CONCERN</span>
            <p className="text-sm text-text-primary mt-0.5">
              <strong>{insight.condition}</strong> — {insight.reasoning || 'High-confidence finding detected'}
            </p>
            {insight.recommendation && (
              <p className="text-xs text-accent-green mt-1">{insight.recommendation}</p>
            )}
          </div>
          <button
            onClick={() => setDismissed(d => [...d, `insight-${insight.condition}`])}
            className="text-text-muted hover:text-text-secondary text-lg leading-none shrink-0"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}

export default CriticalAlerts;
