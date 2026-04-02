import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';

function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Please fill in all fields'); return; }
    setLoading(true);
    setError('');

    await new Promise(r => setTimeout(r, 600));
    const result = login(email, password);
    if (!result.success) setError('Invalid credentials');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-bg-primary flex">
      {/* Left — Branding panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Layered background */}
        <div className="absolute inset-0 bg-gradient-to-br from-bg-secondary via-bg-primary to-bg-secondary" />
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-accent-blue/[0.06] blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-accent-purple/[0.05] blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-accent-teal/[0.03] blur-[80px]" />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{backgroundImage: 'linear-gradient(rgba(56,189,248,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.3) 1px, transparent 1px)', backgroundSize: '60px 60px'}}
        />

        <div className="relative z-10 flex flex-col justify-center px-16 max-w-xl">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-blue/20 to-accent-purple/20 border border-accent-blue/20 flex items-center justify-center">
              <svg className="w-6 h-6" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="14" stroke="url(#lg)" strokeWidth="2.5"/>
                <path d="M16 8v16M12 12h8M12 20h8" stroke="url(#lg)" strokeWidth="2" strokeLinecap="round"/>
                <defs>
                  <linearGradient id="lg" x1="0" y1="0" x2="32" y2="32">
                    <stop stopColor="#38bdf8"/><stop offset="1" stopColor="#a78bfa"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-accent-blue to-accent-purple bg-clip-text text-transparent">
              MedBios AI
            </span>
          </div>

          <h2 className="text-4xl font-bold text-text-primary leading-tight mb-4">
            Clinical Intelligence,<br />
            <span className="med-gradient-text">Powered by AI</span>
          </h2>
          <p className="text-text-secondary text-base leading-relaxed mb-10">
            Transform medical lab reports into actionable clinical insights with our AI-powered analysis platform trusted by healthcare professionals.
          </p>

          {/* Feature cards */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01', label: '100+ Lab Tests', desc: 'Comprehensive biomarker analysis' },
              { icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z', label: 'AI Reasoning', desc: '25+ clinical inference rules' },
              { icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z', label: 'Risk Scoring', desc: 'Per-organ risk assessment' },
              { icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', label: 'Secure', desc: 'HIPAA-compliant design' },
            ].map((feat, i) => (
              <div key={i} className="med-card !p-3.5 group">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-accent-blue/10 flex items-center justify-center shrink-0 group-hover:bg-accent-blue/15 transition">
                    <svg className="w-4.5 h-4.5 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={feat.icon} />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{feat.label}</p>
                    <p className="text-xs text-text-muted mt-0.5">{feat.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Trust indicator */}
          <div className="mt-10 flex items-center gap-3">
            <div className="flex -space-x-2">
              {['#38bdf8', '#a78bfa', '#34d399', '#fb923c'].map((color, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-bg-primary flex items-center justify-center text-xs font-bold text-white" style={{ background: color }}>
                  {['Dr', 'RN', 'MD', 'PA'][i]}
                </div>
              ))}
            </div>
            <p className="text-text-muted text-xs">Trusted by healthcare professionals worldwide</p>
          </div>
        </div>
      </div>

      {/* Right — Login form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative">
        {/* Background effects */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden lg:hidden">
          <div className="absolute top-1/4 -left-20 w-96 h-96 rounded-full bg-accent-blue/5 blur-[100px]" />
          <div className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full bg-accent-purple/5 blur-[100px]" />
        </div>

        <div className="relative w-full max-w-md page-enter">
          {/* Mobile logo */}
          <div className="text-center mb-8 lg:hidden">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-blue/15 to-accent-purple/15 border border-accent-blue/20 mb-4">
              <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="14" stroke="url(#lgm)" strokeWidth="2.5"/>
                <path d="M16 8v16M12 12h8M12 20h8" stroke="url(#lgm)" strokeWidth="2" strokeLinecap="round"/>
                <defs>
                  <linearGradient id="lgm" x1="0" y1="0" x2="32" y2="32">
                    <stop stopColor="#38bdf8"/><stop offset="1" stopColor="#a78bfa"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-accent-blue via-white to-accent-purple bg-clip-text text-transparent">
              MedBios AI
            </h1>
            <p className="text-text-muted text-sm mt-1">Clinical Intelligence Platform</p>
          </div>

          {/* Login Card */}
          <div className="glass-card !p-8 !rounded-2xl">
            <h2 className="text-xl font-bold text-text-primary mb-1">Welcome back</h2>
            <p className="text-text-muted text-sm mb-8">Sign in to access your clinical dashboard</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
                    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="doctor@hospital.com"
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-bg-elevated/50 border border-border-subtle text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-accent-blue/50 transition"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Password
                  </label>
                  <button type="button" className="text-[0.65rem] text-accent-blue hover:text-accent-blue/80 transition">
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
                    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-bg-elevated/50 border border-border-subtle text-text-primary placeholder-text-muted text-sm focus:outline-none focus:border-accent-blue/50 transition"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-accent-red/8 border border-accent-red/20 text-accent-red text-sm">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-accent-blue to-accent-purple text-white font-semibold hover:opacity-90 active:scale-[0.99] transition-all shadow-lg shadow-accent-blue/15 disabled:opacity-50 text-sm relative overflow-hidden group"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Authenticating...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            {/* Sign up link */}
            <p className="text-center text-sm text-text-muted mt-6 pt-5 border-t border-border-subtle">
              New to MedBios AI?{' '}
              <Link to="/signup" className="text-accent-blue font-semibold hover:text-accent-blue/80 transition">
                Create Account
              </Link>
            </p>
          </div>

          {/* Footer */}
          <p className="text-center text-text-muted text-[0.65rem] mt-6 leading-relaxed">
            For clinical decision support only. Not a substitute for professional medical judgment.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
