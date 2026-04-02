import { useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastProvider';

const THEMES = [
  { id: 'dark', label: 'Dark', preview: 'bg-[#0a0e17]' },
  { id: 'midnight', label: 'Midnight', preview: 'bg-[#0f172a]' },
  { id: 'abyss', label: 'Abyss', preview: 'bg-[#020617]' },
];

const ACCENT_COLORS = [
  { id: 'blue', label: 'Ocean', color: '#10b981' },
  { id: 'purple', label: 'Violet', color: '#34d399' },
  { id: 'green', label: 'Emerald', color: '#22c55e' },
  { id: 'cyan', label: 'Cyan', color: '#06b6d4' },
  { id: 'pink', label: 'Rose', color: '#ec4899' },
];

function Settings() {
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const [activeSection, setActiveSection] = useState('profile');
  const [selectedTheme, setSelectedTheme] = useState('dark');
  const [selectedAccent, setSelectedAccent] = useState('blue');
  const [notifications, setNotifications] = useState({
    criticalAlerts: true,
    reportReady: true,
    weeklyDigest: false,
    drugAlerts: true,
  });

  const sections = [
    { id: 'profile', label: 'Profile', icon: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0' },
    { id: 'appearance', label: 'Appearance', icon: 'M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42' },
    { id: 'notifications', label: 'Notifications', icon: 'M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0' },
    { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: 'M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z' },
    { id: 'about', label: 'About', icon: 'M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z' },
  ];

  const shortcuts = [
    { keys: ['Ctrl', 'U'], action: 'Upload Report' },
    { keys: ['Ctrl', 'D'], action: 'Go to Dashboard' },
    { keys: ['Ctrl', 'K'], action: 'Drug Checker' },
    { keys: ['Ctrl', 'P'], action: 'Print Report' },
    { keys: ['Esc'], action: 'Close Dialogs' },
    { keys: ['?'], action: 'Show Shortcuts' },
  ];

  const initials = user?.initials || user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 page-enter">
      <div className="slide-up mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-accent-green via-white to-emerald-300 bg-clip-text text-transparent">
          Settings
        </h1>
        <p className="text-text-secondary text-sm mt-0.5">Manage your account, preferences, and platform settings</p>
      </div>

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Sidebar */}
        <div className="lg:w-56 shrink-0">
          <div className="glass-card !p-2 space-y-0.5">
            {sections.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  activeSection === s.id
                    ? 'bg-accent-green/15 text-accent-green'
                    : 'text-text-secondary hover:text-text-primary hover:bg-accent-green/5'
                }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                </svg>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeSection === 'profile' && (
            <div className="space-y-6 fade-in">
              <div className="glass-card">
                <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">Profile Information</h3>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-green to-emerald-300 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-accent-green/20">
                    {initials}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-text-primary">{user?.name || 'User'}</h4>
                    <p className="text-text-muted text-sm">{user?.email || 'user@email.com'}</p>
                    <span className="text-[0.6rem] px-2 py-0.5 rounded-full bg-accent-green/15 text-accent-green font-medium mt-1 inline-block">{user?.role || 'Physician'}</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Full Name</label>
                    <input type="text" defaultValue={user?.name} className="w-full px-4 py-2.5 rounded-xl bg-accent-green/5 border border-border-subtle text-text-primary text-sm focus:outline-none focus:border-accent-green transition" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Email</label>
                    <input type="email" defaultValue={user?.email} className="w-full px-4 py-2.5 rounded-xl bg-accent-green/5 border border-border-subtle text-text-primary text-sm focus:outline-none focus:border-accent-green transition" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Role</label>
                    <input type="text" defaultValue={user?.role} className="w-full px-4 py-2.5 rounded-xl bg-accent-green/5 border border-border-subtle text-text-primary text-sm focus:outline-none focus:border-accent-green transition" readOnly />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Member Since</label>
                    <input type="text" defaultValue={new Date(user?.registeredAt || user?.loginTime).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} className="w-full px-4 py-2.5 rounded-xl bg-accent-green/5 border border-border-subtle text-text-muted text-sm" readOnly />
                  </div>
                </div>
                <button
                  onClick={() => addToast('Profile saved!', 'success')}
                  className="mt-4 px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent-green to-emerald-300 text-white text-sm font-medium hover:opacity-90 transition"
                >
                  Save Changes
                </button>
              </div>

              {/* Danger Zone */}
              <div className="glass-card border border-accent-red/20">
                <h3 className="text-sm font-semibold text-accent-red uppercase tracking-wider mb-3">Danger Zone</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-primary font-medium">Sign Out</p>
                    <p className="text-xs text-text-muted">End your current session</p>
                  </div>
                  <button onClick={logout} className="px-4 py-2 rounded-xl border border-accent-red/30 text-accent-red text-sm font-medium hover:bg-accent-red/10 transition">
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'appearance' && (
            <div className="space-y-6 fade-in">
              <div className="glass-card">
                <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">Theme</h3>
                <div className="grid grid-cols-3 gap-3">
                  {THEMES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => { setSelectedTheme(t.id); addToast(`Theme: ${t.label}`, 'info'); }}
                      className={`p-3 rounded-xl border transition ${selectedTheme === t.id ? 'border-accent-green bg-accent-green/10' : 'border-border-subtle hover:border-text-muted'}`}
                    >
                      <div className={`w-full h-16 rounded-lg ${t.preview} mb-2 ring-1 ring-white/5`} />
                      <span className="text-xs text-text-secondary font-medium">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="glass-card">
                <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">Accent Color</h3>
                <div className="flex gap-3">
                  {ACCENT_COLORS.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedAccent(c.id); addToast(`Accent: ${c.label}`, 'info'); }}
                      className={`flex flex-col items-center gap-2 px-4 py-3 rounded-xl border transition ${selectedAccent === c.id ? 'border-white/20 bg-accent-green/5' : 'border-transparent hover:bg-accent-green/[0.03]'}`}
                    >
                      <div className="w-8 h-8 rounded-full ring-2 ring-offset-2 ring-offset-bg-primary transition" style={{ background: c.color, ringColor: selectedAccent === c.id ? c.color : 'transparent' }} />
                      <span className="text-[0.6rem] text-text-muted">{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="glass-card fade-in">
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">Notification Preferences</h3>
              <div className="space-y-3">
                {[
                  { key: 'criticalAlerts', label: 'Critical Lab Alerts', desc: 'Get notified when critical values are detected', important: true },
                  { key: 'reportReady', label: 'Report Ready', desc: 'Notification when analysis is complete' },
                  { key: 'drugAlerts', label: 'Drug Interaction Alerts', desc: 'Alerts for dangerous drug combinations', important: true },
                  { key: 'weeklyDigest', label: 'Weekly Digest', desc: 'Summary of all reports analyzed this week' },
                ].map(n => (
                  <div key={n.key} className="flex items-center justify-between px-4 py-3 rounded-xl bg-accent-green/[0.03] border border-border-subtle">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-text-primary font-medium">{n.label}</span>
                        {n.important && <span className="text-[0.5rem] px-1.5 py-0.5 rounded bg-accent-red/15 text-accent-red font-bold uppercase">Important</span>}
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">{n.desc}</p>
                    </div>
                    <button
                      onClick={() => setNotifications(p => ({ ...p, [n.key]: !p[n.key] }))}
                      className={`w-11 h-6 rounded-full transition-colors relative ${notifications[n.key] ? 'bg-accent-blue' : 'bg-white/10'}`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${notifications[n.key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'shortcuts' && (
            <div className="glass-card fade-in">
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">Keyboard Shortcuts</h3>
              <div className="space-y-2">
                {shortcuts.map((s, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3 rounded-xl bg-accent-green/[0.03] border border-border-subtle">
                    <span className="text-sm text-text-primary">{s.action}</span>
                    <div className="flex gap-1">
                      {s.keys.map((k, j) => (
                        <kbd key={j} className="px-2.5 py-1 rounded-lg bg-accent-green/5 border border-border-subtle text-text-secondary text-xs font-mono shadow-sm">{k}</kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'about' && (
            <div className="space-y-6 fade-in">
              <div className="glass-card text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-green/15 to-emerald-300/15 border border-accent-green/20 mb-4">
                  <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none">
                    <circle cx="16" cy="16" r="14" stroke="url(#agrad)" strokeWidth="2.5"/>
                    <path d="M16 8v16M12 12h8M12 20h8" stroke="url(#agrad)" strokeWidth="2" strokeLinecap="round"/>
                    <defs><linearGradient id="agrad" x1="0" y1="0" x2="32" y2="32"><stop stopColor="#10b981"/><stop offset="1" stopColor="#34d399"/></linearGradient></defs>
                  </svg>
                </div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-accent-green to-emerald-300 bg-clip-text text-transparent">MedBios AI</h2>
                <p className="text-text-muted text-sm mt-1">Clinical Report Intelligence Platform</p>
                <p className="text-text-muted text-xs mt-0.5">Version 2.0.0 · Built for Humanity</p>
              </div>
              <div className="glass-card">
                <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Platform Stats</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { val: '100+', label: 'Lab Tests', color: 'text-accent-green' },
                    { val: '20', label: 'Clinical Rules', color: 'text-accent-green' },
                    { val: '30', label: 'Drug Pairs', color: 'text-accent-orange' },
                    { val: '65+', label: 'Drug Aliases', color: 'text-accent-green' },
                  ].map((s, i) => (
                    <div key={i} className="text-center px-3 py-3 rounded-xl bg-accent-green/[0.03] border border-border-subtle">
                      <div className={`text-lg font-bold ${s.color}`}>{s.val}</div>
                      <div className="text-[0.55rem] text-text-muted uppercase tracking-wider">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="glass-card">
                <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Tech Stack</h3>
                <div className="flex flex-wrap gap-2">
                  {['React 19', 'Vite', 'Tailwind v4', 'FastAPI', 'SQLAlchemy', 'PyMuPDF', 'Tesseract OCR', 'Recharts', 'ReportLab'].map(t => (
                    <span key={t} className="px-3 py-1.5 rounded-lg bg-accent-green/[0.03] border border-border-subtle text-text-muted text-xs">{t}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Settings;
