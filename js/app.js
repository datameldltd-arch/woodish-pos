/* App shell: login, role-aware navigation, view loader. */
import { S, load, login, logout, esc, resetDemo, onChange, by, today, fmtDate } from './store.js';
import { $, $$, avatar, ROLE, toast, modal } from './ui.js';
import { balanceOf, dueOverdue } from './logic.js';

const NAV = [
  { id: 'sell', label: 'Sell', icon: 'M5 8h14l-1.2 11H6.2zM9 8V6a3 3 0 0 1 6 0v2', roles: ['owner', 'manager', 'sales'] },
  { id: 'sales', label: 'Invoices', icon: 'M7 3h8l4 4v14H7zM15 3v4h4M10 12h6M10 16h6', roles: ['owner', 'manager', 'sales'] },
  { id: 'orders', label: 'Workshop', icon: 'M14 6l4 4-9 9H5v-4zM12 8l4 4', roles: ['owner', 'manager', 'sales', 'workshop'] },
  { id: 'deliveries', label: 'Deliveries', icon: 'M2 6h12v10H2zM14 10h4l3 3v3h-7zM6 19a2 2 0 1 0 0-.01M17 19a2 2 0 1 0 0-.01', roles: ['owner', 'manager', 'sales'] },
  { id: 'instalments', label: 'Instalments', icon: 'M3 7h18v12H3zM3 11h18M7 15h4', roles: ['owner', 'manager', 'sales'] },
  { id: 'catalogue', label: 'Catalogue', icon: 'M4 5h7v7H4zM13 5h7v7h-7zM4 14h7v5H4zM13 14h7v5h-7z', roles: ['owner', 'manager', 'sales', 'workshop'] },
  { id: 'customers', label: 'Customers', icon: 'M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM5 20a7 7 0 0 1 14 0', roles: ['owner', 'manager', 'sales'] },
  { id: 'activity', label: 'Activity', icon: 'M3 12h4l3-8 4 16 3-8h4', roles: ['owner', 'manager'] },
  { id: 'reports', label: 'Reports', icon: 'M5 20V10M12 20V4M19 20v-7', roles: ['owner', 'manager'] },
  { id: 'team', label: 'Team & settings', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2-1-1-3-2 .5-1.5-1.5L17 5l-3-1-1 2h-2L10 4 7 5l.5 2L6 8.5 4 8l-1 3 2 1v2l-2 1 1 3 2-.5L7.5 19 7 21l3 1 1-2h2l1 2 3-1-.5-2 1.5-1.5 2 .5 1-3-2-1z', roles: ['owner'] }
];
const view = { id: null, mod: null };
const canSee = id => NAV.find(n => n.id === id && n.roles.includes(S.user.role));

async function show(id, arg) {
  if (!canSee(id)) id = NAV.find(n => n.roles.includes(S.user.role)).id;
  view.id = id; sessionStorage.setItem('wf.view', id);
  $$('.rail a').forEach(a => a.classList.toggle('on', a.dataset.v === id));
  const main = $('#main'); main.innerHTML = '<div class="loading">Loading</div>';
  const mod = await import(`./v-${id}.js`);
  view.mod = mod; main.innerHTML = ''; main.scrollTop = 0;
  mod.render(main, arg);
}
export const go = (id, arg) => { history.replaceState(null, '', '#' + id); return show(id, arg); };
window.addEventListener('hashchange', () => S.user && show(location.hash.slice(1)));

function clock() { const el = $('#clock'); if (el) el.textContent = new Date().toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }

function badges() {
  if (!S.user) return;
  const over = S.d.sales.filter(s => dueOverdue(s).length).length;
  const jobs = S.d.jobs.filter(j => j.status === 'ready').length;
  const set = (id, n) => { const a = $(`.rail a[data-v="${id}"] .bd`); if (a) { a.textContent = n || ''; a.hidden = !n; } };
  set('instalments', over); set('orders', jobs);
}

function shell() {
  const u = S.user;
  $('#app').innerHTML = `<div class="shell">
    <header class="top"><img src="assets/logo-word.png" alt="Woodish" height="30"><span class="demo-tag">DEMO &middot; sample data</span><span class="grow"></span>
      <span class="clock" id="clock"></span>
      <button class="who-btn" id="whoBtn">${avatar(u, 32)}<span><b>${esc(u.name)}</b><small>${ROLE[u.role]}</small></span></button></header>
    <nav class="rail">${NAV.filter(n => n.roles.includes(u.role)).map(n => `<a href="#${n.id}" data-v="${n.id}"><svg viewBox="0 0 24 24"><path d="${n.icon}"/></svg><span>${n.label}</span><i class="bd" hidden></i></a>`).join('')}</nav>
    <main id="main" class="main"></main></div>`;
  $('#whoBtn').onclick = () => modal({ title: u.name, html: `<p class="mute">${ROLE[u.role]} &middot; signed in on this device</p>`, actions: [
    ...(u.role === 'owner' ? [{ label: 'Reset demo data', cls: 'ghost', onClick: async () => { await resetDemo(); logout(); location.hash = ''; location.reload(); } }] : []),
    { label: 'Switch user / sign out', cls: 'gold', onClick: () => { logout(); renderLogin(); } }] });
  clock(); badges();
}

function renderLogin() {
  let sel = null, pin = '';
  const users = S.d.users.filter(u => u.active);
  $('#app').innerHTML = `<div class="login"><div class="login-card">
    <img src="assets/logo-word.png" alt="Woodish" height="46"><h1>Who is working?</h1>
    <div class="login-users">${users.map(u => `<button data-u="${u.id}">${avatar(u, 54)}<b>${esc(u.name)}</b><small>${ROLE[u.role]}</small></button>`).join('')}</div>
    <div class="login-pin" hidden><p id="lp" class="mute"></p><div class="pin-dots">${'<i></i>'.repeat(4)}</div><div class="pin-err"></div>
      <div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '<'].map(k => `<button type="button" data-k="${k}">${k === '<' ? '&#9003;' : k}</button>`).join('')}</div>
      <button class="link" id="back">Choose someone else</button></div>
    <p class="demo-hint">Demo PINs: Owner 1111 &middot; Manager 2222 &middot; Sales 3333, 4444, 5555 &middot; Carpenter 6666</p></div></div>`;
  const card = $('.login-card'), pinBox = $('.login-pin'), dots = $$('.pin-dots i', card), err = $('.pin-err', card);
  card.addEventListener('click', e => {
    const ub = e.target.closest('[data-u]');
    if (ub) { sel = by(S.d.users, ub.dataset.u); pin = ''; $('.login-users').hidden = true; pinBox.hidden = false; $('#lp').textContent = `Enter PIN for ${sel.name}`; dots.forEach(d => d.classList.remove('f')); return; }
    if (e.target.id === 'back') { $('.login-users').hidden = false; pinBox.hidden = true; return; }
    const kb = e.target.closest('[data-k]'); if (!kb || !sel) return; const k = kb.dataset.k;
    if (k === 'C') pin = ''; else if (k === '<') pin = pin.slice(0, -1); else if (pin.length < 4) pin += k;
    dots.forEach((d, i) => d.classList.toggle('f', i < pin.length)); err.textContent = '';
    if (pin.length === 4) {
      if (pin === sel.pin) { login(sel); enter(); }
      else { err.textContent = 'Wrong PIN, try again'; pin = ''; setTimeout(() => dots.forEach(d => d.classList.remove('f')), 250); }
    }
  });
}

function enter() {
  shell();
  const want = location.hash.slice(1) || sessionStorage.getItem('wf.view') || '';
  show(NAV.find(n => n.id === want && n.roles.includes(S.user.role)) ? want : (S.user.role === 'workshop' ? 'orders' : 'sell'));
}

(async function boot() {
  await load();
  setInterval(clock, 20000);
  onChange(badges);
  S.user ? enter() : renderLogin();
})();
