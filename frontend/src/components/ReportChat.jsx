import { useState, useRef, useEffect } from 'react';
import { sendChatMessage } from '../api';

const SUGGESTIONS = [
  'What are my most concerning findings?',
  'Explain my glucose levels',
  'What diet should I follow?',
  'Are there any urgent issues?',
  'Summarize the report simply',
];

function ReportChat({ reportId }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Hello! I'm your MedBios AI assistant. I've analyzed this report and I'm ready to answer questions about your lab values, explain findings, or suggest next steps. What would you like to know?",
      time: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, loading]);

  const handleSend = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg, time: new Date() }]);
    setLoading(true);

    try {
      const resp = await sendChatMessage(reportId, msg);
      setMessages(prev => [...prev, { role: 'assistant', text: resp.answer, time: new Date() }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: "I'm having trouble connecting to the reasoning engine. Please try again in a moment.",
        time: new Date(),
        error: true,
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const formatTime = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="glass-card flex flex-col h-[520px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent-green to-emerald-300 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-accent-green border-2 border-bg-card" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">AI Report Assistant</h3>
            <p className="text-[0.6rem] text-accent-green">Online · Analyzing your report</p>
          </div>
        </div>
        <span className="text-[0.55rem] text-text-muted">{messages.length - 1} messages</span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1 mb-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} fade-in`}>
            <div className="max-w-[85%]">
              <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-accent-green to-emerald-300 text-white rounded-br-sm'
                  : msg.error
                    ? 'bg-accent-red/10 border border-accent-red/20 text-accent-red rounded-bl-sm'
                    : 'bg-accent-green/5 border border-border-subtle text-text-secondary rounded-bl-sm'
              }`}>
                {msg.text}
              </div>
              <p className={`text-[0.55rem] text-text-muted mt-0.5 ${msg.role === 'user' ? 'text-right' : ''}`}>
                {formatTime(msg.time)}
              </p>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex justify-start fade-in">
            <div className="rounded-2xl rounded-bl-sm px-4 py-3 bg-accent-green/5 border border-border-subtle flex gap-1 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>

      {/* Suggestion Chips */}
      {messages.length <= 2 && !loading && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {SUGGESTIONS.map((q, i) => (
            <button
              key={i}
              onClick={() => handleSend(q)}
              className="px-2.5 py-1 rounded-full text-[0.65rem] border border-accent-green/25 text-accent-green hover:bg-accent-green/10 transition"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="relative mt-auto">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your results..."
          className="w-full bg-bg-primary/50 border border-border-subtle rounded-xl pl-4 pr-12 py-3 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-green transition-colors"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-accent-green/15 flex items-center justify-center text-accent-green hover:bg-accent-green/25 disabled:opacity-30 disabled:hover:bg-accent-green/15 transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </form>
    </div>
  );
}

export default ReportChat;
