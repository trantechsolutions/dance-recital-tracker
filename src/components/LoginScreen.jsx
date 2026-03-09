import React, { useState } from 'react';
import { User, AlertCircle } from 'lucide-react';
import { supabase } from '../supabase';

export default function LoginScreen({ onSkip }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState('');

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      let result;
      if (isRegistering) {
        result = await supabase.auth.signUp({ email, password });
      } else {
        result = await supabase.auth.signInWithPassword({ email, password });
      }
      
      if (result.error) throw result.error;
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError('');
    const { error } = await supabase.auth.signInWithOAuth({ 
      provider: 'google',
      options: {
        redirectTo: window.location.origin + (import.meta.env.BASE_URL || '/')
      }
    });
    if (error) setAuthError(error.message);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6 transition-colors duration-300">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-pink-100 dark:bg-pink-900/30 text-pink-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <User size={40} />
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Sign In</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium px-4">
            Create an account to securely save and sync your favorite dancers across all your devices.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-700">
          {authError && (
            <div className="mb-4 flex items-center gap-2 text-xs font-bold text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl">
              <AlertCircle size={16} /> {authError}
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <input 
                type="email" 
                placeholder="Email address" 
                required
                className="w-full bg-slate-50 dark:bg-slate-900 p-4 rounded-xl dark:text-white border-none outline-none focus:ring-2 focus:ring-pink-500"
                value={email} onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div>
              <input 
                type="password" 
                placeholder="Password" 
                required
                minLength={6}
                className="w-full bg-slate-50 dark:bg-slate-900 p-4 rounded-xl dark:text-white border-none outline-none focus:ring-2 focus:ring-pink-500"
                value={password} onChange={e => setPassword(e.target.value)}
              />
            </div>
            <button 
              type="submit"
              className="w-full py-4 bg-pink-600 text-white rounded-xl font-black transition-transform active:scale-95 shadow-lg shadow-pink-500/20"
            >
              {isRegistering ? "Create Account" : "Sign In"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button 
              type="button"
              onClick={() => { setIsRegistering(!isRegistering); setAuthError(''); }}
              className="text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
            >
              {isRegistering ? "Already have an account? Sign In" : "Need an account? Sign Up"}
            </button>
          </div>

          <div className="relative flex items-center py-6">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
            <span className="shrink-0 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Or</span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
          </div>

          <button 
            onClick={handleGoogleSignIn}
            className="w-full py-4 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors mb-4"
          >
            <User size={18} /> Continue with Google
          </button>
          
          <button 
            onClick={onSkip}
            className="w-full py-4 bg-transparent text-slate-500 dark:text-slate-400 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
          >
            Continue as Guest
          </button>
        </div>

      </div>
    </div>
  );
}