import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPatientTrends } from '../api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function TrendAnalysis() {
  const { patientId } = useParams();
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => { loadTrends(); }, [patientId]);

  const loadTrends = async () => {
    try {
      const data = await getPatientTrends(patientId);
      setTrends(data);
    } catch {
      setError('Failed to load trend data.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col items-center py-20 gap-3">
          <div className="spinner" />
          <p className="text-text-muted">Loading trend analysis...</p>
        </div>
      </div>
    );
  }

  if (error || !trends) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="glass-card text-center py-12">
          <p className="text-accent-orange mb-2">{error || 'No trend data available'}</p>
          <Link to="/" className="text-accent-green text-sm hover:underline">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const labTrends = trends.lab_trends || [];
  const alerts = trends.alerts || [];
  const filtered = filter === 'alerts' ? labTrends.filter(t => t.alert)
    : filter === 'stable' ? labTrends.filter(t => t.direction === 'stable')
    : labTrends;

  const directionColors = {
    increasing: 'text-accent-red',
    decreasing: 'text-accent-green',
    stable: 'text-accent-green',
    fluctuating: 'text-accent-orange',
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="slide-up mb-6">
        <Link to="/" className="text-text-muted text-sm hover:text-text-secondary transition">← Dashboard</Link>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-accent-green to-emerald-300 bg-clip-text text-transparent mt-2">
          Trend Analysis
        </h1>
        <p className="text-text-secondary mt-1">Longitudinal tracking for Patient {patientId}</p>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="glass-card border border-accent-red/30 mb-6 fade-in">
          <h3 className="text-sm font-semibold text-accent-red uppercase tracking-wider mb-2">
            {alerts.length} Alert(s) Detected
          </h3>
          <div className="space-y-2">
            {alerts.map((alert, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-red mt-1.5 shrink-0" />
                {alert.message || alert}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-1 mb-6">
        {[
          { id: 'all', label: `All (${labTrends.length})` },
          { id: 'alerts', label: `Alerts (${labTrends.filter(t => t.alert).length})` },
          { id: 'stable', label: `Stable (${labTrends.filter(t => t.direction === 'stable').length})` },
        ].map(tab => (
          <button
            key={tab.id}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === tab.id
                ? 'bg-gradient-to-r from-accent-green to-emerald-300 text-white'
                : 'border border-border-subtle text-text-secondary hover:bg-accent-green/5'
            }`}
            onClick={() => setFilter(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Trend Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((trend, i) => (
          <div key={i} className={`glass-card fade-in ${trend.alert ? 'border border-accent-red/30' : ''}`}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-text-primary text-sm">{trend.test_name}</h4>
              <span className={`text-xs font-medium ${directionColors[trend.direction] || 'text-text-muted'}`}>
                {trend.direction}
              </span>
            </div>

            {trend.data_points && trend.data_points.length > 1 ? (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={trend.data_points}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={trend.alert ? '#ef4444' : '#10b981'}
                    fill={trend.alert ? 'rgba(239,68,68,0.1)' : 'rgba(14,165,233,0.1)'}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-text-muted text-xs text-center py-8">Insufficient data for chart</p>
            )}

            {trend.note && (
              <p className="text-text-muted text-xs mt-2 italic">{trend.note}</p>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="glass-card text-center py-12">
          <p className="text-text-muted">No trends matching the current filter</p>
        </div>
      )}
    </div>
  );
}

export default TrendAnalysis;
