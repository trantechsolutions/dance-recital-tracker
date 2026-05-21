import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import LiveTrackerHero from './components/program/LiveTrackerHero';
import ActCard from './components/program/ActCard';
import StickyHeader from './components/ui/StickyHeader';

const MOCK_ACTS = [
  { number: 1, title: 'Opening Overture', performers: ['Emma R.', 'Sofia L.', 'Mia K.', 'Lily P.', 'Ava C.', 'Chloe B.'] },
  { number: 2, title: 'Swan Lake — Variation', performers: ['Olivia M.', 'Isabella H.'] },
  { number: 3, title: 'Tap Tap Boom', performers: ['Ethan T.', 'Noah W.', 'Lucas A.'] },
  { number: 4, title: 'Moonlight Adagio', performers: ['Charlotte D.', 'Amelia F.', 'Harper G.', 'Evelyn S.'] },
  { number: 5, title: 'Jazz Funk Crew', performers: ['Mason J.', 'Liam V.', 'Henry Q.', 'Owen N.', 'Wyatt R.', 'Carter Y.', 'Jack U.'] },
  { number: 6, title: 'Hip-Hop Heat', performers: ['Layla X.', 'Aria Z.', 'Penelope O.', 'Riley E.'] },
  { number: 7, title: 'The Nutcracker — Sugar Plum', performers: ['Scarlett I.', 'Grace W.'] },
];

const SHOW_ID = 'spring-2026';
const FAVORITES = new Set([`act-${SHOW_ID}-2`, 'Mason J.']);
const CURRENT = { number: 4, title: 'Moonlight Adagio', isTracking: true };

function Preview() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-ink-50 dark:bg-ink-900 text-ink-900 dark:text-ink-100 transition-colors">
        <StickyHeader currentAct={CURRENT} isAuthorized={true} onUpdate={() => {}} />
        <div className="max-w-2xl mx-auto px-5 pt-20 pb-12">
          <header className="mb-6">
            <h1 className="font-display text-3xl font-medium text-brand-700 dark:text-brand-400 tracking-tight leading-tight capitalize">
              Dancer's Pointe Studio
            </h1>
            <p className="text-ink-400 text-[11px] font-medium uppercase tracking-marquee mt-1.5">Recital Program</p>
          </header>

          <LiveTrackerHero
            currentAct={CURRENT}
            favorites={FAVORITES}
            showData={{ acts: MOCK_ACTS }}
            showId={SHOW_ID}
          />

          <div className="flex items-baseline justify-between mb-4 px-0.5">
            <h2 className="font-display text-2xl font-medium italic text-ink-900 dark:text-white">
              Spring Showcase 2026
            </h2>
            <span className="text-xs text-ink-400 font-medium">
              {MOCK_ACTS.length} acts · 28 performers
            </span>
          </div>

          <div className="space-y-3">
            {MOCK_ACTS.map(act => (
              <ActCard
                key={act.number}
                act={act}
                isCurrent={act.number === CURRENT.number}
                favorites={FAVORITES}
                toggleFavorite={() => {}}
                onClick={() => {}}
                showId={SHOW_ID}
              />
            ))}
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
}

const params = new URLSearchParams(window.location.search);
if (params.get('theme') === 'dark') {
  document.documentElement.classList.add('dark');
}

ReactDOM.createRoot(document.getElementById('root')).render(<Preview />);
