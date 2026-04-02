import { useState } from 'react';

const ORGAN_DATA = {
  neurological: { cx: 50, cy: 12, label: 'Neurological', icon: '🧠' },
  cardiovascular: { cx: 50, cy: 30, label: 'Cardiovascular', icon: '❤️' },
  respiratory: { cx: 30, cy: 28, label: 'Respiratory', icon: '🫁' },
  hepatic: { cx: 35, cy: 42, label: 'Hepatic', icon: '🟤' },
  metabolic: { cx: 50, cy: 48, label: 'Metabolic', icon: '⚡' },
  renal: { cx: 65, cy: 50, label: 'Renal', icon: '🫘' },
  gastrointestinal: { cx: 50, cy: 58, label: 'GI Tract', icon: '🟢' },
  hematological: { cx: 75, cy: 35, label: 'Blood', icon: '🩸' },
  electrolyte: { cx: 25, cy: 50, label: 'Electrolytes', icon: '⚛️' },
  inflammatory: { cx: 75, cy: 50, label: 'Immune', icon: '🛡️' },
  nutritional: { cx: 25, cy: 35, label: 'Nutrition', icon: '🥗' },
};

const getRisk = (score) => {
  if (score >= 70) return { color: '#ef4444', glow: 'rgba(239,68,68,0.6)', level: 'HIGH', ring: '#ef4444' };
  if (score >= 40) return { color: '#f97316', glow: 'rgba(249,115,22,0.5)', level: 'MOD', ring: '#f97316' };
  return { color: '#22c55e', glow: 'rgba(34,197,94,0.3)', level: 'LOW', ring: '#22c55e' };
};

