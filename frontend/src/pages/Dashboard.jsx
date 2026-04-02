import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { listReports, getAnalytics, getReportPdfUrl } from '../api';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';

/* ─── Animated counter ─── */
function AnimatedNumber({ target, suffix = '', duration = 1200 }) {
  const [val, setVal] = useState(0);
  const frame = useRef();
  useEffect(() => {
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(eased * target));
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [target]);
  return <>{val}{suffix}</>;
}

const CATEGORY_COLORS = {
  Hematology: 'bg-accent-red',     Cardiovascular: 'bg-accent-orange',
  Nephrology: 'bg-accent-yellow',  Endocrinology: 'bg-accent-green',
  Hepatology: 'bg-accent-teal',    Electrolytes: 'bg-accent-blue',
  Immunology: 'bg-accent-purple',  Nutrition: 'bg-accent-pink',
};
const CATEGORY_TEXT = {
  Hematology: 'text-accent-red',     Cardiovascular: 'text-accent-orange',
  Nephrology: 'text-accent-yellow',  Endocrinology: 'text-accent-green',
  Hepatology: 'text-accent-teal',    Electrolytes: 'text-accent-blue',
  Immunology: 'text-accent-purple',  Nutrition: 'text-accent-pink',
};

/* ─── Mock sparkline data generator ─── */
const mockTrend = (base, n = 7) =>
  Array.from({ length: n }, (_, i) => ({ i, v: Math.max(0, base + (Math.random() - 0.5) * base * 0.3) }));

