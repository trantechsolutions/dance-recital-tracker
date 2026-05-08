import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { clsx } from 'clsx';

export default function PerformerEditor({ performers = [], onChange }) {
  const [input, setInput] = useState('');

  const addPerformer = () => {
    const name = input.trim();
    if (!name || performers.includes(name)) { setInput(''); return; }
    onChange([...performers, name]);
    setInput('');
  };

  const removePerformer = (name) => {
    onChange(performers.filter(p => p !== name));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addPerformer(); }
  };

  return (
    <div className="space-y-2">
      {/* Chips */}
      {performers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {performers.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300 text-xs font-bold px-2.5 py-1 rounded-lg"
            >
              {name}
              <button
                type="button"
                onClick={() => removePerformer(name)}
                className="text-pink-400 hover:text-pink-700 dark:hover:text-pink-100 transition-colors ml-0.5"
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add performer name…"
          className="flex-1 px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 dark:text-white placeholder-slate-400 transition-all"
        />
        <button
          type="button"
          onClick={addPerformer}
          disabled={!input.trim()}
          className={clsx(
            "px-3 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1",
            input.trim()
              ? "bg-pink-600 text-white hover:bg-pink-700"
              : "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
          )}
        >
          <Plus size={14} /> Add
        </button>
      </div>
    </div>
  );
}
