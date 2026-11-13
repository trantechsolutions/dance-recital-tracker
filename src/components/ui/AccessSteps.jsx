import React from 'react';
import { Check } from 'lucide-react';
import { clsx } from 'clsx';

// "Step 1 of 2" for getting in: sign in, then the studio code. Shown on both
// screens so families know how many steps there are.
// step: 1 (signing in) | 2 (entering the code). codeFromLink: the family link
// already carries the code, so step 2 will happen on its own.
export default function AccessSteps({ step, codeFromLink }) {
  const items = [
    { n: 1, label: 'Sign in', hint: 'So your dancers and notes follow you to any phone' },
    { n: 2, label: 'Studio code', hint: codeFromLink ? 'Added from your link' : 'From your studio' },
  ];
  return (
    <ol className="space-y-2 mb-6" aria-label="Steps to get in">
      {items.map(item => {
        const done = item.n < step || (item.n === 2 && codeFromLink && step === 1);
        const current = item.n === step;
        return (
          <li
            key={item.n}
            aria-current={current ? 'step' : undefined}
            className={clsx(
              "flex items-center gap-3 px-4 py-3 rounded-card",
              current ? "border-2 border-ink-900 dark:border-white bg-white dark:bg-ink-800" : "bg-ink-100 dark:bg-ink-800/60"
            )}
          >
            <span className={clsx(
              "w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold shrink-0",
              done ? "bg-ink-900 dark:bg-white text-white dark:text-ink-900" : "border-2 border-ink-400 dark:border-ink-500 text-ink-700 dark:text-ink-200"
            )}>
              {done ? <Check size={14} aria-label="Done" /> : item.n}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink-900 dark:text-white">{item.label}</span>
              <span className="block text-xs text-ink-500 dark:text-ink-400">{item.hint}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
