import React, { useState } from 'react';
import { Music, ChevronDown, AlertCircle } from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getAuthErrorMessage } from '../utils/authErrors';

export default function LoginScreen({ onSkip }) {
  const [showSignIn, setShowSignIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState('');

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setAuthError(getAuthErrorMessage(err.code));
    }
  };

  return (
    <div className="min-h-screen bg-ink-50 dark:bg-ink-900 flex flex-col items-center justify-center p-6 transition-colors duration-300">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">

        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded-full flex items-center justify-center mx-auto mb-6">
            <Music size={36} />
          </div>
          <h1 className="font-display text-5xl font-medium italic text-ink-900 dark:text-white tracking-tight mb-3 leading-none">
            Welcome
          </h1>
          <p className="text-ink-500 dark:text-ink-400 text-base px-4 leading-relaxed">
            {onSkip
              ? 'Browse the full recital program — no account needed.'
              : 'Sign in to view the recital program.'}
          </p>
        </div>

        <div className="space-y-3">
          {/* Primary CTA — Guest (only when guest browsing is allowed) */}
          {onSkip && (
            <button
              onClick={onSkip}
              className="w-full py-4 bg-brand-600 text-white rounded-card font-semibold text-base hover:bg-brand-700 active:scale-[0.98] transition-all"
            >
              Browse Program
            </button>
          )}

          {/* Google sign-in */}
          <button
            onClick={async () => {
              setAuthError('');
              try {
                await signInWithPopup(auth, googleProvider);
              } catch (err) {
                if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
                  setAuthError(getAuthErrorMessage(err.code));
                }
              }
            }}
            className="w-full py-3.5 bg-white dark:bg-ink-800 text-ink-700 dark:text-white rounded-card font-semibold border border-ink-200 dark:border-ink-700 flex items-center justify-center gap-2 hover:bg-ink-50 dark:hover:bg-ink-700 transition-colors shadow-sm"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* Expandable email sign-in */}
          <div className="bg-white dark:bg-ink-800 rounded-card border border-ink-200 dark:border-ink-700 shadow-sm overflow-hidden">
            <button
              onClick={() => setShowSignIn(!showSignIn)}
              className="w-full px-5 py-4 flex items-center justify-between text-ink-500 dark:text-ink-400 font-semibold text-sm hover:bg-ink-50 dark:hover:bg-ink-700/50 transition-colors"
            >
              <span>Sign in with email</span>
              <ChevronDown size={16} className={`transition-transform duration-200 ${showSignIn ? 'rotate-180' : ''}`} />
            </button>

            {showSignIn && (
              <div className="px-5 pb-5 border-t border-ink-100 dark:border-ink-700 pt-4 space-y-3 animate-in slide-in-from-top-1 duration-150">
                {authError && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-card">
                    <AlertCircle size={16} /> {authError}
                  </div>
                )}

                <form onSubmit={handleEmailAuth} className="space-y-3">
                  <input
                    type="email"
                    placeholder="Email address"
                    required
                    autoComplete="email"
                    className="w-full bg-ink-50 dark:bg-ink-900 p-3.5 rounded-card dark:text-white border border-ink-200 dark:border-ink-700 outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm transition-all"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    required
                    minLength={6}
                    autoComplete={isRegistering ? 'new-password' : 'current-password'}
                    className="w-full bg-ink-50 dark:bg-ink-900 p-3.5 rounded-card dark:text-white border border-ink-200 dark:border-ink-700 outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm transition-all"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="w-full py-3.5 bg-brand-600 text-white rounded-card font-semibold transition-transform active:scale-95 shadow-lg shadow-brand-500/20"
                  >
                    {isRegistering ? 'Create Account' : 'Sign In'}
                  </button>
                </form>

                <button
                  type="button"
                  onClick={() => { setIsRegistering(!isRegistering); setAuthError(''); }}
                  className="w-full text-sm font-semibold text-ink-500 hover:text-ink-800 dark:hover:text-white transition-colors py-1"
                >
                  {isRegistering ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
                </button>
              </div>
            )}
          </div>

          <p className="text-center text-[11px] text-ink-400 font-medium pt-1">
            Sign in to save and sync favorites across devices
          </p>
        </div>
      </div>
    </div>
  );
}
