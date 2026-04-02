import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer, Tooltip
} from 'recharts';

const SYSTEM_COLORS = {
  Cardiovascular: '#f97316',
  Hematological: '#ef4444',
  Renal: '#10b981',
  Hepatic: '#14b8a6',
  Endocrine: '#22c55e',
  Electrolytes: '#34d399',
  Gastrointestinal: '#ec4899',
  Respiratory: '#eab308',
};

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    const risk = d.score >= 70 ? 'HIGH' : d.score >= 40 ? 'MODERATE' : 'LOW';
    const color = d.score >= 70 ? '#ef4444' : d.score >= 40 ? '#f97316' : '#22c55e';
    return (
      <div className="bg-bg-card border border-border-subtle rounded-lg px-3 py-2 text-xs shadow-xl">
        <div className="font-semibold text-text-primary mb-1">{d.system}</div>
        <div style={{ color }} className="font-bold">{d.score}% — {risk}</div>
      </div>
    );
  }
  return null;
};

function SystemRadarChart({ riskScores = {} }) {
  const systems = riskScores.by_system || {};

  if (!Object.keys(systems).length) {
    return (
      <div className="glass-card h-full flex items-center justify-center">
        <p className="text-text-muted text-sm">No system risk data</p>
      </div>
    );
  }

  const data = Object.entries(systems).map(([system, score]) => ({
    system: system.replace('Hematological', 'Blood').replace('Gastrointestinal', 'GI'),
    fullSystem: system,
    score,
  }));

  return (
    <div className="glass-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">System Risk Radar</h3>
        <div className="flex items-center gap-3 text-[0.6rem] text-text-muted">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent-green inline-block" />Low</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent-orange inline-block" />Mod</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent-red inline-block" />High</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
          <PolarGrid stroke="rgba(255,255,255,0.06)" />
          <PolarAngleAxis
            dataKey="system"
            tick={{ fill: '#64748b', fontSize: 10 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={{ fill: '#64748b', fontSize: 9 }}
            tickCount={4}
          />
          <Radar
            name="Risk Score"
            dataKey="score"
            stroke="#10b981"
            fill="#10b981"
            fillOpacity={0.15}
            strokeWidth={2}
            dot={{ fill: '#10b981', r: 3 }}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default SystemRadarChart;
