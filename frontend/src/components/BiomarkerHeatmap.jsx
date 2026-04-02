import { useState } from 'react';

const STATUS_COLORS = {
  critical_high: { bg: '#991b1b', border: '#dc2626', glow: 'rgba(239,68,68,0.6)' },
  critical_low:  { bg: '#991b1b', border: '#dc2626', glow: 'rgba(239,68,68,0.6)' },
  high:          { bg: '#7c2d12', border: '#f97316', glow: 'rgba(249,115,22,0.4)' },
  low:           { bg: '#713f12', border: '#eab308', glow: 'rgba(234,179,8,0.4)' },
  normal:        { bg: '#14532d', border: '#22c55e', glow: 'rgba(34,197,94,0.3)' },
};

function BiomarkerHeatmap({ labValues = [] }) {
  const [hovered, setHovered] = useState(null);
  const [sortBy, setSortBy] = useState('severity');

  if (!labValues.length) {
    return (
      <div className="glass-card text-center py-12">
        <p className="text-text-muted text-sm">No biomarker data available</p>
      </div>
    );
  }

  const severityOrder = { critical_high: 0, critical_low: 1, high: 2, low: 3, normal: 4 };

  const sorted = [...labValues].sort((a, b) => {
    if (sortBy === 'severity') return (severityOrder[a.status] ?? 5) - (severityOrder[b.status] ?? 5);
    if (sortBy === 'name') return (a.test_name || '').localeCompare(b.test_name || '');
    return 0;
  });

  const abnormalPct = Math.round((labValues.filter(l => l.status !== 'normal').length / labValues.length) * 100);

  return (
    <div className="glass-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Biomarker Heatmap</h3>
          <p className="text-text-muted text-xs mt-0.5">{labValues.length} markers analyzed · {abnormalPct}% abnormal</p>
        </div>
        <div className="flex gap-1">
          {['severity', 'name'].map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                sortBy === s ? 'bg-accent-green/20 text-accent-green' : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {s === 'severity' ? 'By Risk' : 'A-Z'}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-[0.6rem] text-text-muted">
        {[
          { label: 'Critical', color: '#dc2626' },
          { label: 'High', color: '#f97316' },
          { label: 'Low', color: '#eab308' },
          { label: 'Normal', color: '#22c55e' },
        ].map((l, i) => (
          <div key={i} className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: l.color, opacity: 0.7 }} />
            {l.label}
          </div>
        ))}
      </div>

      {/* Heatmap Grid */}
      <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))' }}>
        {sorted.map((lab, i) => {
          const cfg = STATUS_COLORS[lab.status] || STATUS_COLORS.normal;
          const isHovered = hovered === i;

          return (
            <div
              key={i}
              className="relative rounded-lg p-2.5 cursor-pointer transition-all duration-200"
              style={{
                backgroundColor: cfg.bg,
                border: `1px solid ${isHovered ? cfg.border : 'transparent'}`,
                boxShadow: isHovered ? `0 0 16px ${cfg.glow}` : 'none',
                transform: isHovered ? 'scale(1.05)' : 'scale(1)',
              }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <div className="text-[0.6rem] text-white/60 truncate mb-1">{lab.test_name}</div>
              <div className="text-sm font-bold text-white tabular-nums">
                {lab.value}
                <span className="text-[0.55rem] text-white/40 ml-0.5">{lab.unit || ''}</span>
              </div>

              {/* Expanded tooltip on hover */}
              {isHovered && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30 w-48 bg-bg-card border border-border-subtle rounded-xl p-3 shadow-2xl pointer-events-none">
                  <div className="text-xs font-semibold text-text-primary mb-1">{lab.test_name}</div>
                  <div className="grid grid-cols-2 gap-1 text-[0.65rem]">
                    <span className="text-text-muted">Value:</span>
                    <span className="text-text-primary font-medium">{lab.value} {lab.unit || ''}</span>
                    <span className="text-text-muted">Status:</span>
                    <span style={{ color: cfg.border }} className="font-bold uppercase">{lab.status?.replace('_', ' ')}</span>
                    {lab.reference_min != null && (
                      <>
                        <span className="text-text-muted">Range:</span>
                        <span className="text-text-primary">{lab.reference_min} – {lab.reference_max}</span>
                      </>
                    )}
                  </div>
                  {/* Arrow */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-bg-card border-r border-b border-border-subtle rotate-45 -mt-1" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default BiomarkerHeatmap;
