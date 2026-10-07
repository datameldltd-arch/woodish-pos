/* Tax invoice: on-screen preview, print / save as PDF, and a WhatsApp message. */
import { S, esc, by, money, fmtDate, fmtShort, waLink, userName } from './store.js';
import { modal, $ } from './ui.js';
import { totals, paidOf, balanceOf, schedule, lineTotal } from './logic.js';

export function invoiceHtml(sale) {
  const s = S.d.settings, c = sale.customerId ? by(S.d.customers, sale.customerId) : null;
  const t = totals(sale.lines, sale.discount, sale.delivery ? sale.delivery.fee : 0);
  const paid = paidOf(sale), bal = balanceOf(sale), sch = schedule(sale);
  const rows = sale.lines.map(l => `<tr><td>${esc(l.name)}${l.size ? ` <small>(${esc(l.size)})</small>` : ''}${l.colour ? `<br><small>Colour: ${esc(l.colour)}</small>` : ''}${l.custom
    ? `<br><small>Made to order${l.custom.dims ? ' &middot; ' + esc(l.custom.dims) : ''}${l.custom.wood ? ' &middot; ' + esc(l.custom.wood) : ''}${l.custom.fabric ? ' &middot; ' + esc(l.custom.fabric) : ''}</small>` : ''}</td>
    <td class="right">${l.qty}</td><td class="right">${money(l.unit)}</td><td class="right">${money(lineTotal(l))}</td></tr>`).join('');
  return `<div class="invoice">
    <div class="inv-top"><div><h1>${esc(s.shop)}</h1><div>${esc(s.address)}<br>Tel: ${esc(s.phone)}<br>NTN: ${esc(s.ntn || '__________')} &nbsp; STRN: ${esc(s.strn || '__________')}</div></div>
      <div class="right"><h1>TAX INVOICE</h1><div><b>${esc(sale.no)}</b><br>${fmtDate(sale.at)}<br>Served by ${esc(userName(sale.userId))}</div></div></div>
    <div class="meta"><div><small>Billed to</small><b>${esc(c ? c.name : 'Walk-in customer')}</b>${c ? `<br>${esc(c.phone)}<br>${esc(c.address)}` : ''}</div>
      <div><small>Delivery</small>${sale.delivery ? `<b>${fmtDate(sale.delivery.date)}</b> (${esc(sale.delivery.slot)})<br>${esc(sale.delivery.address || sale.delivery.area)}` : 'Collected from showroom'}</div></div>
    <table><thead><tr><th>Item</th><th class="right">Qty</th><th class="right">Price</th><th class="right">Amount</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="tot">
      <div><span>Subtotal</span><span>${money(t.sub)}</span></div>
      ${t.disc ? `<div><span>Discount</span><span>- ${money(t.disc)}</span></div>` : ''}
      ${t.fee ? `<div><span>Delivery charge</span><span>${money(t.fee)}</span></div>` : ''}
      <div><span>Amount excl. tax</span><span>${money(t.net)}</span></div>
      <div><span>Sales tax ${s.taxPct}%</span><span>${money(t.tax)}</span></div>
      <div class="g"><span>Total</span><span>${money(t.total)}</span></div>
      <div><span>Paid</span><span>${money(paid)}</span></div>
      <div class="g"><span>Balance due</span><span>${money(bal)}</span></div></div>
    ${sale.payments.length ? `<p style="margin-top:14px"><b>Payments</b></p><table>${sale.payments.map(p => `<tr><td>${fmtShort(p.at)}</td><td>${esc(p.method)}</td><td>${esc(p.note)}</td><td class="right">${money(p.amt)}</td></tr>`).join('')}</table>` : ''}
    ${sch.length ? `<p style="margin-top:14px"><b>Instalment plan</b> &mdash; ${money(sale.plan.down)} down, then ${sch.length} monthly payments</p><table><thead><tr><th>#</th><th>Due</th><th class="right">Amount</th><th class="right">Status</th></tr></thead>${sch.map(i => `<tr><td>${i.n}</td><td>${fmtShort(i.due)}</td><td class="right">${money(i.amt)}</td><td class="right">${i.left <= 0 ? 'Paid' : i.got ? 'Part paid' : 'Due'}</td></tr>`).join('')}</table>` : ''}
    <div class="foot">Thank you for choosing ${esc(s.shop)}. Please keep this invoice for your records.</div></div>`;
}

export function waText(sale) {
  const s = S.d.settings, t = totals(sale.lines, sale.discount, sale.delivery ? sale.delivery.fee : 0), bal = balanceOf(sale), sch = schedule(sale).find(i => i.left > 0);
  return `*${s.shop}*\nInvoice ${sale.no} (${fmtDate(sale.at)})\n\n` + sale.lines.map(l => `- ${l.name}${l.size ? ' (' + l.size + ')' : ''} x${l.qty}: ${money(lineTotal(l))}`).join('\n') +
    `\n\nTotal: ${money(t.total)}\nPaid: ${money(paidOf(sale))}\nBalance: ${money(bal)}` +
    (sch ? `\nNext instalment: ${money(sch.left)} due ${fmtShort(sch.due)}` : '') +
    (sale.delivery ? `\nDelivery: ${fmtDate(sale.delivery.date)} (${sale.delivery.slot})` : '') +
    `\n\nThank you! ${s.address}. ${s.phone}`;
}

export function printInvoice(sale) {
  $('#print-root').innerHTML = invoiceHtml(sale);
  setTimeout(() => window.print(), 60);
}

export function showInvoice(sale) {
  const c = sale.customerId ? by(S.d.customers, sale.customerId) : null;
  modal({ title: 'Invoice ' + sale.no, wide: true, html: invoiceHtml(sale), actions: [
    { label: 'Print / Save as PDF', cls: 'gold', onClick: () => { printInvoice(sale); return false; } },
    { label: c ? 'Send on WhatsApp' : 'WhatsApp (pick a number)', cls: 'wa', onClick: () => {
      let phone = c && c.phone; if (!phone) phone = prompt('Customer WhatsApp number (03xx xxxxxxx)') || '';
      if (phone) window.open(waLink(phone, waText(sale)), '_blank', 'noopener'); return false; } },
    { label: 'Close', cls: 'ghost', onClick: () => { } }] });
}
