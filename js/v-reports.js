/* Reports: takings, what sells, who sells it, what is still owed. Works on a phone for the owner. */
import { S, esc, by, money, iso, addDays, today, fmtShort } from './store.js';
import { $ } from './ui.js';
import { balanceOf } from './logic.js';

const ui = { days: 30 };
export function render(root) {
  root.innerHTML = '<div class="page-head"><h2>Reports</h2><div class="chips" id="rg"></div><button class="btn" id="csv">Export CSV</button></div><div id="out"></div>';
  root.onclick = e => { const b = e.target.closest('[data-d]'); if (b) { ui.days = +b.dataset.d; draw(); } };
  const inRange = () => { const from = iso(addDays(new Date(), -(ui.days - 1))); return S.d.sales.filter(s => iso(s.at) >= from); };
  $('#csv', root).onclick = () => exportCsv();
  draw();
  function draw() {
    $('#rg', root).innerHTML = [[1, 'Today'], [7, '7 days'], [30, '30 days'], [90, '90 days']].map(([d, l]) => `<button class="chip ${ui.days === d ? 'on' : ''}" data-d="${d}">${l}</button>`).join('');
    const sales = inRange(), from = iso(addDays(new Date(), -(ui.days - 1)));
    const total = sales.reduce((t, s) => t + s.total, 0);
    const collected = S.d.sales.flatMap(s => s.payments).filter(p => iso(p.at) >= from).reduce((t, p) => t + p.amt, 0);
    const owed = S.d.sales.reduce((t, s) => t + balanceOf(s), 0);
    const tax = total - total / (1 + S.d.settings.taxPct / 100);
    // daily bars
    const days = Array.from({ length: Math.min(ui.days, 60) }, (_, i) => iso(addDays(new Date(), -(Math.min(ui.days, 60) - 1 - i))));
    const per = days.map(d => sales.filter(s => iso(s.at) === d).reduce((t, s) => t + s.total, 0)), mx = Math.max(1, ...per);
    // by category / staff / method / item
    const cat = {}, item = {}, staff = {}, meth = {};
    sales.forEach(s => {
      (staff[s.userId] = staff[s.userId] || { n: 0, v: 0 }).n++; staff[s.userId].v += s.total;
      s.lines.forEach(l => { const k = l.custom ? 'Made to order' : (by(S.d.categories, (by(S.d.items, l.itemId) || {}).cat) || { name: 'Other' }).name; cat[k] = (cat[k] || 0) + l.qty * l.unit; const nm = l.custom ? l.name : l.name; item[nm] = (item[nm] || 0) + l.qty; });
    });
    S.d.sales.flatMap(s => s.payments).filter(p => iso(p.at) >= from).forEach(p => { meth[p.method] = (meth[p.method] || 0) + p.amt; });
    const list = (o, fmt, n = 8) => Object.entries(o).sort((a, b) => (b[1].v ?? b[1]) - (a[1].v ?? a[1])).slice(0, n);
    const bar = (rows, mxv, fmt) => rows.map(([k, v]) => `<div style="margin:8px 0"><div class="row"><span>${esc(k)}</span><b class="num">${fmt(v)}</b></div><div class="meter"><i style="width:${Math.max(3, (v.v ?? v) / mxv * 100)}%"></i></div></div>`).join('') || '<div class="dim">No data</div>';
    const cats = list(cat), mth = list(meth), stf = Object.entries(staff).sort((a, b) => b[1].v - a[1].v).map(([id, v]) => [(by(S.d.users, id) || { name: '?' }).name, v]);
    const top = Object.entries(item).sort((a, b) => b[1] - a[1]).slice(0, 6);
    $('#out', root).innerHTML = `<div class="kpis"><div class="kpi"><small>Sales (invoiced)</small><b>${money(total)}</b><em>${sales.length} invoices</em></div><div class="kpi"><small>Cash collected</small><b class="good">${money(collected)}</b><em>payments received</em></div>
      <div class="kpi"><small>Still owed to you</small><b class="warn">${money(owed)}</b><em>all open balances</em></div><div class="kpi"><small>Sales tax in these sales</small><b>${money(tax)}</b><em>at ${S.d.settings.taxPct}%</em></div></div>
      <div class="card" style="margin-bottom:16px"><b>Sales by day</b><div class="bars">${per.map((v, i) => `<i style="height:${Math.max(2, v / mx * 100)}%" title="${fmtShort(days[i])}: ${money(v)}"></i>`).join('')}</div><div class="row dim" style="font-size:.74rem"><span>${fmtShort(days[0])}</span><span>${fmtShort(days[days.length - 1])}</span></div></div>
      <div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr))"><div class="card"><b>By staff member</b>${bar(stf.map(([n, v]) => [`${n} (${v.n})`, v]), Math.max(1, ...stf.map(x => x[1].v)), v => money(v.v))}</div>
        <div class="card"><b>By category</b>${bar(cats, Math.max(1, ...cats.map(x => x[1])), money)}</div>
        <div class="card"><b>Payment methods</b>${bar(mth, Math.max(1, ...mth.map(x => x[1])), money)}</div>
        <div class="card"><b>Best sellers</b>${bar(top, Math.max(1, ...top.map(x => x[1])), v => v + ' sold')}</div></div>`;
  }
  function exportCsv() {
    const rows = [['Invoice', 'Date', 'Customer', 'Sold by', 'Items', 'Total', 'Paid', 'Balance']].concat(inRange().map(s => [s.no, iso(s.at), (by(S.d.customers, s.customerId) || { name: 'Walk-in' }).name, (by(S.d.users, s.userId) || {}).name, s.lines.map(l => l.name + ' x' + l.qty).join('; '), s.total, s.payments.reduce((t, p) => t + p.amt, 0), balanceOf(s)]));
    const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `woodish-sales-${today()}.csv`; a.click();
  }
}
