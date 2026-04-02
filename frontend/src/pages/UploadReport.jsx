import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadReport } from '../api';
import { useToast } from '../components/ToastProvider';

const PIPELINE_STAGES = [
  { label: 'Uploading PDF', icon: 'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5' },
  { label: 'OCR Extraction', icon: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z' },
  { label: 'NLP Processing', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
  { label: 'Abnormal Detection', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
  { label: 'Clinical Reasoning', icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z' },
  { label: 'Risk Scoring', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { label: 'Knowledge Graph', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
  { label: 'Report Generation', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
];

function UploadReport() {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState(0);
  const [error, setError] = useState(null);
  const fileInputRef = useRef();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.type === 'application/pdf') {
      setFile(droppedFile);
      setError(null);
      addToast(`Selected: ${droppedFile.name}`, 'success');
    } else {
      setError('Only PDF files are supported');
      addToast('Please upload a PDF file', 'error');
    }
  };

  const handleFileSelect = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setError(null);
      addToast(`Selected: ${selected.name}`, 'success');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    setCurrentStage(0);
    addToast('Starting AI analysis pipeline...', 'info');

    const stageInterval = setInterval(() => {
      setCurrentStage(prev => {
        if (prev < PIPELINE_STAGES.length - 1) return prev + 1;
        clearInterval(stageInterval);
        return prev;
      });
    }, 1200);

    try {
      const data = await uploadReport(file, (p) => setProgress(p));
      clearInterval(stageInterval);
      setCurrentStage(PIPELINE_STAGES.length);
      addToast('Analysis complete! Redirecting to results...', 'success');
      setTimeout(() => {
        navigate(`/report/${data.report_id}`, { state: { analysisData: data } });
      }, 800);
    } catch (err) {
      clearInterval(stageInterval);
      const msg = err.response?.data?.detail || 'Upload failed. Is the backend running?';
      setError(msg);
      addToast(msg, 'error');
      setUploading(false);
    }
  };

  const removeFile = (e) => {
    e.stopPropagation();
    setFile(null);
    setError(null);
  };

  const overallProgress = uploading
    ? Math.round(((currentStage / PIPELINE_STAGES.length) * 70) + (progress * 0.3))
    : 0;

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 page-enter">
      <div className="slide-up mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-blue/15 to-accent-purple/15 border border-accent-blue/15 flex items-center justify-center">
            <svg className="w-5 h-5 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold med-gradient-text">
              Upload Medical Report
            </h1>
            <p className="text-text-secondary text-sm">Upload a PDF lab report for AI-powered clinical analysis</p>
          </div>
        </div>
      </div>

      {!uploading ? (
        <div className="stagger-children space-y-4">
          {/* Drop zone */}
          <div
            className={`glass-card border-2 border-dashed text-center cursor-pointer transition-all duration-300 ${
              dragOver
                ? 'border-accent-blue bg-accent-blue/5 scale-[1.01]'
                : file
                  ? 'border-accent-green/40 bg-accent-green/5'
                  : 'border-border-subtle hover:border-text-muted'
            }`}
            style={{ padding: file ? '2rem' : '3.5rem 2rem' }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {!file ? (
              <>
                <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-accent-blue/10 to-accent-purple/10 border border-accent-blue/10 flex items-center justify-center float-anim">
                  <svg className="w-10 h-10 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <p className="text-text-primary font-semibold text-lg mb-1">Drop your lab report here</p>
                <p className="text-text-muted text-sm mb-4">PDF format supported — up to 50MB</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {['Blood Work', 'Metabolic Panel', 'CBC', 'Lipid Profile', 'Thyroid', 'Kidney Function'].map((t, i) => (
                    <span key={i} className="px-3 py-1 rounded-full bg-bg-elevated/50 border border-border-subtle text-text-muted text-xs font-medium">{t}</span>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-accent-green/15 flex items-center justify-center shrink-0">
                  <svg className="w-7 h-7 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-text-primary font-medium truncate">{file.name}</p>
                  <p className="text-text-muted text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB · PDF Document</p>
                </div>
                <button
                  onClick={removeFile}
                  className="w-8 h-8 rounded-lg hover:bg-accent-red/15 flex items-center justify-center text-text-muted hover:text-accent-red transition shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-accent-red/10 border border-accent-red/30 text-accent-red text-sm">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {file && (
            <button
              onClick={handleUpload}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-accent-blue to-accent-purple text-white font-semibold hover:opacity-90 active:scale-[0.99] transition-all shadow-lg shadow-accent-blue/20 text-base"
            >
              Analyze Report with AI
            </button>
          )}

          {/* Pipeline info */}
          <div className="glass-card !p-4">
            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Analysis Pipeline</h4>
            <div className="flex flex-wrap gap-2">
              {PIPELINE_STAGES.map((stage, i) => (
                <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border-subtle text-text-muted text-xs">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={stage.icon} />
                  </svg>
                  {stage.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Processing View */
        <div className="glass-card fade-in">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Analysis Pipeline</h3>
            <span className="text-xs font-bold text-accent-blue tabular-nums">{overallProgress}%</span>
          </div>

          {/* Overall progress bar */}
          <div className="h-2 rounded-full bg-white/5 overflow-hidden mb-6">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent-blue to-accent-purple transition-all duration-500 relative"
              style={{ width: `${overallProgress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
            </div>
          </div>

          {/* Pipeline stages */}
          <div className="space-y-2">
            {PIPELINE_STAGES.map((stage, i) => {
              const done = i < currentStage;
              const active = i === currentStage;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    done ? 'bg-accent-green/5' : active ? 'bg-accent-blue/5' : ''
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    done ? 'bg-accent-green text-white'
                    : active ? 'bg-accent-blue text-white'
                    : 'bg-white/5 text-text-muted'
                  }`}>
                    {done ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : active ? (
                      <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : (
                      <span className="text-xs font-bold">{i + 1}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm font-medium ${
                      done ? 'text-accent-green' : active ? 'text-accent-blue' : 'text-text-muted'
                    }`}>
                      {stage.label}
                    </span>
                    {active && (
                      <p className="text-text-muted text-xs mt-0.5">Processing...</p>
                    )}
                  </div>
                  {done && <span className="text-xs text-accent-green/70">Done</span>}
                </div>
              );
            })}
          </div>

          {currentStage === PIPELINE_STAGES.length && (
            <div className="mt-6 text-center py-4 rounded-xl bg-accent-green/10 border border-accent-green/30">
              <p className="text-accent-green font-semibold">Analysis Complete</p>
              <p className="text-text-muted text-xs mt-1">Redirecting to results...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default UploadReport;
