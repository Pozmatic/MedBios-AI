import { useState } from 'react';

function AbnormalFindings({ labValues = [], compact = false }) {
  const [showAll, setShowAll] = useState(false);
  const [sortBy, setSortBy] = useState('severity');
  const abnormals = labValues.filter(l => l.status !== 'normal');
  const abnormalCount = abnormals.length;

  const statusStyles = {
    critical_high: { badge: 'bg-accent-red/15 text-accent-red', bar: 'bg-accent-red', dot: 'bg-accent-red' },
    critical_low:  { badge: 'bg-accent-red/15 text-accent-red', bar: 'bg-accent-red', dot: 'bg-accent-red' },
    high:          { badge: 'bg-accent-orange/15 text-accent-orange', bar: 'bg-accent-orange', dot: 'bg-accent-orange' },
    low:           { badge: 'bg-accent-yellow/15 text-accent-yellow', bar: 'bg-accent-yellow', dot: 'bg-accent-yellow' },
    normal:        { badge: 'bg-accent-green/15 text-accent-green', bar: 'bg-accent-green', dot: 'bg-accent-green' },
  };

  const severityOrder = { critical_high: 0, critical_low: 1, high: 2, low: 3, normal: 4 };

  const getDisplay = () => {
    const base = showAll ? [...labValues] : [...abnormals];
    if (sortBy === 'severity') base.sort((a, b) => (severityOrder[a.status] ?? 5) - (severityOrder[b.status] ?? 5));
    if (sortBy === 'name') base.sort((a, b) => (a.test_name || '').localeCompare(b.test_name || ''));
    if (sortBy === 'score') base.sort((a, b) => (b.severity_score || 0) - (a.severity_score || 0));
    return base;
  };

  const display = getDisplay();

  // Value position indicator on reference range
  const getBarPosition = (lab) => {
    if (lab.reference_min == null || lab.reference_max == null) return null;
    const range = lab.reference_max - lab.reference_min;
    if (range <= 0) return null;
    const pct = ((lab.value - lab.reference_min) / range) * 100;
    return Math.max(-15, Math.min(115, pct));
  };

  if (compact) {
    return (
      <div className="glass-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Key Findings</h3>
          <span className="text-xs font-bold text-accent-orange">{abnormalCount} abnormal</span>
        </div>
        <div className="space-y-2.5">
          {abnormals.slice(0, 6).map((lab, i) => {
            const s = statusStyles[lab.status] || statusStyles.normal;
            return (
              <div key={i} className="flex items-center justify-between text-sm gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
                  <span className="text-text-secondary truncate">{lab.test_name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-text-primary font-medium tabular-nums">{lab.value}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[0.6rem] font-bold ${s.badge}`}>
                    {lab.status?.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>
            );
          })}
          {abnormalCount > 6 && (
            <p className="text-text-muted text-xs text-center pt-1">+{abnormalCount - 6} more</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Lab Values</h3>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 border border-border-subtle rounded-lg overflow-hidden">
            {['severity', 'score', 'name'].map(s => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`px-2 py-1 text-[0.65rem] font-medium transition-colors ${
                  sortBy === s ? 'bg-accent-green/15 text-accent-green' : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {s === 'severity' ? 'Risk' : s === 'score' ? 'Score' : 'A-Z'}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-accent-green hover:text-accent-green/80 transition px-2 py-1 rounded-lg border border-accent-green/20"
          >
            {showAll ? `Abnormal (${abnormalCount})` : `All (${labValues.length})`}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto -mx-1.5">
        <table className="data-table">
          <thead>
            <tr>
              <th>Test</th>
              <th>Value</th>
              <th>Status</th>
              <th>Severity</th>
              <th>Range</th>
            </tr>
          </thead>
          <tbody>
            {display.map((lab, i) => {
              const s = statusStyles[lab.status] || statusStyles.normal;
              const barPos = getBarPosition(lab);
              const sevScore = lab.severity_score || 0;

              return (
                <tr key={i}>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
                      <span className="text-text-primary font-medium">{lab.test_name}</span>
                    </div>
                  </td>
                  <td className="tabular-nums font-medium">
                    {lab.value} <span className="text-text-muted text-xs">{lab.unit || ''}</span>
                  </td>
                  <td>
                    <span className={`px-2 py-0.5 rounded text-[0.65rem] font-bold ${s.badge}`}>
                      {lab.status?.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td>
                    {sevScore > 0 ? (
                      <div className="flex items-center gap-2 min-w-[80px]">
                        <div className="flex-1 h-1.5 rounded-full bg-accent-green/5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${s.bar} transition-all duration-700`}
                            style={{ width: `${sevScore}%` }}
                          />
                        </div>
                        <span className="text-[0.6rem] text-text-muted tabular-nums w-6">{sevScore}</span>
                      </div>
                    ) : (
                      <span className="text-text-muted text-xs">—</span>
                    )}
                  </td>
                  <td>
                    {lab.reference_min != null ? (
                      <div className="min-w-[100px]">
                        <div className="text-text-muted text-xs tabular-nums">
                          {lab.reference_min} – {lab.reference_max}
                        </div>
                        {barPos !== null && (
                          <div className="relative h-1 rounded-full bg-accent-green/5 mt-1">
                            <div className="absolute inset-y-0 left-0 right-0 rounded-full bg-accent-green/20" />
                            <div
                              className={`absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${s.dot} ring-2 ring-bg-primary`}
                              style={{ left: `${barPos}%` }}
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-text-muted text-xs">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border-subtle text-xs text-text-muted">
        <span>{display.length} of {labValues.length} values shown</span>
        <span>{abnormalCount} abnormal · {labValues.filter(l => l.status?.startsWith('critical')).length} critical</span>
      </div>
    </div>
  );
}

export default AbnormalFindings;
