function DoctorReport({ report = {}, patientInfo = {} }) {
  const summary = report.summary || {};
  const abnormalFindings = report.abnormal_findings || [];
  const concerns = report.concerns || [];
  const riskScores = report.risk_scores || {};
  const recommendations = report.recommendations || [];
  const overall = riskScores.overall ?? riskScores.by_system?.overall ?? null;
  const systems = riskScores.by_system || riskScores;

  const severityColor = (score) =>
    score >= 70 ? 'text-accent-red' : score >= 40 ? 'text-accent-orange' : 'text-accent-green';

  const severityBg = (score) =>
    score >= 70 ? 'bg-accent-red' : score >= 40 ? 'bg-accent-orange' : 'bg-accent-green';

  const severityLabel = (score) =>
    score >= 70 ? 'High Risk' : score >= 40 ? 'Moderate' : 'Low Risk';

  return (
    <div className="glass-card space-y-6">
      {/* ─── Report Header ─── */}
      <div className="flex items-start justify-between pb-5 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <svg className="w-7 h-7 text-accent-green" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2"/>
              <path d="M16 8v16M12 12h8M12 20h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <div>
              <h2 className="text-lg font-bold text-text-primary">Clinical Analysis Report</h2>
              <p className="text-text-muted text-xs">MedBios AI — AI-Powered Clinical Intelligence</p>
            </div>
          </div>
        </div>
        <div className="text-right text-xs text-text-muted space-y-0.5">
          <div>Report ID: #{Math.random().toString(36).substr(2, 8).toUpperCase()}</div>
          <div>Generated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
          <div className="text-accent-green font-medium">AI Confidence: Clinical Grade</div>
        </div>
      </div>

      {/* ─── Patient Information ─── */}
      {patientInfo && Object.keys(patientInfo).length > 0 && (
        <div>
          <SectionHeader icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" title="Patient Information" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
            {Object.entries(patientInfo).map(([key, value]) =>
              value ? (
                <div key={key} className="px-3 py-2.5 rounded-xl bg-accent-green/[0.03] border border-border-subtle">
                  <div className="text-[0.6rem] text-text-muted uppercase tracking-wider">{key.replace(/_/g, ' ')}</div>
                  <div className="text-sm text-text-primary font-semibold mt-0.5">{value}</div>
                </div>
              ) : null
            )}
          </div>
        </div>
      )}

      {/* ─── Overall Risk Assessment ─── */}
      {overall != null && (
        <div className="rounded-xl border border-border-subtle overflow-hidden">
          <div className="px-4 py-3 bg-accent-green/[0.03] flex items-center justify-between">
            <SectionHeader icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" title="Overall Risk Assessment" />
            <div className="flex items-center gap-3">
              <span className={`text-2xl font-bold tabular-nums ${severityColor(overall)}`}>{overall}%</span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold text-white ${severityBg(overall)}`}>
                {severityLabel(overall)}
              </span>
            </div>
          </div>
          <div className="px-4 py-3">
            <div className="h-2 rounded-full bg-accent-green/5 overflow-hidden mb-3">
              <div className={`h-full rounded-full ${severityBg(overall)} transition-all duration-1000`} style={{ width: `${overall}%` }} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(systems).filter(([k]) => k !== 'overall' && k !== 'by_system').map(([system, score]) => (
                <div key={system} className="flex items-center justify-between px-3 py-2 rounded-lg bg-accent-green/[0.03]">
                  <span className="text-xs text-text-secondary capitalize">{system}</span>
                  <span className={`text-xs font-bold tabular-nums ${severityColor(score)}`}>{score}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Critical Findings ─── */}
      {concerns.length > 0 && (
        <div>
          <SectionHeader icon="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" title="Clinical Concerns" count={concerns.length} color="text-accent-red" />
          <div className="space-y-2 mt-3">
            {concerns.map((concern, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3 rounded-xl bg-accent-red/5 border border-accent-red/20">
                <div className="w-6 h-6 rounded-lg bg-accent-red/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-accent-red text-xs font-bold">{i + 1}</span>
                </div>
                <div>
                  <p className="text-sm text-text-primary font-medium">{typeof concern === 'string' ? concern : concern.condition}</p>
                  {concern.recommendation && <p className="text-xs text-text-muted mt-1">{concern.recommendation}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Abnormal Lab Values ─── */}
      {abnormalFindings.length > 0 && (
        <div>
          <SectionHeader icon="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" title="Abnormal Lab Values" count={abnormalFindings.length} color="text-accent-orange" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
            {abnormalFindings.map((finding, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-accent-green/[0.03] border border-border-subtle">
                <span className="w-2 h-2 rounded-full bg-accent-orange shrink-0" />
                <span className="text-sm text-text-secondary">
                  {typeof finding === 'string' ? finding : `${finding.test_name}: ${finding.value} ${finding.unit || ''}`}
                </span>
                {finding.status && (
                  <span className="ml-auto px-1.5 py-0.5 rounded text-[0.6rem] font-bold bg-accent-orange/15 text-accent-orange shrink-0">
                    {finding.status.replace('_', ' ').toUpperCase()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Clinical Recommendations ─── */}
      {recommendations.length > 0 && (
        <div>
          <SectionHeader icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" title="Clinical Recommendations" count={recommendations.length} color="text-accent-green" />
          <div className="space-y-2 mt-3">
            {recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3 rounded-xl bg-accent-green/5 border border-accent-green/20">
                <div className="w-6 h-6 rounded-lg bg-accent-green/20 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-3.5 h-3.5 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm text-accent-green">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Footer ─── */}
      <div className="pt-5 border-t border-border-subtle space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <svg className="w-4 h-4" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M16 8v16M12 12h8M12 20h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            MedBios AI Clinical Intelligence Platform
          </div>
          <div className="flex gap-2 text-[0.6rem] text-text-muted">
            <span>100+ Lab Tests</span>
            <span>•</span>
            <span>20 Clinical Rules</span>
            <span>•</span>
            <span>30 Drug Interactions</span>
          </div>
        </div>
        <p className="text-[0.6rem] text-text-muted leading-relaxed">
          DISCLAIMER: This report is generated by MedBios AI for informational purposes only.
          It does not constitute medical advice, diagnosis, or treatment. All AI-generated insights 
          must be verified by a licensed healthcare provider before clinical action. This platform 
          is designed to assist, not replace, professional medical judgment.
        </p>
      </div>
    </div>
  );
}

/* ─── Section Header Component ─── */
function SectionHeader({ icon, title, count, color = 'text-text-secondary' }) {
  return (
    <div className="flex items-center gap-2">
      <svg className={`w-4 h-4 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
      </svg>
      <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">{title}</h3>
      {count != null && <span className={`text-xs font-bold ${color}`}>({count})</span>}
    </div>
  );
}

export default DoctorReport;
