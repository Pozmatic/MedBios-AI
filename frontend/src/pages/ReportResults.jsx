import { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { getReport, getReportPdfUrl, getRecommendations } from '../api';
import AbnormalFindings from '../components/AbnormalFindings';
import ClinicalInsights from '../components/ClinicalInsights';
import RiskScores from '../components/RiskScores';
import KnowledgeGraphViz from '../components/KnowledgeGraphViz';
import DoctorReport from '../components/DoctorReport';
import OrganSystemVis from '../components/OrganSystemVis';
import ReportChat from '../components/ReportChat';
import HealthScoreRing from '../components/HealthScoreRing';
import SystemRadarChart from '../components/SystemRadarChart';
import CriticalAlerts from '../components/CriticalAlerts';
import BiomarkerHeatmap from '../components/BiomarkerHeatmap';
import PatientSummaryCard from '../components/PatientSummaryCard';
import SkeletonLoader from '../components/SkeletonLoader';
import HealthRecommendations from '../components/HealthRecommendations';

function ReportResults() {
  const { id } = useParams();
  const location = useLocation();
  const [data, setData] = useState(location.state?.analysisData || null);
  const [loading, setLoading] = useState(!data);
  const [activeTab, setActiveTab] = useState('overview');
  const [chatOpen, setChatOpen] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const [recsLoading, setRecsLoading] = useState(false);

  useEffect(() => { if (!data && id) loadReport(); }, [id]);

  // Lazy-load recommendations when tab is selected
  useEffect(() => {
    if (activeTab === 'rx' && !recommendations && !recsLoading && id) {
      setRecsLoading(true);
      getRecommendations(id)
        .then(setRecommendations)
        .catch(() => setRecommendations({ recommendations: [], summary: 'Failed to load recommendations.' }))
        .finally(() => setRecsLoading(false));
    }
  }, [activeTab]);

  const loadReport = async () => {
    try {
      const result = await getReport(id);
      setData(result);
    } catch {
      console.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8 page-enter">
        <div className="h-6 w-20 rounded bg-white/[0.04] animate-pulse mb-2" />
        <div className="h-9 w-64 rounded bg-white/[0.04] animate-pulse mb-6" />
        <SkeletonLoader type="stats" />
        <SkeletonLoader type="hero" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonLoader type="card" />
          <SkeletonLoader type="card" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="glass-card text-center py-16">
          <svg className="w-12 h-12 mx-auto text-text-muted mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-text-muted mb-4">Report not found</p>
          <Link to="/" className="px-5 py-2 rounded-lg bg-gradient-to-r from-accent-green to-emerald-300 text-white text-sm font-medium">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const labValues = data.lab_values || [];
  const insights = data.insights || [];
  const riskScores = data.risk_scores || {};
  const graphData = data.knowledge_graph || null;
  const clinicalReport = data.clinical_report || {};
  const evidenceChains = data.evidence_chains || [];
  const graphRisks = data.graph_risks || [];
  const abnormalCount = data.abnormal_count || labValues.filter(l => l.status !== 'normal').length;
  const overallScore = riskScores.overall || 0;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'heatmap', label: 'Heatmap' },
    { id: 'findings', label: `Findings (${labValues.length})` },
    { id: 'insights', label: `Insights (${insights.length})` },
    { id: 'graph', label: 'Graph' },
    { id: 'rx', label: 'Recommendations' },
    { id: 'report', label: 'Report' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 page-enter">
      {/* Header */}
      <div className="slide-up mb-6">
        <Link to="/" className="inline-flex items-center gap-1 text-text-muted text-sm hover:text-accent-green transition group">
          <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Dashboard
        </Link>
        <div className="flex items-start justify-between mt-3 gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-accent-green via-white to-emerald-300 bg-clip-text text-transparent">
              Analysis Results
            </h1>
            <p className="text-text-secondary text-sm mt-0.5">
              {data.filename || 'Medical Report'} · {data.document_type?.replace('_', ' ') || 'Lab Report'} · {labValues.length} tests analyzed
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2.5 rounded-xl border border-border-subtle text-text-secondary text-sm font-medium hover:bg-accent-green/5 transition flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18.75 12h.008v.008h-.008V12zm-3 0h.008v.008h-.008V12z" />
              </svg>
              Print
            </button>
            <a href={getReportPdfUrl(id)} target="_blank" rel="noopener noreferrer">
              <button className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent-green to-emerald-300 text-white text-sm font-medium hover:opacity-90 active:scale-[0.97] transition-all flex items-center gap-2 shadow-lg shadow-accent-green/15">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Export PDF
              </button>
            </a>
          </div>
        </div>
      </div>

      {/* Critical Alerts Banner */}
      <CriticalAlerts labValues={labValues} insights={insights} />

      {/* Patient Summary */}
      <div className="mb-6 fade-in">
        <PatientSummaryCard
          patientInfo={data.patient_info}
          labValues={labValues}
          riskScores={riskScores}
          insights={insights}
        />
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1 fade-in">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-accent-green to-emerald-300 text-white shadow-lg shadow-accent-green/15'
                : 'border border-border-subtle text-text-secondary hover:bg-accent-green/5 hover:border-text-muted'
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div key={activeTab} className="page-enter">
        {activeTab === 'overview' && (
          <div className="stagger-children space-y-6">
            {/* Hero Row: Health Score Ring + Radar Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="glass-card flex flex-col items-center justify-center py-6">
                <HealthScoreRing score={overallScore} size={200} />
              </div>
              <div className="lg:col-span-2">
                <SystemRadarChart riskScores={riskScores} />
              </div>
            </div>

            {/* Findings + Organ Map Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <AbnormalFindings labValues={labValues} compact />
                  <RiskScores riskScores={riskScores} />
                </div>
                <ClinicalInsights insights={insights} evidenceChains={evidenceChains} compact />
              </div>
              <div className="min-h-[380px]">
                <OrganSystemVis riskScores={riskScores} />
              </div>
            </div>
          </div>
        )}
        {activeTab === 'heatmap' && <BiomarkerHeatmap labValues={labValues} />}
        {activeTab === 'findings' && <AbnormalFindings labValues={labValues} />}
        {activeTab === 'insights' && <ClinicalInsights insights={insights} evidenceChains={evidenceChains} graphRisks={graphRisks} />}
        {activeTab === 'graph' && <KnowledgeGraphViz graphData={graphData} graphRisks={graphRisks} />}
        {activeTab === 'rx' && (
          recsLoading ? <SkeletonLoader type="card" /> : <HealthRecommendations recommendations={recommendations} />
        )}
        {activeTab === 'report' && <DoctorReport report={clinicalReport} patientInfo={data.patient_info} />}
      </div>

      {/* AI Chat FAB */}
      <button
        onClick={() => setChatOpen(!chatOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-r from-accent-green to-emerald-300 text-white shadow-xl shadow-accent-green/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform z-50 focus:outline-none"
      >
        {chatOpen ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>

      {/* AI Chat Panel */}
      <div className={`fixed bottom-24 right-6 w-[360px] shadow-2xl shadow-black/60 z-50 transition-all duration-300 origin-bottom-right ${chatOpen ? 'scale-100 opacity-100' : 'scale-90 opacity-0 pointer-events-none'}`}>
        <ReportChat reportId={id} />
      </div>
    </div>
  );
}

export default ReportResults;
