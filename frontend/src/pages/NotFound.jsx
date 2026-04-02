import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-16 text-center page-enter relative overflow-hidden">
      {/* Floating decorative elements */}
      <div className="absolute top-20 left-1/4 w-2 h-2 rounded-full bg-accent-blue/30 animate-bounce" style={{ animationDuration: '3s' }} />
      <div className="absolute top-32 right-1/3 w-1.5 h-1.5 rounded-full bg-accent-green/30 animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }} />
      <div className="absolute bottom-24 left-1/3 w-1 h-1 rounded-full bg-accent-green/30 animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }} />

      {/* Large 404 with animated gradient */}
      <div className="relative inline-block mb-6">
        <span className="text-[9rem] sm:text-[12rem] font-black leading-none bg-gradient-to-b from-accent-blue/20 via-accent-purple/10 to-transparent bg-clip-text text-transparent select-none">
          404
        </span>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent-green/10 to-emerald-300/10 flex items-center justify-center backdrop-blur-sm border border-white/5">
            <svg className="w-12 h-12 text-accent-green/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
        </div>
      </div>

      <h1 className="text-2xl font-bold text-text-primary mb-2">Page Not Found</h1>
      <p className="text-text-muted text-sm mb-8 max-w-md mx-auto leading-relaxed">
        The page you're looking for doesn't exist or has been moved.
        Let's get you back on track.
      </p>

      <div className="flex justify-center gap-3 mb-12">
        <Link to="/">
          <button className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-accent-green to-emerald-300 text-white text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-accent-green/20 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            Dashboard
          </button>
        </Link>
        <Link to="/upload">
          <button className="px-6 py-2.5 rounded-xl border border-border-subtle text-text-secondary text-sm font-medium hover:bg-accent-green/5 transition flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            Upload Report
          </button>
        </Link>
      </div>

      {/* Quick navigation pills */}
      <div className="flex flex-wrap justify-center gap-2">
        {[
          { to: '/drug-interactions', label: 'Drug Checker', icon: '💊' },
          { to: '/settings', label: 'Settings', icon: '⚙️' },
        ].map(link => (
          <Link key={link.to} to={link.to} className="px-4 py-2 rounded-full border border-border-subtle text-text-muted text-xs hover:text-text-primary hover:border-text-muted hover:bg-accent-green/[0.03] transition flex items-center gap-1.5">
            <span>{link.icon}</span>
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default NotFound;
