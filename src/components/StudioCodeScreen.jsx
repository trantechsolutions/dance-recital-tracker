import React, { useState, useRef } from 'react';
import { KeyRound, AlertCircle } from 'lucide-react';

const LEN = 8; // two groups of four, joined by a hyphen on submit
const sanitize = (s) => (s || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

// Shareable-passcode gate shown after the login screen. Entered as 8 segmented
// boxes (xxxx-xxxx) with full paste support. The code gates a studio; on a
// correct entry the account is remembered so it isn't re-prompted.
export default function StudioCodeScreen({ orgName, onSubmit, onSignOut }) {
  const [chars, setChars] = useState(Array(LEN).fill(''));
  const [error, setError] = useState('');
  const inputs = useRef([]);

  const focusBox = (i) => inputs.current[Math.max(0, Math.min(LEN - 1, i))]?.focus();

  const setChar = (i, ch) =>
    setChars((prev) => { const next = [...prev]; next[i] = ch; return next; });

  const handleChange = (i, e) => {
    setError('');
    const ch = sanitize(e.target.value).slice(-1);
    if (!ch) { setChar(i, ''); return; }
    setChar(i, ch);
    if (i < LEN - 1) focusBox(i + 1);
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace') {
      if (chars[i]) { setChar(i, ''); }
      else if (i > 0) { focusBox(i - 1); setChar(i - 1, ''); }
    } else if (e.key === 'ArrowLeft') { e.preventDefault(); focusBox(i - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); focusBox(i + 1); }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = sanitize(e.clipboardData.getData('text')).slice(0, LEN);
    if (!text) return;
    setError('');
    const next = Array(LEN).fill('');
    for (let k = 0; k < text.length; k++) next[k] = text[k];
    setChars(next);
    focusBox(text.length >= LEN ? LEN - 1 : text.length);
  };

  const filled = chars.every(Boolean);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const code = `${chars.slice(0, 4).join('')}-${chars.slice(4).join('')}`;
    if (!onSubmit(code)) {
      setError('That code isn’t right. Check with your studio and try again.');
      setChars(Array(LEN).fill(''));
      focusBox(0);
    }
  };

  const Box = (i) => (
    <input
      key={i}
      ref={(el) => (inputs.current[i] = el)}
      type="text"
      inputMode="text"
      autoCapitalize="none"
      autoComplete="off"
      spellCheck={false}
      maxLength={1}
      aria-label={`Studio code character ${i + 1}`}
      value={chars[i]}
      onChange={(e) => handleChange(i, e)}
      onKeyDown={(e) => handleKeyDown(i, e)}
      onPaste={handlePaste}
      onFocus={(e) => e.target.select()}
      className="w-9 h-12 sm:w-11 sm:h-14 bg-white dark:bg-ink-800 rounded-card border border-ink-200 dark:border-ink-700 text-center text-lg sm:text-xl font-bold font-mono uppercase dark:text-white outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
    />
  );

  return (
    <div className="min-h-screen bg-ink-50 dark:bg-ink-900 flex flex-col items-center justify-center p-6 transition-colors duration-300">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded-full flex items-center justify-center mx-auto mb-6">
            <KeyRound size={34} />
          </div>
          <h1 className="font-display text-4xl font-medium italic text-ink-900 dark:text-white tracking-tight mb-3 leading-none">
            {orgName ? orgName : 'Recital Program'}
          </h1>
          <p className="text-ink-500 dark:text-ink-400 text-base px-4 leading-relaxed">
            Enter the studio code to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-xs font-semibold text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-card">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div className="flex items-center justify-center gap-1.5 sm:gap-2">
            {[0, 1, 2, 3].map(Box)}
            <span className="w-3 text-center text-xl font-bold text-ink-300 dark:text-ink-600 select-none">-</span>
            {[4, 5, 6, 7].map(Box)}
          </div>

          <button
            type="submit"
            disabled={!filled}
            className="w-full py-4 bg-brand-600 text-white rounded-card font-semibold text-base hover:bg-brand-700 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            Continue
          </button>
        </form>

        <p className="text-center text-[11px] text-ink-400 font-medium pt-4">
          Don’t have a code? Ask your studio for access.
        </p>

        {onSignOut && (
          <button
            type="button"
            onClick={onSignOut}
            className="w-full text-center text-[11px] font-semibold text-ink-400 hover:text-ink-600 dark:hover:text-ink-300 transition-colors pt-3"
          >
            Sign out / use a different account
          </button>
        )}
      </div>
    </div>
  );
}
