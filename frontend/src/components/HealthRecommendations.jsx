import { useState } from 'react';

const URGENCY_STYLES = {
  high: { border: 'border-accent-red/30', bg: 'bg-accent-red/5', badge: 'bg-accent-red text-white', text: 'text-accent-red' },
  moderate: { border: 'border-accent-orange/30', bg: 'bg-accent-orange/5', badge: 'bg-accent-orange text-white', text: 'text-accent-orange' },
  low: { border: 'border-accent-green/30', bg: 'bg-accent-green/5', badge: 'bg-accent-green text-white', text: 'text-accent-green' },
};

const CATEGORY_ICONS = {
  diet: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z',
  exercise: 'M13 10V3L4 14h7v7l9-11h-7z',
  supplements: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
  followup: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
};

function HealthRecommendations({ recommendations = {} }) {
  const [expandedIndex, setExpandedIndex] = useState(0);
  const recs = recommendations.recommendations || [];
  const summary = recommendations.summary || '';

  if (!recs.length) {
    return (
      <div className="glass-card text-center py-12">
        <svg className="w-12 h-12 mx-auto text-accent-green mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-text-secondary font-medium">All Clear</p>
        <p className="text-text-muted text-sm mt-1">No specific recommendations — maintain your healthy lifestyle!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Banner */}
      <div className="glass-card border border-accent-green/20 bg-gradient-to-r from-accent-blue/5 to-accent-purple/5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-green/15 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">AI Health Recommendations</h3>
            <p className="text-text-secondary text-sm mt-1">{summary}</p>
            <p className="text-text-muted text-xs mt-2">{recs.length} personalized recommendation{recs.length !== 1 ? 's' : ''} generated</p>
          </div>
        </div>
      </div>

      {/* Recommendation Cards */}
      {recs.map((rec, i) => {
        const style = URGENCY_STYLES[rec.urgency] || URGENCY_STYLES.low;
        const isExpanded = expandedIndex === i;

        return (
          <div key={i} className={`glass-card border ${style.border} transition-all`}>
            {/* Header — always visible */}
            <button
              onClick={() => setExpandedIndex(isExpanded ? -1 : i)}
              className="w-full flex items-start gap-3 text-left"
            >
              <div className={`w-8 h-8 rounded-lg ${style.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                <span className={`text-sm font-bold ${style.text}`}>{i + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold text-text-primary">{rec.condition}</h4>
                  <span className={`px-2 py-0.5 rounded text-[0.6rem] font-bold uppercase ${style.badge}`}>
                    {rec.urgency}
                  </span>
                </div>
                <p className="text-text-muted text-xs mt-0.5">
                  {rec.test}: <span className={style.text}>{rec.value}</span> ({rec.status?.replace('_', ' ')})
                </p>
              </div>
              <svg className={`w-5 h-5 text-text-muted transition-transform shrink-0 mt-1 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="mt-4 pt-4 border-t border-border-subtle space-y-4 fade-in">
                {[
                  { key: 'diet', label: 'Diet & Nutrition', items: rec.diet, color: 'text-accent-green' },
                  { key: 'exercise', label: 'Exercise', items: rec.exercise, color: 'text-accent-green' },
                  { key: 'supplements', label: 'Supplements', items: rec.supplements, color: 'text-accent-green' },
                  { key: 'followup', label: 'Follow-up Tests', items: rec.followup, color: 'text-accent-orange' },
                ].map(section => (
                  section.items?.length > 0 && (
                    <div key={section.key}>
                      <div className="flex items-center gap-2 mb-2">
                        <svg className={`w-4 h-4 ${section.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={CATEGORY_ICONS[section.key]} />
                        </svg>
                        <h5 className={`text-xs font-bold uppercase tracking-wider ${section.color}`}>{section.label}</h5>
                      </div>
                      <ul className="space-y-1.5 pl-6">
                        {section.items.map((item, j) => (
                          <li key={j} className="text-sm text-text-secondary relative before:absolute before:left-[-12px] before:top-2 before:w-1 before:h-1 before:rounded-full before:bg-text-muted">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Disclaimer */}
      <div className="text-center py-3">
        <p className="text-text-muted text-xs">
          These recommendations are AI-generated and for informational purposes only. Always consult your healthcare provider before making changes.
        </p>
      </div>
    </div>
  );
}

export default HealthRecommendations;
