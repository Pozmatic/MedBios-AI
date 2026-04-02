import { useState, useEffect, useRef } from 'react';

function AnimatedCounter({ value, duration = 800 }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const target = Number(value) || 0;
    if (target === 0) { setDisplay(0); return; }
    let start = 0;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // cubic ease-out
      setDisplay(Math.round(eased * target));
      if (progress < 1) ref.current = requestAnimationFrame(step);
    };
    ref.current = requestAnimationFrame(step);
    return () => ref.current && cancelAnimationFrame(ref.current);
  }, [value, duration]);
  return <span>{display}</span>;
}

function PatientSummaryCard({ patientInfo = {}, labValues = [], riskScores = {}, insights = [] }) {
  const overall = riskScores.overall || 0;
  const abnormalCount = labValues.filter(l => l.status !== 'normal').length;
  const criticalCount = labValues.filter(l => l.status?.startsWith('critical')).length;
  const highConfInsights = insights.filter(i => i.confidence === 'high').length;
  const normalCount = labValues.length - abnormalCount;

  const riskColor = overall >= 70 ? 'text-accent-red' : overall >= 40 ? 'text-accent-orange' : 'text-accent-green';
  const riskBg = overall >= 70 ? 'from-accent-red/15 to-accent-red/5' : overall >= 40 ? 'from-accent-orange/15 to-accent-orange/5' : 'from-accent-green/15 to-accent-green/5';
  const riskLabel = overall >= 70 ? 'HIGH RISK' : overall >= 40 ? 'MODERATE' : 'LOW RISK';
  const riskBorder = overall >= 70 ? 'border-accent-red/30' : overall >= 40 ? 'border-accent-orange/30' : 'border-accent-green/30';

  const name = patientInfo.name || patientInfo.patient_name || 'Patient';
  const age = patientInfo.age || patientInfo.patient_age || null;
  const sex = patientInfo.sex || patientInfo.gender || null;
  const id = patientInfo.id || patientInfo.patient_id || null;
  const date = patientInfo.report_date || patientInfo.date || new Date().toLocaleDateString();

  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const metrics = [
    { value: labValues.length, label: 'Total Tests', color: 'text-accent-green', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { value: normalCount, label: 'Normal', color: 'text-accent-green', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { value: abnormalCount, label: 'Abnormal', color: 'text-accent-orange', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
    { value: criticalCount, label: 'Critical', color: 'text-accent-red', icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { value: highConfInsights, label: 'AI Alerts', color: 'text-accent-green', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { value: Object.keys(riskScores.organ_systems || riskScores.by_system || {}).length, label: 'Systems', color: 'text-cyan-400', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
  ];

  return (
    <div className="glass-card relative overflow-hidden">
      {/* Decorative gradients */}
      <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-gradient-to-br from-accent-blue/8 to-accent-purple/8 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-gradient-to-br from-accent-green/5 to-accent-blue/5 blur-2xl pointer-events-none" />

      {/* Top Section: Patient + Risk */}
      <div className="flex items-start gap-4 relative">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-green to-emerald-300 flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-lg shadow-accent-green/20 ring-2 ring-accent-blue/20">
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-text-primary truncate">{name}</h3>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
            {age && (
              <span className="text-xs text-text-muted flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                <strong className="text-text-secondary">{age}</strong> yrs
              </span>
            )}
            {sex && (
              <span className="text-xs text-text-muted flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" /></svg>
                <strong className="text-text-secondary">{sex}</strong>
              </span>
            )}
            {id && (
              <span className="text-xs text-text-muted">
                ID: <strong className="text-text-secondary font-mono">{id}</strong>
              </span>
            )}
            <span className="text-xs text-text-muted">
              📅 {date}
            </span>
          </div>
        </div>

        {/* Risk Badge */}
        <div className={`px-4 py-2.5 rounded-2xl bg-gradient-to-br ${riskBg} border ${riskBorder} flex flex-col items-center shrink-0 min-w-[80px]`}>
          <span className={`text-xl font-bold tabular-nums ${riskColor}`}>
            <AnimatedCounter value={overall} />%
          </span>
          <span className={`text-[0.5rem] font-bold uppercase tracking-widest ${riskColor} mt-0.5`}>{riskLabel}</span>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-5 pt-4 border-t border-border-subtle">
        {metrics.map((m, i) => (
          <div key={i} className="text-center group cursor-default">
            <div className="flex justify-center mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-accent-green/[0.03] border border-border-subtle flex items-center justify-center group-hover:bg-white/[0.06] transition">
                <svg className={`w-3.5 h-3.5 ${m.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={m.icon} />
                </svg>
              </div>
            </div>
            <div className={`text-lg font-bold tabular-nums ${m.color} leading-none`}>
              <AnimatedCounter value={m.value} duration={600 + i * 100} />
            </div>
            <div className="text-[0.5rem] text-text-muted uppercase tracking-wider mt-0.5">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Mini progress bar showing normal vs abnormal ratio */}
      {labValues.length > 0 && (
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-accent-green/5 overflow-hidden flex">
            <div className="h-full bg-accent-green rounded-l-full transition-all duration-700" style={{ width: `${(normalCount / labValues.length) * 100}%` }} />
            <div className="h-full bg-accent-orange transition-all duration-700" style={{ width: `${((abnormalCount - criticalCount) / labValues.length) * 100}%` }} />
            <div className="h-full bg-accent-red rounded-r-full transition-all duration-700" style={{ width: `${(criticalCount / labValues.length) * 100}%` }} />
          </div>
          <span className="text-[0.55rem] text-text-muted whitespace-nowrap">
            {Math.round((normalCount / labValues.length) * 100)}% normal
          </span>
        </div>
      )}
    </div>
  );
}

export default PatientSummaryCard;
