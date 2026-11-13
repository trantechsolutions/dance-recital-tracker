// Search for the Find page. Dancers are searched across every show (following
// a dancer applies to all shows); acts are searched in the show being viewed.

const norm = (s) => (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// → [{ name, here: [{number,title}], elsewhere: [{showId, label, numbers:[]}] }]
// sorted with dancers in the current show first, then by name.
export function findDancers(recitalData, showId, query, nameFn = (n) => n) {
  const q = norm(query).trim();
  if (!q || !recitalData) return [];
  const map = new Map();
  Object.values(recitalData).forEach(show => {
    (show.acts || []).forEach(act => {
      (act.performers || []).forEach(name => {
        // Match on what the viewer can see, so a redacted surname can't be probed.
        if (!norm(nameFn(name)).includes(q)) return;
        if (!map.has(name)) map.set(name, { name, here: [], elsewhere: new Map() });
        const entry = map.get(name);
        if (show.id === showId) entry.here.push({ number: act.number, title: act.title });
        else {
          if (!entry.elsewhere.has(show.id)) entry.elsewhere.set(show.id, { showId: show.id, label: show.label, numbers: [] });
          entry.elsewhere.get(show.id).numbers.push(act.number);
        }
      });
    });
  });
  // Two different dancers can look identical once surnames are shortened
  // ("Ava K." and "Ava K."). Flag them so the parent checks the act numbers.
  const shownCount = new Map();
  const seenRaw = new Set();
  Object.values(recitalData).forEach(show => (show.acts || []).forEach(act => (act.performers || []).forEach(name => {
    if (seenRaw.has(name)) return;
    seenRaw.add(name);
    const shown = norm(nameFn(name));
    shownCount.set(shown, (shownCount.get(shown) || 0) + 1);
  })));

  return [...map.values()]
    .map(e => ({ ...e, elsewhere: [...e.elsewhere.values()], duplicate: (shownCount.get(norm(nameFn(e.name))) || 0) > 1 }))
    .sort((a, b) => (b.here.length > 0) - (a.here.length > 0) || a.name.localeCompare(b.name));
}

// Acts in this show by title or number (performer matches are covered by
// the dancer results above them).
export function findActs(showData, query) {
  const q = norm(query).trim();
  if (!q || !showData?.acts) return [];
  return showData.acts.filter(act => norm(act.title).includes(q) || String(act.number) === q);
}
