import { useState } from 'react';

const CONF_STYLES = {
  high:   { badge: 'bg-accent-red/15 text-accent-red', dot: 'bg-accent-red', icon: '▲' },
  medium: { badge: 'bg-accent-orange/15 text-accent-orange', dot: 'bg-accent-orange', icon: '●' },
  low:    { badge: 'bg-accent-green/15 text-accent-green', dot: 'bg-accent-blue', icon: '○' },
};

const CAT_ICONS = {
  Hematology: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517',
  Cardiovascular: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
  Endocrine: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707',
  Hepatic: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  Renal: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
};

function ClinicalInsights({ insights = [], evidenceChains = [], graphRisks = [], compact = false }) {
  const [expanded, setExpanded] = useState({});
  const toggle = (i) => setExpanded(prev => ({ ...prev, [i]: !prev[i] }));

  const displayInsights = compact ? insights.slice(0, 4) : insights;
  const highCount = insights.filter(i => i.confidence === 'high').length;

  return (
    <div className="glass-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">
            Clinical Insights
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {highCount > 0 && <span className="px-2 py-0.5 rounded-full bg-accent-red/15 text-accent-red font-bold">{highCount} high</span>}
          <span className="text-text-muted">{insights.length} total</span>
        </div>
      </div>

      <div className="space-y-2">
        {displayInsights.map((insight, i) => {
          const chain = evidenceChains.find(e => e.insight === insight.condition || e.condition === insight.condition);
          const isExpanded = expanded[i];
          const conf = CONF_STYLES[insight.confidence] || CONF_STYLES.low;
          const catIcon = CAT_ICONS[insight.category];

          return (
            <div key={i} className="rounded-xl border border-border-subtle overflow-hidden transition-all">
              <button
                onClick={() => toggle(i)}
                className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/[0.015] transition"
              >
                <div className={`w-7 h-7 rounded-lg ${conf.badge} flex items-center justify-center shrink-0 mt-0.5`}>
                  {catIcon ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={catIcon} />
                    </svg>
                  ) : (
                    <span className="text-[0.6rem] font-bold">{i + 1}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-text-primary">{insight.condition}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[0.55rem] font-bold uppercase ${conf.badge}`}>
                      {insight.confidence}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">{insight.category}</p>
                </div>
                <svg className={`w-4 h-4 text-text-muted transition-transform shrink-0 mt-1 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-border-subtle pt-3 fade-in">
                  {/* Reasoning */}
                  {insight.reasoning && (
                    <div className="px-3 py-2.5 rounded-lg bg-accent-green/5 border border-accent-green/15">
                      <p className="text-[0.6rem] text-accent-green/80 font-bold uppercase tracking-wider mb-1">Clinical Reasoning</p>
                      <p className="text-sm text-text-secondary leading-relaxed">{insight.reasoning}</p>
                    </div>
                  )}

                  {/* Evidence Items */}
                  {insight.evidence?.length > 0 && (
                    <div>
                      <p className="text-[0.6rem] text-text-muted font-bold uppercase tracking-wider mb-2">Supporting Evidence</p>
                      <div className="space-y-1.5">
                        {insight.evidence.map((ev, j) => (
                          <div key={j} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-green/[0.03] text-xs">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${conf.dot}`} />
                            <span className="text-text-secondary">{ev.test}:</span>
                            <span className="text-text-primary font-semibold tabular-nums">{ev.value}</span>
                            <span className="text-text-muted">— {ev.finding}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Evidence Chain from explainability engine */}
                  {chain?.evidence_items?.length > 0 && (
                    <div>
                      <p className="text-[0.6rem] text-text-muted font-bold uppercase tracking-wider mb-2">Evidence Chain</p>
                      <div className="relative pl-4 border-l-2 border-accent-green/20 space-y-2">
                        {chain.evidence_items.map((ev, j) => (
                          <div key={j} className="relative">
                            <div className="absolute -left-[21px] top-2 w-2.5 h-2.5 rounded-full bg-accent-blue/30 border-2 border-bg-primary" />
                            <div className="px-3 py-2 rounded-lg bg-accent-green/[0.03] text-xs">
                              <span className="text-text-primary font-medium">{ev.test_name}:</span>
                              <span className="text-text-secondary ml-1">{ev.observed_value} {ev.unit}</span>
                              {ev.reference_range && <span className="text-text-muted ml-1">(ref: {ev.reference_range})</span>}
                              <p className="text-text-muted mt-0.5">{ev.finding}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendation */}
                  {insight.recommendation && (
                    <div className="px-3 py-2.5 rounded-lg bg-accent-green/5 border border-accent-green/15">
                      <p className="text-[0.6rem] text-accent-green/80 font-bold uppercase tracking-wider mb-1">Recommendation</p>
                      <p className="text-sm text-accent-green">{insight.recommendation}</p>
                    </div>
                  )}

                  {/* Downstream Risks */}
                  {graphRisks.filter(r => r.source === insight.condition).length > 0 && (
                    <div>
                      <p className="text-[0.6rem] text-text-muted font-bold uppercase tracking-wider mb-1.5">Downstream Risks</p>
                      <div className="flex flex-wrap gap-1.5">
                        {graphRisks.filter(r => r.source === insight.condition).map((risk, k) => (
                          <span key={k} className="px-2.5 py-1 rounded-full text-xs bg-accent-red/10 text-accent-red border border-accent-red/20 font-medium">
                            {risk.target}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Confidence Justification */}
                  {chain?.confidence_justification && (
                    <p className="text-[0.6rem] text-text-muted italic">{chain.confidence_justification}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {compact && insights.length > 4 && (
        <p className="text-center text-xs text-text-muted mt-3">+{insights.length - 4} more insights in full view</p>
      )}
    </div>
  );
}

export default ClinicalInsights;
