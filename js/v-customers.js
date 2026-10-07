/* Customers: history, balances, one-tap WhatsApp. */
import { S, esc, by, money, fmtDate, waLink } from './store.js';
import { $, modal, pill } from './ui.js';
import { balanceOf, paidOf } from './logic.js';
import { customerForm } from './customers-pick.js';
import { showInvoice } from './invoice.js';

const ui = { q: '' };
export function render(root) {
  root.innerHTML = `<div class="page-head"><h2>Customers</h2><input id="q" class="search" type="search" placeholder="Search name, phone, area" value="${esc(ui.q)}"><button class="btn gold" id="add">+ New customer</button></div><div class="tablewrap" id="tb"></div>`;
  $('#q', root).oninput = e => { ui.q = e.target.value; draw(); };
  $('#add', root).onclick = () => customerForm(null, () => draw());
  $('#tb', root).onclick = e => { const r = e.target.closest('[data-c]'); if (r) open(by(S.d.customers, r.dataset.c)); };
  draw();
  function draw() {
    const q = ui.q.trim().toLowerCase();
    const list = S.d.customers.filter(c => !q || (c.name + c.phone + c.area).toLowerCase().includes(q));
    $('#tb', root).innerHTML = list.length ? `<table><thead><tr><th>Name</th><th>Phone</th><th>Area</th><th class="right">Bought</th><th class="right">Owes</th></tr></thead><tbody>${list.map(c => {
      const ss = S.d.sales.filter(s => s.customerId === c.id), owes = ss.reduce((t, s) => t + balanceOf(s), 0);
      return `<tr class="click" data-c="${c.id}"><td><b>${esc(c.name)}</b></td><td>${esc(c.phone)}</td><td>${esc(c.area)}</td><td class="right num">${money(ss.reduce((t, s) => t + s.total, 0))} <small class="dim">(${ss.length})</small></td><td class="right num">${owes ? `<b class="warn">${money(owes)}</b>` : '-'}</td></tr>`;
    }).join('')}</tbody></table>` : '<div class="empty">No customers yet.</div>';
  }
  function open(c) {
    const ss = S.d.sales.filter(s => s.customerId === c.id);
    modal({ title: c.name, wide: true, html: `<div class="row"><span>${esc(c.phone)} &middot; ${esc(c.address || c.area)}</span><a class="btn sm wa" target="_blank" rel="noopener" href="${waLink(c.phone, 'Assalam o Alaikum ' + c.name.split(' ')[0] + ', this is ' + S.d.settings.shop + '.')}">WhatsApp</a></div>${c.notes ? `<p class="mute">${esc(c.notes)}</p>` : ''}
      ${ss.length ? `<div class="tablewrap"><table>${ss.map(s => `<tr class="click" data-s="${s.id}"><td><b>${s.no}</b><br><small class="dim">${fmtDate(s.at)}</small></td><td>${esc(s.lines.map(l => l.name).join(', ').slice(0, 60))}</td><td class="right num">${money(s.total)}</td><td class="right">${balanceOf(s) ? pill(money(balanceOf(s)) + ' due', 'warn') : pill('Paid', 'good')}</td></tr>`).join('')}</table></div>` : '<div class="empty">No purchases yet.</div>'}`,
      actions: [{ label: 'Edit details', cls: 'ghost', onClick: () => { customerForm(c, () => draw()); } }, { label: 'Close', cls: 'gold', onClick: () => { } }],
      onOpen: el => { el.addEventListener('click', e => { const r = e.target.closest('[data-s]'); if (r) showInvoice(by(S.d.sales, r.dataset.s)); }); } });
  }
}
