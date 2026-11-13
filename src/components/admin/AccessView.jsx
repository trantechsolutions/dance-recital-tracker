import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { doc, getDoc } from 'firebase/firestore';
import { db, coll } from '../../firebase';
import { useApp } from '../../context/AppContext';
import {
  updateOrgAdmins, updateOrgStudioCode, generateStudioCode, updateOrgShowRunners,
} from '../../services/showService';
import { familyLink } from '../../utils/familyLink';

const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

// One place for who can get in and who can help: studio code + family link,
// admins, and show runners (move acts only, for the shows they're given).
export default function AccessView({ recitalData }) {
  const { orgId, orgName, isAuthorized, user } = useApp();
  const [invite, setInvite] = useState({ email: '', role: 'runner', show: 'all' });
  const [lastAdded, setLastAdded] = useState(null); // { email, role, shows }
  const [inviteCopied, setInviteCopied] = useState(false);
  const [org, setOrg] = useState(null);
  const [toast, setToast] = useState(null);
  const [codeDraft, setCodeDraft] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    getDoc(doc(db, coll('organizations'), orgId)).then(snap => {
      const data = snap.exists() ? snap.data() : {};
      setOrg({ admins: [], showRunners: [], studioCode: '', ...data });
      setCodeDraft(data.studioCode || '');
    }).catch(e => setToast({ type: 'error', message: e.message }));
  }, [orgId]);

  if (!isAuthorized) return <Navigate to="/admin" replace />;

  const flash = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };
  // Writes to the studio document; Firestore rules may limit these to the
  // super admin, in which case the error is shown as-is.
  const save = async (fn, patch, message) => {
    try {
      await fn();
      setOrg(o => ({ ...o, ...patch }));
      flash(message);
      return true;
    } catch (e) {
      flash(e?.code === 'permission-denied' ? 'You don’t have permission to change this. Ask the studio owner.' : e.message, 'error');
      return false;
    }
  };

  const shows = Object.values(recitalData || {});
  const showLabel = (id) => recitalData?.[id]?.label || id;

  if (!org) return <p className="text-ink-500 py-10 text-center">Loading…</p>;

  const code = (org.studioCode || '').trim();
  const saveCode = (next) => save(() => updateOrgStudioCode(orgId, next), { studioCode: next.trim().toLowerCase() }, next ? 'Studio code saved' : 'Studio code removed');

  const copyLink = async () => {
    await navigator.clipboard.writeText(familyLink(code));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendInvite = async (e) => {
    e.preventDefault();
    const email = invite.email.trim().toLowerCase();
    if (!isEmail(email)) return flash('Enter a full email address.', 'error');
    let ok;
    if (invite.role === 'admin') {
      if (org.admins.includes(email)) return flash('That person is already an admin.', 'error');
      const admins = [...org.admins, email];
      ok = await save(() => updateOrgAdmins(orgId, admins), { admins }, 'Admin added');
      if (ok) setLastAdded({ email, role: 'admin', shows: 'every show' });
    } else {
      const others = org.showRunners.filter(r => r.email !== email);
      const existing = org.showRunners.find(r => r.email === email);
      const shows = invite.show === 'all' ? [] : [...new Set([...(existing?.shows || []), invite.show])];
      const showRunners = [...others, { email, shows }];
      ok = await save(() => updateOrgShowRunners(orgId, showRunners), { showRunners }, 'Show runner added');
      if (ok) setLastAdded({ email, role: 'runner', shows: shows.length ? shows.map(showLabel).join(', ') : 'every show' });
    }
    if (ok) { setInvite(i => ({ ...i, email: '' })); setInviteCopied(false); }
  };

  // A ready-to-send message for the person just added.
  const inviteText = lastAdded && [
    `Hi! You've been added to the ${orgName || 'studio'} recital app as ${lastAdded.role === 'admin' ? 'an admin' : `a show runner for ${lastAdded.shows}`}.`,
    `Open this link and sign in with ${lastAdded.email}:`,
    familyLink(code),
    lastAdded.role === 'admin'
      ? 'Then open Admin from Settings.'
      : 'On show day, open Settings and tap "Run a show". One big Next button moves the program along for every parent.',
  ].join('\n');
  const copyInvite = async () => {
    await navigator.clipboard.writeText(inviteText);
    setInviteCopied(true);
  };

  const removeAdmin = (email) => {
    const admins = org.admins.filter(a => a !== email);
    save(() => updateOrgAdmins(orgId, admins), { admins }, 'Admin removed');
  };
  const removeRunner = (email) => {
    const showRunners = org.showRunners.filter(r => r.email !== email);
    save(() => updateOrgShowRunners(orgId, showRunners), { showRunners }, 'Show runner removed');
  };

  const people = [
    ...org.admins.map(email => ({ email, role: 'Admin', shows: 'All shows', remove: () => removeAdmin(email) })),
    ...org.showRunners.map(r => ({
      email: r.email, role: 'Show runner',
      shows: r.shows?.length ? r.shows.map(showLabel).join(', ') : 'All shows',
      remove: () => removeRunner(r.email),
    })),
  ];

  const inputCls = "h-11 w-full rounded-card border border-ink-300 dark:border-ink-600 bg-white dark:bg-ink-900 px-3 text-sm dark:text-white";

  return (
    <div className="space-y-8 animate-in fade-in">
      <header className="flex items-center gap-2">
        <Link to="/admin" aria-label="Back to admin" className="w-11 h-11 -ml-2 flex items-center justify-center rounded-card text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <p className="text-sm text-ink-500 dark:text-ink-400">Set up</p>
          <h2 className="font-display text-3xl font-medium dark:text-white">Access and show runners</h2>
        </div>
      </header>

      {/* Studio code + family link */}
      <section className="grid md:grid-cols-[240px_1fr] gap-4 md:gap-8 pb-8 border-b border-ink-200 dark:border-ink-700">
        <div>
          <h3 className="font-semibold dark:text-white">Studio code</h3>
          <p className="text-sm text-ink-600 dark:text-ink-400 mt-1">Families enter this once. Changing it asks new visitors for the new code.</p>
        </div>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="studio-code">Studio code</label>
            <input
              id="studio-code"
              value={codeDraft}
              onChange={(e) => setCodeDraft(e.target.value)}
              placeholder="No code: anyone signed in can view"
              className={clsx(inputCls, "max-w-[16rem] font-semibold tracking-wider uppercase")}
            />
            <button
              onClick={() => saveCode(codeDraft)}
              disabled={codeDraft.trim().toLowerCase() === code.toLowerCase()}
              className="h-11 px-4 rounded-card border border-ink-800 dark:border-ink-300 text-sm font-semibold dark:text-white disabled:opacity-40"
            >
              Save code
            </button>
            <button
              onClick={() => { const c = generateStudioCode(); setCodeDraft(c); saveCode(c); }}
              className="h-11 px-4 rounded-card border border-ink-300 dark:border-ink-600 text-sm dark:text-white"
            >
              Make a new code
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={copyLink}
              className="h-11 px-4 rounded-card bg-ink-900 dark:bg-white text-white dark:text-ink-900 text-sm font-semibold flex items-center gap-2"
            >
              {copied ? <><Check size={16} /> Link copied</> : 'Copy family link'}
            </button>
            <p className="text-sm text-ink-500 dark:text-ink-400">The link includes the code, so families who open it only need to sign in.</p>
          </div>
        </div>
      </section>

      {/* People */}
      <section className="grid md:grid-cols-[240px_1fr] gap-4 md:gap-8">
        <div>
          <h3 className="font-semibold dark:text-white">People who help</h3>
          <p className="text-sm text-ink-600 dark:text-ink-400 mt-1">Admins can change everything. Show runners can only move acts during the shows you give them.</p>
        </div>
        <div className="space-y-4">
          <ul className="divide-y divide-ink-100 dark:divide-ink-700 border-y border-ink-100 dark:border-ink-700">
            {people.length === 0 && <li className="py-3 text-sm text-ink-500">No one yet.</li>}
            {people.map(p => (
              <li key={`${p.role}-${p.email}`} className="py-3 grid sm:grid-cols-[1fr_8rem_1fr_auto] gap-x-4 gap-y-0.5 items-center text-sm dark:text-white">
                <span className="font-medium break-all">{p.email}</span>
                <span className="text-ink-600 dark:text-ink-300">{p.role}</span>
                <span className="text-ink-500 dark:text-ink-400">{p.shows}</span>
                {p.email === (user?.email || '').toLowerCase()
                  ? <span className="text-ink-500 text-xs">You</span>
                  : <button onClick={p.remove} className="justify-self-start sm:justify-self-end h-9 text-sm underline text-ink-600 dark:text-ink-300">Remove</button>}
              </li>
            ))}
          </ul>

          <form onSubmit={sendInvite} className="grid sm:grid-cols-[1fr_9rem_1fr_auto] gap-3 items-end p-4 rounded-card bg-ink-100 dark:bg-ink-800">
            <label className="text-sm font-semibold dark:text-white space-y-1.5">
              <span>Email</span>
              <input type="email" value={invite.email} onChange={(e) => setInvite(i => ({ ...i, email: e.target.value }))} placeholder="name@example.com" className={inputCls} />
            </label>
            <label className="text-sm font-semibold dark:text-white space-y-1.5">
              <span>Role</span>
              <select value={invite.role} onChange={(e) => setInvite(i => ({ ...i, role: e.target.value }))} className={inputCls}>
                <option value="runner">Show runner</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <label className="text-sm font-semibold dark:text-white space-y-1.5">
              <span>Shows</span>
              <select value={invite.role === 'admin' ? 'all' : invite.show} disabled={invite.role === 'admin'} onChange={(e) => setInvite(i => ({ ...i, show: e.target.value }))} className={inputCls}>
                <option value="all">All shows</option>
                {shows.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </label>
            <button type="submit" className="h-11 px-5 rounded-card bg-ink-900 dark:bg-white text-white dark:text-ink-900 text-sm font-semibold">
              Add person
            </button>
          </form>
          {lastAdded ? (
            <div className="p-4 rounded-card border border-ink-300 dark:border-ink-600 space-y-3">
              <p className="text-sm font-semibold dark:text-white">Let {lastAdded.email} know</p>
              <p className="text-sm text-ink-700 dark:text-ink-200 whitespace-pre-line break-words">{inviteText}</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={copyInvite} className="h-11 px-4 rounded-card bg-ink-900 dark:bg-white text-white dark:text-ink-900 text-sm font-semibold">
                  {inviteCopied ? 'Invite copied' : 'Copy invite'}
                </button>
                <a
                  href={`mailto:${encodeURIComponent(lastAdded.email)}?subject=${encodeURIComponent(`${orgName || 'Recital'} app`)}&body=${encodeURIComponent(inviteText)}`}
                  className="h-11 px-4 rounded-card border border-ink-800 dark:border-ink-300 text-sm font-semibold dark:text-white flex items-center"
                >
                  Email it
                </a>
                <button onClick={() => setLastAdded(null)} className="h-11 px-3 text-sm text-ink-600 dark:text-ink-300 underline">Done</button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-ink-500 dark:text-ink-400">They get access the next time they sign in with that email.</p>
          )}
        </div>
      </section>

      {toast && (
        <div role="status" className={clsx(
          "fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-5 py-3 rounded-card shadow-xl text-sm font-semibold",
          toast.type === 'error' ? "bg-red-600 text-white" : "bg-emerald-700 text-white"
        )}>
          {toast.type === 'error' ? <AlertCircle size={18} /> : <Check size={18} />}
          {toast.message}
        </div>
      )}
    </div>
  );
}
