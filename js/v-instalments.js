/* Instalments: who owes what this week, who is behind, one tap to remind or receive. */
import { S, esc, by, money, fmtDate, today, iso, addDays, custName } from './store.js';
import { $ } from './ui.js';
import { schedule, balanceOf } from './logic.js';
import { receivePayment, reminderLink } from './pay-ui.js';

export function render(root) {
  root.innerHTML = '<div class="page-head"><h2>Instalments</h2></div><div id="k"></div><div id="ls"></div>';
  draw();
  root.onclick = e => { const b = e.target.closest('[data-pay]'); if (b) receivePayment(by(S.d.sales, b.dataset.pay), () => render(root)); };
  function draw() {
    const td = today(), wk = iso(addDays(new Date(), 7)), rows = [];
    S.d.sales.filter(s => s.plan && balanceOf(s) > 0).forEach(s => { const nxt = schedule(s).find(i => i.left > 0); if (nxt) rows.push({ s, i: nxt, over: nxt.due < td, late: schedule(s).filter(i => i.left > 0 && i.due < td).reduce((t, i) => t + i.left, 0) }); });
    const over = rows.filter(r => r.over).sort((a, b) => a.i.due.localeCompare(b.i.due)), soon = rows.filter(r => !r.over && r.i.due <= wk).sort((a, b) => a.i.due.localeCompare(b.i.due)), later = rows.filter(r => !r.over && r.i.due > wk).sort((a, b) => a.i.due.localeCompare(b.i.due));
    const sum = a => a.reduce((t, r) => t + (r.over ? r.late : r.i.left), 0);
    $('#k', root).innerHTML = `<div class="kpis"><div class="kpi"><small>Overdue</small><b class="bad">${money(sum(over))}</b><em>${over.length} customers</em></div><div class="kpi"><small>Due in 7 days</small><b class="warn">${money(sum(soon))}</b><em>${soon.length} customers</em></div>
      <div class="kpi"><small>Active plans</small><b>${rows.length}</b><em>${money(rows.reduce((t, r) => t + balanceOf(r.s), 0))} still to collect</em></div></div>`;
    const sec = (title, arr, tone) => arr.length ? `<div class="day-h">${title}</div><div class="tablewrap"><table><tbody>${arr.map(r => {
      const c = by(S.d.customers, r.s.customerId), days = Math.round((new Date(td) - new Date(r.i.due)) / 864e5);
      return `<tr><td><b>${esc(custName(r.s.customerId))}</b><br><small class="dim">${esc(c ? c.phone : '')} &middot; ${r.s.no}</small></td><td>Instalment ${r.i.n} of ${r.s.plan.months}<br><small class="dim">due ${fmtDate(r.i.due)}${r.over ? ` (${days} days ago)` : ''}</small></td>
        <td class="num ${tone}"><b>${money(r.over ? r.late : r.i.left)}</b></td><td class="right"><span style="display:inline-flex;gap:8px">${c ? `<a class="btn sm wa" target="_blank" rel="noopener" href="${reminderLink(r.s, r.i)}">Remind</a>` : ''}<button class="btn sm gold" data-pay="${r.s.id}">Receive</button></span></td></tr>`;
    }).join('')}</tbody></table></div>` : '';
    $('#ls', root).innerHTML = sec('Overdue', over, 'bad') + sec('Due in the next 7 days', soon, 'warn') + sec('Later', later, '') || '<div class="empty">No active instalment plans.</div>';
  }
}
