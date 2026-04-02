import { useEffect, useRef, useState } from 'react';

function HealthScoreRing({ score = 0, size = 220, showBreakdown = true }) {
  const [animated, setAnimated] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    const target = Math.min(Math.max(score, 0), 100);
    let current = 0;
    const step = target / 60;
    timerRef.current = setInterval(() => {
      current += step;
      if (current >= target) { current = target; clearInterval(timerRef.current); }
      setAnimated(Math.round(current));
    }, 16);
    return () => clearInterval(timerRef.current);
  }, [score]);

  const radius = (size / 2) - 20;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference - (animated / 100) * circumference;

  // Inner decorative rings
  const innerR1 = radius - 18;
  const innerR2 = radius - 28;

  const getRisk = (s) => {
    if (s >= 70) return { label: 'HIGH RISK', color: '#ef4444', glow: 'rgba(239,68,68,0.4)', text: 'text-accent-red', bg: 'bg-accent-red/10', desc: 'Immediate medical attention recommended' };
    if (s >= 40) return { label: 'MODERATE', color: '#f97316', glow: 'rgba(249,115,22,0.4)', text: 'text-accent-orange', bg: 'bg-accent-orange/10', desc: 'Follow-up with your physician' };
    return { label: 'LOW RISK', color: '#22c55e', glow: 'rgba(34,197,94,0.4)', text: 'text-accent-green', bg: 'bg-accent-green/10', desc: 'Results within healthy range' };
  };

  const risk = getRisk(animated);

  // Decorative tick marks
  const ticks = Array.from({ length: 40 }, (_, i) => {
    const angle = (i / 40) * 360 - 90;
    const rad = (angle * Math.PI) / 180;
    const isMajor = i % 10 === 0;
    const r1 = radius + 6;
    const r2 = radius + (isMajor ? 12 : 9);
    return {
      x1: size / 2 + r1 * Math.cos(rad),
      y1: size / 2 + r1 * Math.sin(rad),
      x2: size / 2 + r2 * Math.cos(rad),
      y2: size / 2 + r2 * Math.sin(rad),
      isMajor,
    };
  });

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background glow */}
        <div
          className="absolute inset-0 rounded-full opacity-20 blur-2xl transition-colors duration-500"
          style={{ background: risk.glow }}
        />
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <defs>
            <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor={risk.color} />
              <stop offset="100%" stopColor={risk.color} />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="innerGlow">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Tick marks */}
          {ticks.map((t, i) => (
            <line
              key={i}
              x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
              stroke={t.isMajor ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)'}
              strokeWidth={t.isMajor ? 1.5 : 0.5}
              transform={`rotate(90 ${size / 2} ${size / 2})`}
            />
          ))}

          {/* Outer track */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="14"
          />

          {/* Progress arc */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke="url(#ringGrad)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={progress}
            filter="url(#glow)"
            style={{ transition: 'stroke-dashoffset 0.016s linear' }}
          />

          {/* Inner decorative ring 1 */}
          <circle
            cx={size / 2} cy={size / 2} r={innerR1}
            fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1"
          />

          {/* Inner decorative ring 2 — progress indicator */}
          <circle
            cx={size / 2} cy={size / 2} r={innerR2}
            fill="none" stroke={risk.color} strokeWidth="2" strokeLinecap="round"
            strokeDasharray={2 * Math.PI * innerR2}
            strokeDashoffset={2 * Math.PI * innerR2 - (animated / 100) * 2 * Math.PI * innerR2}
            opacity="0.15"
            filter="url(#innerGlow)"
            style={{ transition: 'stroke-dashoffset 0.016s linear' }}
          />

          {/* End dot on main ring */}
          {animated > 0 && (() => {
            const angle = ((animated / 100) * 360 - 90) * (Math.PI / 180);
            const dotX = size / 2 + radius * Math.cos(angle);
            const dotY = size / 2 + radius * Math.sin(angle);
            return (
              <circle
                cx={dotX} cy={dotY} r="4"
                fill="white"
                filter="url(#glow)"
              />
            );
          })()}
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ transform: 'none' }}>
          <span className={`text-5xl font-bold tabular-nums ${risk.text} transition-colors duration-500`} style={{ letterSpacing: '-0.02em' }}>
            {animated}
          </span>
          <span className="text-text-muted text-xs mt-0.5">/ 100</span>
          <span className={`text-[0.6rem] font-bold uppercase tracking-widest mt-2 px-3 py-1 rounded-full ${risk.bg} ${risk.text} transition-colors duration-500`}>
            {risk.label}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-text-muted text-xs mt-3 text-center max-w-[200px]">
        {risk.desc}
      </p>
      <p className="text-text-muted/50 text-[0.55rem] mt-1 text-center">Overall Clinical Risk Score</p>
    </div>
  );
}

export default HealthScoreRing;
