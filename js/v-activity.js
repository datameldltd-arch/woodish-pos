/* Activity: the employee feed. Who is selling what, who took which payment, what moved in the workshop. */
import { S, esc, by, money, iso, addDays, today, fmtTime, fmtDate } from './store.js';
import { $, avatar, ROLE } from './ui.js';

const ui = { who: 'all', type: 'all' };
const TYPES = [['all', 'Everything'], ['sale', 'Sales'], ['payment', 'Payments'], ['job', 'Workshop'], ['delivery', 'Deliveries'], ['catalogue', 'Catalogue']];
const TYPE_ICON = { sale: 'Sale', payment: 'Payment', job: 'Workshop', delivery: 'Delivery', catalogue: 'Catalogue', customer: 'Customer' };

export function render(root) {
  root.innerHTML = '<div class="page-head"><h2>Activity</h2><span class="mute">Live feed of everything your team does</span></div><div id="st"></div><div class="chips" id="wf" style="margin:14px 0 6px"></div><div class="chips" id="tf" style="margin-bottom:6px"></div><div id="fd"></div>';
  root.onclick = e => {
    const w = e.target.closest('[data-w]'), t = e.target.closest('[data-t]');
    if (w) ui.who = ui.who === w.dataset.w ? 'all' : w.dataset.w; if (t) ui.type = t.dataset.t; if (w || t) draw();
  };
  draw();
  function draw() {
    const td = today(), wk = iso(addDays(new Date(), -6)), mo = iso(addDays(new Date(), -29));
    const team = S.d.users.filter(u => u.active && (u.role === 'sales' || u.role === 'manager'));
    $('#st', root).innerHTML = `<div class="kpis">${team.map(u => {
      const mine = S.d.sales.filter(s => s.userId === u.id), sum = f => mine.filter(s => f(iso(s.at))).reduce((t, s) => t + s.total, 0), cnt = f => mine.filter(s => f(iso(s.at))).length;
      const last = S.d.events.find(e => e.userId === u.id);
      return `<button class="kpi" data-w="${u.id}" style="text-align:left;${ui.who === u.id ? 'border-color:var(--gold)' : ''}"><div class="row" style="justify-content:flex-start;gap:10px">${avatar(u, 30)}<div><b style="font:600 1rem var(--sans)">${esc(u.name)}</b><br><small>${ROLE[u.role]}</small></div></div>
        <div class="row" style="margin-top:12px"><small>Today</small><span><b class="num" style="display:inline;font-size:1.15rem">${money(sum(d => d === td))}</b> <em>${cnt(d => d === td)} sales</em></span></div>
        <div class="row"><small>7 days</small><span><b class="num" style="display:inline;font-size:1.05rem">${money(sum(d => d >= wk))}</b> <em>${cnt(d => d >= wk)}</em></span></div>
        <div class="row"><small>30 days</small><span><b class="num" style="display:inline;font-size:1.05rem">${money(sum(d => d >= mo))}</b> <em>${cnt(d => d >= mo)}</em></span></div>
        <em style="display:block;margin-top:6px">${last ? 'Last active ' + fmtDate(last.at) + ' ' + fmtTime(last.at) : ''}</em></button>`;
    }).join('')}</div>`;
    $('#wf', root).innerHTML = `<button class="chip ${ui.who === 'all' ? 'on' : ''}" data-w="all">All staff</button>` + S.d.users.filter(u => u.active).map(u => `<button class="chip ${ui.who === u.id ? 'on' : ''}" data-w="${u.id}">${esc(u.name)}</button>`).join('');
    $('#tf', root).innerHTML = TYPES.map(([id, l]) => `<button class="chip ${ui.type === id ? 'on' : ''}" data-t="${id}">${l}</button>`).join('');
    const evs = S.d.events.filter(e => (ui.who === 'all' || e.userId === ui.who) && (ui.type === 'all' || e.type === ui.type)).slice(0, 120);
    let day = '', html = '';
    evs.forEach(e => {
      const dk = iso(e.at), label = dk === td ? 'Today' : dk === iso(addDays(new Date(), -1)) ? 'Yesterday' : fmtDate(e.at);
      if (dk !== day) { day = dk; html += `<div class="day-h">${label}</div>`; }
      html += `<div class="ev">${avatar(by(S.d.users, e.userId), 32)}<div><b>${esc((by(S.d.users, e.userId) || { name: 'System' }).name)}</b> <span class="pill">${TYPE_ICON[e.type] || e.type}</span><br><span class="mute">${esc(e.text)}</span></div><span class="t">${fmtTime(e.at)}</span></div>`;
    });
    $('#fd', root).innerHTML = html ? `<div class="feed">${html}</div>` : '<div class="empty">No activity matches.</div>';
  }
}