function OrganSystemVis({ riskScores = {} }) {
  const [hoveredSystem, setHoveredSystem] = useState(null);
  const systems = riskScores.organ_systems || riskScores.by_system || {};

  const activeOrgans = Object.entries(systems).map(([key, data]) => {
    const score = typeof data === 'number' ? data : data?.score || 0;
    const factors = typeof data === 'object' ? data?.factors || [] : [];
    const organKey = Object.keys(ORGAN_DATA).find(k => key.toLowerCase().includes(k)) || 'metabolic';
    const organ = ORGAN_DATA[organKey] || ORGAN_DATA.metabolic;
    const risk = getRisk(score);
    return { key, score, factors, organ, risk };
  });

  if (!activeOrgans.length) {
    return (
      <div className="glass-card h-full flex flex-col items-center justify-center min-h-[400px]">
        <svg className="w-12 h-12 text-text-muted mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
        <p className="text-text-muted text-sm">No organ system risk data available</p>
      </div>
    );
  }

  const hovered = activeOrgans.find(o => o.key === hoveredSystem);
  const maxScore = Math.max(...activeOrgans.map(o => o.score), 1);

  return (
    <div className="glass-card relative overflow-hidden h-full min-h-[400px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Organ System Map</h3>
          <p className="text-text-muted text-xs mt-0.5">{activeOrgans.length} systems analyzed</p>
        </div>
        <div className="flex items-center gap-2 text-[0.6rem] text-text-muted">
          {[{ c: '#22c55e', l: 'Low' }, { c: '#f97316', l: 'Mod' }, { c: '#ef4444', l: 'High' }].map(l => (
            <span key={l.l} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: l.c }} />{l.l}
            </span>
          ))}
        </div>
      </div>

      <div className="relative w-full max-w-[280px] mx-auto" style={{ aspectRatio: '1/1.8' }}>
        {/* Human Body SVG */}
        <svg viewBox="0 0 100 180" className="w-full h-full" style={{ filter: 'drop-shadow(0 0 20px rgba(14,165,233,0.05))' }}>
          {/* Body silhouette */}
          <path
            d="M50 5c-6 0-11 5-11 11s5 11 11 11 11-5 11-11-5-11-11-11zm-15 25c-8 0-15 7-15 15v40c0 4 3 7 7 7h3v55c0 6 5 11 10 11s10-5 10-11v-30h0v30c0 6 5 11 10 11s10-5 10-11v-55h3c4 0 7-3 7-7V45c0-8-7-15-15-15h-30z"
            fill="url(#bodyGrad)"
            opacity="0.1"
          />
          {/* Glow circles for active organ systems */}
          {activeOrgans.map(o => (
            <g key={o.key}>
              {/* Glow */}
              <circle
                cx={o.organ.cx}
                cy={o.organ.cy}
                r={o.score >= 70 ? 8 : 6}
                fill={o.risk.glow}
                opacity={hoveredSystem === o.key ? 0.8 : 0.4}
                style={{ transition: 'all 0.3s ease' }}
              />
              {/* Pulse ring for high-risk */}
              {o.score >= 70 && (
                <circle cx={o.organ.cx} cy={o.organ.cy} r="8" fill="none" stroke={o.risk.color} strokeWidth="0.5" opacity="0.5">
                  <animate attributeName="r" from="8" to="14" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              {/* Core dot */}
              <circle
                cx={o.organ.cx}
                cy={o.organ.cy}
                r={hoveredSystem === o.key ? 4.5 : 3.5}
                fill={o.risk.color}
                stroke="rgba(0,0,0,0.3)"
                strokeWidth="0.5"
                className="cursor-pointer"
                style={{ transition: 'all 0.2s ease', filter: `drop-shadow(0 0 4px ${o.risk.glow})` }}
                onMouseEnter={() => setHoveredSystem(o.key)}
                onMouseLeave={() => setHoveredSystem(null)}
              />
              {/* Connection line to label */}
              <line
                x1={o.organ.cx}
                y1={o.organ.cy}
                x2={o.organ.cx < 50 ? 2 : 98}
                y2={o.organ.cy}
                stroke={hoveredSystem === o.key ? o.risk.color : 'rgba(255,255,255,0.06)'}
                strokeWidth="0.3"
                strokeDasharray="2 2"
                style={{ transition: 'stroke 0.3s ease' }}
              />
            </g>
          ))}
          <defs>
            <linearGradient id="bodyGrad" x1="50" y1="0" x2="50" y2="180" gradientUnits="userSpaceOnUse">
              <stop stopColor="#10b981" />
              <stop offset="1" stopColor="#34d399" />
            </linearGradient>
          </defs>
        </svg>

        {/* Labels positioned around the body */}
        {activeOrgans.map(o => {
          const isLeft = o.organ.cx < 50;
          return (
            <div
              key={`label-${o.key}`}
              className={`absolute flex items-center gap-1.5 cursor-pointer transition-opacity duration-200 ${hoveredSystem && hoveredSystem !== o.key ? 'opacity-40' : 'opacity-100'}`}
              style={{
                top: `${(o.organ.cy / 180) * 100}%`,
                [isLeft ? 'right' : 'left']: '100%',
                transform: 'translateY(-50%)',
                [isLeft ? 'paddingRight' : 'paddingLeft']: '12px',
              }}
              onMouseEnter={() => setHoveredSystem(o.key)}
              onMouseLeave={() => setHoveredSystem(null)}
            >
              <div className={`text-right whitespace-nowrap ${isLeft ? '' : 'text-left'}`}>
                <div className="text-[9px] text-text-muted leading-tight">{o.organ.label}</div>
                <div className="text-[11px] font-bold tabular-nums" style={{ color: o.risk.color }}>
                  {Math.round(o.score)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Hover Detail Panel */}
      <div className={`mt-3 rounded-xl border border-border-subtle bg-accent-green/[0.03] p-3 transition-all duration-300 ${hovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
        {hovered && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-text-primary">{hovered.organ.label}</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-md" style={{ background: `${hovered.risk.color}22`, color: hovered.risk.color }}>
                {hovered.risk.level} · {Math.round(hovered.score)}%
              </span>
            </div>
            {hovered.factors.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {hovered.factors.slice(0, 4).map((f, i) => (
                  <span key={i} className="text-[0.6rem] px-2 py-0.5 rounded-full bg-accent-green/5 text-text-muted border border-border-subtle">{f}</span>
                ))}
              </div>
            )}
            {!hovered.factors.length && <p className="text-xs text-text-muted">Risk score based on abnormal lab values in this system</p>}
          </div>
        )}
      </div>

      {/* Bottom bar: system risk distribution */}
      <div className="flex gap-0.5 mt-3 h-1.5 rounded-full overflow-hidden bg-accent-green/5">
        {activeOrgans.sort((a, b) => b.score - a.score).map(o => (
          <div
            key={o.key}
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${(o.score / maxScore) * 100}%`, background: o.risk.color, minWidth: '4px' }}
            title={`${o.organ.label}: ${Math.round(o.score)}%`}
          />
        ))}
      </div>
    </div>
  );
}

export default OrganSystemVis;
