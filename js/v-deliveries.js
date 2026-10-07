/* Deliveries: booked by date, with driver and status. */
import { S, esc, by, fmtDate, today, custName, save, money, waLink, iso, addDays } from './store.js';
import { $, pill, modal, toast } from './ui.js';
import { setDeliveryStatus, balanceOf, hasCustom } from './logic.js';
import { showInvoice } from './invoice.js';

const ui = { f: 'upcoming' };
export function render(root) {
  root.innerHTML = `<div class="page-head"><h2>Deliveries</h2></div><div class="chips" id="fl" style="margin-bottom:14px"></div><div id="ls" class="feed"></div>`;
  $('#fl', root).onclick = e => { const b = e.target.closest('[data-f]'); if (b) { ui.f = b.dataset.f; draw(); } };
  $('#ls', root).onclick = e => {
    const b = e.target.closest('[data-a]'); if (!b) return; const s = by(S.d.sales, b.dataset.s), a = b.dataset.a;
    if (a === 'inv') return showInvoice(s);
    if (a === 'wa') { const c = by(S.d.customers, s.customerId); return window.open(waLink(c.phone, `Assalam o Alaikum ${c.name.split(' ')[0]}, your ${S.d.settings.shop} delivery (${s.no}) is booked for ${fmtDate(s.delivery.date)}, ${s.delivery.slot}. Balance on delivery: ${money(balanceOf(s))}. Please confirm someone will be home. Thank you!`), '_blank', 'noopener'); }
    if (a === 'driver') return modal({ title: 'Driver', html: `<label class="f">Driver name<input id="dn" value="${esc(s.delivery.driver)}"></label>`, actions: [{ label: 'Save', cls: 'gold', onClick: el => { s.delivery.driver = $('#dn', el).value.trim(); save(); draw(); } }] });
    setDeliveryStatus(s, a); save(); draw(); toast('Delivery ' + a);
  };
  const FL = [['upcoming', 'Upcoming'], ['today', 'Today'], ['done', 'Delivered'], ['all', 'All']];
  function draw() {
    $('#fl', root).innerHTML = FL.map(([id, l]) => `<button class="chip ${ui.f === id ? 'on' : ''}" data-f="${id}">${l}</button>`).join('');
    const td = today();
    let list = S.d.sales.filter(s => s.delivery);
    list = list.filter(s => ui.f === 'all' || (ui.f === 'done' ? s.delivery.status === 'delivered' : ui.f === 'today' ? s.delivery.date === td && s.delivery.status !== 'delivered' : s.delivery.status !== 'delivered'))
      .sort((a, b) => ui.f === 'done' || ui.f === 'all' ? b.delivery.date.localeCompare(a.delivery.date) : a.delivery.date.localeCompare(b.delivery.date));
    $('#ls', root).innerHTML = list.slice(0, 80).map(s => {
      const d = s.delivery, c = by(S.d.customers, s.customerId), late = d.date < td && d.status !== 'delivered', bal = balanceOf(s);
      const next = d.status === 'scheduled' ? ['out', 'Out for delivery'] : d.status === 'out' ? ['delivered', 'Mark delivered'] : null;
      return `<div class="card"><div class="row"><div><b>${fmtDate(d.date)} &middot; ${esc(d.slot)}</b> ${late ? pill('Late', 'bad') : ''} ${pill(d.status === 'out' ? 'Out now' : d.status, d.status === 'delivered' ? 'good' : d.status === 'out' ? 'warn' : '')} ${hasCustom(s) ? pill('Includes made-to-order') : ''}</div><span class="mute">${esc(s.no)}</span></div>
        <div class="row" style="margin-top:8px;align-items:flex-start"><div>${esc(custName(s.customerId))} ${c ? '&middot; ' + esc(c.phone) : ''}<br><span class="mute">${esc(d.address || d.area)}</span><br><span class="dim" style="font-size:.78rem">${s.lines.map(l => esc(l.name)).join(', ')}</span></div>
          <div class="right">${bal ? `<b class="warn">${money(bal)} to collect</b><br>` : '<span class="good">Fully paid</span><br>'}<span class="dim" style="font-size:.78rem">Driver: ${esc(d.driver || 'not set')}</span></div></div>
        <div class="chips" style="margin-top:10px"><a class="btn sm" target="_blank" rel="noopener" href="https://www.google.com/maps/search/${encodeURIComponent((d.address || d.area) + ', Rawalpindi')}">Map</a>
          <button class="btn sm" data-a="driver" data-s="${s.id}">Driver</button><button class="btn sm" data-a="inv" data-s="${s.id}">Invoice</button>${c ? `<button class="btn sm wa" data-a="wa" data-s="${s.id}">WhatsApp</button>` : ''}
          ${next ? `<button class="btn sm gold" data-a="${next[0]}" data-s="${s.id}">${next[1]}</button>` : ''}</div></div>`;
    }).join('') || '<div class="empty">No deliveries here.</div>';
  }
  draw();
}