function Dashboard() {
  const [reports, setReports] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReportCount, setTotalReportCount] = useState(0);
  const PAGE_SIZE = 10;

  useEffect(() => { loadData(); }, [page]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reportData, analyticsData] = await Promise.all([
        listReports(page, PAGE_SIZE),
        getAnalytics().catch(() => null),
      ]);
      setReports(reportData.items || reportData);
      setTotalPages(reportData.total_pages || 1);
      setTotalReportCount(reportData.total || (reportData.items || reportData).length);
      setAnalytics(analyticsData);
    } catch {
      setError('Could not connect to backend.');
    } finally {
      setLoading(false);
    }
  };

  const a = analytics || {};
  const catBreakdown = a.category_breakdown || {};
  const maxCatCount = Math.max(...Object.values(catBreakdown), 1);
  const totalReports = a.total_reports ?? totalReportCount;
  const avgRisk = a.avg_risk_score ?? 0;

  const stats = [
    { value: totalReports, suffix: '', label: 'Reports Analyzed', color: 'text-accent-blue', border: 'border-accent-blue/20', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { value: a.total_patients ?? 0, suffix: '', label: 'Patients', color: 'text-accent-purple', border: 'border-accent-purple/20', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { value: a.total_lab_tests ?? 0, suffix: '', label: 'Lab Tests', color: 'text-accent-green', border: 'border-accent-green/20', icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z' },
    { value: a.abnormal_count ?? 0, suffix: '', label: 'Abnormal Values', color: 'text-accent-orange', border: 'border-accent-orange/20', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
    { value: a.total_insights ?? 0, suffix: '', label: 'Clinical Insights', color: 'text-accent-teal', border: 'border-accent-teal/20', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
    { value: avgRisk, suffix: '%', label: 'Avg Risk Score', color: avgRisk >= 70 ? 'text-accent-red' : avgRisk >= 40 ? 'text-accent-orange' : 'text-accent-green', border: avgRisk >= 70 ? 'border-accent-red/20' : avgRisk >= 40 ? 'border-accent-orange/20' : 'border-accent-green/20', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">

      {/* ─── Hero Banner ─── */}
      <div className="relative mb-8 rounded-2xl overflow-hidden border border-border-subtle slide-up">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-blue/[0.07] via-transparent to-accent-purple/[0.07] pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-accent-blue/[0.04] blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-accent-purple/[0.04] blur-[80px] pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-blue/20 to-transparent" />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{backgroundImage: 'radial-gradient(circle, rgba(56,189,248,0.8) 1px, transparent 1px)', backgroundSize: '24px 24px'}} />

        <div className="relative px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-green" />
                </span>
                <span className="text-accent-green text-[0.65rem] font-semibold uppercase tracking-[0.15em]">System Online</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold leading-tight">
                <span className="med-gradient-text">Clinical Intelligence</span>
              </h1>
              <p className="text-text-secondary mt-2 text-sm max-w-lg leading-relaxed">
                AI-powered medical report analysis with explainable clinical reasoning, knowledge graphs, and personalized risk assessment
              </p>
            </div>
            <Link to="/upload">
              <button className="group px-7 py-3.5 rounded-xl bg-gradient-to-r from-accent-blue to-accent-purple text-white font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-accent-blue/15 whitespace-nowrap relative overflow-hidden">
                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <span className="relative flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  Upload Report
                </span>
              </button>
            </Link>
          </div>

          {/* Pipeline capabilities */}
          <div className="mt-6 flex flex-wrap gap-2">
            {['OCR Extraction', 'NLP Processing', 'Abnormal Detection', 'Clinical Reasoning', 'Risk Scoring', 'Knowledge Graph', 'PDF Export'].map((s, i) => (
              <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent-green/[0.05] border border-accent-green/15 text-accent-green/80 text-xs font-medium">
                <span className="w-1 h-1 rounded-full bg-accent-green/60" />{s}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Animated Stat Cards ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6 fade-in">
        {stats.map((stat, i) => (
          <div key={i} className={`med-card border ${stat.border} cursor-default`}>
            <div className={`w-9 h-9 rounded-lg bg-current/[0.08] ${stat.color} flex items-center justify-center mb-3`}>
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={stat.icon} />
              </svg>
            </div>
            <div className={`text-2xl font-bold tabular-nums ${stat.color}`}>
              <AnimatedNumber target={stat.value} suffix={stat.suffix} />
            </div>
            <div className="text-[0.6rem] text-text-muted uppercase tracking-wider mt-1.5 font-medium">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ─── Category breakdown + KG ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4 fade-in">
        <div className="glass-card">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4">Insight Categories</h3>
          {Object.keys(catBreakdown).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(catBreakdown).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
                <div key={cat}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-text-secondary">{cat}</span>
                    <span className={`text-sm font-bold ${CATEGORY_TEXT[cat] || 'text-accent-blue'}`}>{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${CATEGORY_COLORS[cat] || 'bg-accent-blue'} transition-all duration-1000`}
                      style={{ width: `${(count / maxCatCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-muted text-center py-8 text-sm">Upload a report to see breakdown</p>
          )}
        </div>

        <div className="glass-card">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4">Knowledge Graph</h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: 'Nodes', value: a.knowledge_graph?.total_nodes ?? '96', color: 'text-accent-blue' },
              { label: 'Edges', value: a.knowledge_graph?.total_edges ?? '97', color: 'text-accent-purple' },
            ].map((s, i) => (
              <div key={i} className="text-center p-4 rounded-xl bg-white/[0.03] border border-border-subtle">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-[0.6rem] text-text-muted uppercase tracking-wider mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-border-subtle p-3 text-center text-xs text-text-muted mb-3">
            Diseases · Lab Tests · Symptoms · Medications
          </div>
          <div className="flex flex-wrap gap-2">
            {['13 Clinical Rules', '100+ Lab Tests', '130+ Aliases', '16+ Drug Pairs', 'Explainable AI'].map((badge, i) => (
              <span key={i} className="px-2.5 py-1 rounded-full border border-accent-blue/25 text-accent-blue text-xs">{badge}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Quick Actions ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 fade-in">
        <Link to="/upload" className="glass-card group hover:border-accent-blue/40 cursor-pointer transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-accent-blue/15 flex items-center justify-center">
              <svg className="w-5 h-5 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-accent-blue">Upload Report</div>
              <div className="text-xs text-text-muted">PDF lab analysis</div>
            </div>
          </div>
          <div className="text-xs text-text-muted">AI extracts 50+ biomarkers, detects abnormalities, and generates a clinical report.</div>
        </Link>

        <Link to="/drug-interactions" className="glass-card group hover:border-accent-purple/40 cursor-pointer transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-accent-purple/15 flex items-center justify-center">
              <svg className="w-5 h-5 text-accent-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-accent-purple">Drug Checker</div>
              <div className="text-xs text-text-muted">Interaction analysis</div>
            </div>
          </div>
          <div className="text-xs text-text-muted">Check for critical drug-drug and drug-lab interactions across 16+ known pairs.</div>
        </Link>

        <div className="glass-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-accent-teal/15 flex items-center justify-center">
              <svg className="w-5 h-5 text-accent-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-accent-teal">AI Chat</div>
              <div className="text-xs text-text-muted">Available in reports</div>
            </div>
          </div>
          <div className="text-xs text-text-muted">Open any report and use the floating chat button to ask questions about findings.</div>
        </div>
      </div>

      {/* ─── Recent Reports ─── */}
      <div className="glass-card fade-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Recent Reports</h3>
          {totalReportCount > 0 && <span className="text-xs text-text-muted">{totalReportCount} total</span>}
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-12 gap-3">
            <div className="spinner" />
            <p className="text-text-muted text-sm">Loading reports...</p>
          </div>
        ) : error ? (
          <div className="text-center py-6">
            <p className="text-accent-orange text-sm mb-1">{error}</p>
            <p className="text-text-muted text-xs">
              Run <code className="text-accent-blue">uvicorn main:app --reload</code> in the backend directory
            </p>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-text-muted mb-4 text-sm">No reports yet — upload your first PDF to get started</p>
            <Link to="/upload">
              <button className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-accent-blue to-accent-purple text-white text-sm font-medium hover:opacity-90 transition">
                Upload Report
              </button>
            </Link>
          </div>
        ) : (
          <>
          <table className="data-table">
            <thead>
              <tr>
                <th>Filename</th>
                <th>Type</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id}>
                  <td className="text-text-primary font-medium max-w-[180px] truncate">{report.filename}</td>
                  <td>
                    <span className="px-2 py-0.5 rounded text-xs bg-accent-blue/15 text-accent-blue">
                      {(report.document_type || 'unknown').replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      report.status === 'completed' ? 'bg-accent-green/15 text-accent-green' : 'bg-accent-orange/15 text-accent-orange'
                    }`}>
                      {report.status}
                    </span>
                  </td>
                  <td className="text-text-muted text-sm">
                    {report.created_at ? new Date(report.created_at).toLocaleDateString() : '-'}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <Link to={`/report/${report.id}`}>
                        <button className="px-3 py-1 rounded-md text-xs bg-accent-blue/10 border border-accent-blue/25 text-accent-blue hover:bg-accent-blue/20 transition">
                          View
                        </button>
                      </Link>
                      <a href={getReportPdfUrl(report.id)} target="_blank" rel="noopener noreferrer">
                        <button className="px-3 py-1 rounded-md text-xs border border-accent-red/30 text-accent-red hover:bg-accent-red/10 transition">
                          PDF
                        </button>
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border-subtle">
              <span className="text-xs text-text-muted">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg text-xs border border-border-subtle text-text-secondary hover:bg-white/5 transition disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                  const p = start + i;
                  return p <= totalPages ? (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition ${
                        p === page
                          ? 'bg-accent-blue text-white'
                          : 'border border-border-subtle text-text-secondary hover:bg-white/5'
                      }`}
                    >
                      {p}
                    </button>
                  ) : null;
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-lg text-xs border border-border-subtle text-text-secondary hover:bg-white/5 transition disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
          </>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
