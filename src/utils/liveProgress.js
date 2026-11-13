// Shared "where are we in the show, and when is my dancer on" logic.
// Used by the docked LiveBar, the Program running order and My Night so all
// three tell the parent the same thing.
//
// Distances are counted by POSITION in the running order, not by act-number
// arithmetic, so gaps or renumbering in the program never skew "in N acts".

// Scroll the running order to the act on stage (ActCard marks it).
export const scrollToCurrentAct = () => {
  const el = document.querySelector('[data-current-act="true"]');
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

export const actKeyFor =(showId, number) =>
  showId ? `act-${showId}-${number}` : `act-${number}`;

// Every act the viewer follows — starred directly, or containing a starred
// dancer — in running order, annotated with which followed dancers are in it.
export function getMyActs(showData, favorites, showId) {
  if (!showData?.acts || !favorites || favorites.size === 0) return [];
  return showData.acts
    .map((act, index) => {
      const actKey = actKeyFor(showId, act.number);
      const favoritedDancers = act.performers?.filter(p => favorites.has(p)) || [];
      const isActFav = favorites.has(actKey);
      return { ...act, index, actKey, isActFav, favoritedDancers };
    })
    .filter(a => a.isActFav || a.favoritedDancers.length > 0);
}

// Phases, from the viewer's point of view:
//   'idle'     — show isn't being tracked (before curtain / intermission)
//   'none'     — tracked, but the viewer follows nothing in this show
//   'later'    — their next act is 3+ acts away
//   'soon'     — their next act is 2 acts away: time to head back
//   'next'     — their next act is up next
//   'onstage'  — one of their acts is on stage right now
//   'done'     — tracked, and all their acts have already been performed
export function getLiveStatus(showData, currentAct, favorites, showId) {
  const acts = showData?.acts || [];
  const myActs = getMyActs(showData, favorites, showId);
  const tracking = !!currentAct?.isTracking;

  const onStageIndex = tracking
    ? acts.findIndex(a => Number(a.number) === Number(currentAct.number))
    : -1;
  const onStage = onStageIndex >= 0 ? acts[onStageIndex] : null;
  const upNext = onStageIndex >= 0 ? acts[onStageIndex + 1] || null : null;

  // During intermission the act at currentAct.number has finished; everything
  // counts from it, so the first act after the break is "up next".
  const intermission = tracking && currentAct?.phase === 'intermission';
  const ended = !tracking && currentAct?.phase === 'ended';

  const base = { tracking, intermission, ended, onStage, onStageIndex, upNext, myActs, target: null, actsAway: null, headBackAfter: null };

  if (!tracking || onStageIndex < 0) {
    return { ...base, phase: 'idle', target: ended ? null : myActs[0] || null };
  }
  if (myActs.length === 0) return { ...base, phase: 'none' };

  const current = !intermission && myActs.find(a => a.index === onStageIndex);
  if (current) return { ...base, phase: 'onstage', target: current, actsAway: 0 };

  const target = myActs.find(a => a.index > onStageIndex);
  if (!target) return { ...base, phase: 'done' };

  const actsAway = target.index - onStageIndex;
  // Be in your seat with one act to spare: return once the act two places
  // before yours has finished.
  const headBackAfter = actsAway >= 3 ? acts[target.index - 2] : null;
  const phase = actsAway === 1 ? 'next' : actsAway === 2 ? 'soon' : 'later';
  return { ...base, phase, target, actsAway, headBackAfter };
}

// "Ava K." / "Ava K. and Mia T." / "3 of your dancers" / "Your act".
// `nameFn` renders a stored name for this viewer (privacy-aware).
export function whoLabel(target, nameFn = (n) => n) {
  const dancers = target?.favoritedDancers || [];
  if (dancers.length === 0) return { who: 'Your act', plural: false };
  if (dancers.length === 1) return { who: nameFn(dancers[0]), plural: false };
  if (dancers.length === 2) return { who: `${nameFn(dancers[0])} and ${nameFn(dancers[1])}`, plural: true };
  return { who: `${dancers.length} of your dancers`, plural: true };
}

// One plain-language instruction for the current phase — the line a parent in
// the lobby reads in two seconds. Returns null when there is nothing to say.
// `eta` is an optional "about 20 min" estimate (see showControl.minutesAway).
export function liveInstruction(status, nameFn, eta = null) {
  const { phase, target, actsAway, headBackAfter } = status;
  if (!target) return null;
  const { who, plural } = whoLabel(target, nameFn);
  const is = plural ? 'are' : 'is';
  const when = eta ? ` (${eta})` : '';
  switch (phase) {
    case 'onstage': return `${who} ${is} on stage now.`;
    case 'next':    return `${who} ${is} up next. Head to your seat now.`;
    case 'soon':    return `${who} ${is} on in 2 acts${when}. Head to your seat now.`;
    case 'later':   return `${who} ${is} on in ${actsAway} acts${when}. Head back after act ${headBackAfter.number}.`;
    default:        return null;
  }
}
