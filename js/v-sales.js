/* Invoices: every sale, who made it, what is still owed. */
import { S, esc, by, money, fmtDate, fmtTime, custName, userName } from './store.js';
import { $, $$, modal, who, pill, thumbs } from './ui.js';
import { paidOf, balanceOf, hasCustom, schedule, dueOverdue } from './logic.js';
import { showInvoice } from './invoice.js';
import { receivePayment } from './pay-ui.js';

const ui = { f: 'all', q: '' };
const FILTERS = [['all', 'All'], ['owing', 'Money owed'], ['plan', 'Instalments'], ['custom', 'Made to order'], ['today', 'Today']];

export function render(root) {
  root.innerHTML = `<div class="page-head"><h2>Invoices</h2><input id="q" class="search" type="search" placeholder="Search invoice, customer, item" value="${esc(ui.q)}"></div>
    <div class="chips" id="fl" style="margin-bottom:14px"></div><div class="tablewrap" id="tb"></div>`;
  $('#q', root).oninput = e => { ui.q = e.target.value; draw(); };
  $('#fl', root).onclick = e => { const b = e.target.closest('[data-f]'); if (b) { ui.f = b.dataset.f; draw(); } };
  $('#tb', root).onclick = e => { const r = e.target.closest('[data-s]'); if (r) open(by(S.d.sales, r.dataset.s)); };
  draw();
  function draw() {
    $('#fl', root).innerHTML = FILTERS.map(([id, l]) => `<button class="chip ${ui.f === id ? 'on' : ''}" data-f="${id}">${l}</button>`).join('');
    const q = ui.q.trim().toLowerCase(), td = new Date().toDateString();
    const list = S.d.sales.filter(s => (ui.f === 'all' || (ui.f === 'owing' && balanceOf(s) > 0) || (ui.f === 'plan' && s.plan) || (ui.f === 'custom' && hasCustom(s)) || (ui.f === 'today' && new Date(s.at).toDateString() === td))
      && (!q || (s.no + custName(s.customerId) + s.lines.map(l => l.name).join(' ')).toLowerCase().includes(q))).slice(0, 150);
    $('#tb', root).innerHTML = list.length ? `<table><thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th>Items</th><th>Sold by</th><th class="right">Total</th><th class="right">Balance</th></tr></thead><tbody>${list.map(s => {
      const bal = balanceOf(s), over = dueOverdue(s).length;
      return `<tr class="click" data-s="${s.id}"><td><b>${s.no}</b></td><td>${fmtDate(s.at)}<br><small class="dim">${fmtTime(s.at)}</small></td><td>${esc(custName(s.customerId))}</td>
        <td>${esc(s.lines.map(l => l.name).join(', ').slice(0, 54))} ${s.plan ? pill('Plan', 'gold') : ''} ${hasCustom(s) ? pill('Custom') : ''}</td><td>${who(by(S.d.users, s.userId))}</td>
        <td class="right num">${money(s.total)}</td><td class="right num">${bal ? `<b class="${over ? 'bad' : 'warn'}">${money(bal)}</b>${over ? '<br><small class="bad">overdue</small>' : ''}` : pill('Paid', 'good')}</td></tr>`;
    }).join('')}</tbody></table>` : '<div class="empty">No invoices match.</div>';
  }
  function open(s) {
    const bal = balanceOf(s);
    const sch = schedule(s);
    modal({ title: `${s.no} - ${custName(s.customerId)}`, wide: true, html: `<div class="kpis" style="margin:0"><div class="kpi"><small>Total</small><b>${money(s.total)}</b></div><div class="kpi"><small>Paid</small><b class="good">${money(paidOf(s))}</b></div><div class="kpi"><small>Balance</small><b class="${bal ? 'warn' : ''}">${money(bal)}</b></div></div>
      <div class="card"><b>Items</b>${s.lines.map(l => `<div class="row" style="padding:6px 0">${esc(l.name)}${l.size ? ' (' + esc(l.size) + ')' : ''} x${l.qty}<span class="num">${money(l.qty * l.unit)}</span></div>`).join('')}<div class="dim" style="font-size:.78rem">Sold by ${esc(userName(s.userId))} on ${fmtDate(s.at)} ${fmtTime(s.at)}${s.note ? ' &middot; ' + esc(s.note) : ''}</div></div>
      <div class="card"><b>Payments</b>${s.payments.length ? s.payments.map(p => `<div class="row" style="padding:5px 0"><span>${fmtDate(p.at)} &middot; ${esc(p.method)} ${p.note ? '&middot; ' + esc(p.note) : ''} <span class="dim">by ${esc(userName(p.userId))}</span></span><span class="num">${money(p.amt)}</span></div>`).join('') : '<div class="dim">Nothing received yet.</div>'}</div>
      ${sch.length ? `<div class="card"><b>Instalments</b><table class="sched">${sch.map(i => `<tr><td>${i.n}</td><td>${fmtDate(i.due)}</td><td class="num">${money(i.amt)}</td><td>${i.left <= 0 ? pill('Paid', 'good') : i.due < new Date().toISOString().slice(0, 10) ? pill('Overdue', 'bad') : pill('Upcoming')}</td></tr>`).join('')}</table></div>` : ''}`,
      actions: [{ label: 'View invoice', cls: 'ghost', onClick: () => { showInvoice(s); return false; } },
        ...(bal ? [{ label: 'Receive payment', cls: 'gold', onClick: () => { receivePayment(s, () => render(root)); } }] : [])] });
  }
}
