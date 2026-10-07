/* Receive a payment against an invoice, and the WhatsApp reminder wording. */
import { S, esc, by, money, fmtShort, save, waLink } from './store.js';
import { $, modal, toast } from './ui.js';
import { addPayment, balanceOf, schedule, METHODS } from './logic.js';
import { showInvoice } from './invoice.js';

export function receivePayment(sale, done) {
  const bal = balanceOf(sale), nxt = schedule(sale).find(i => i.left > 0);
  modal({ title: `Receive payment - ${sale.no}`, html: `<p class="mute">Balance due <b>${money(bal)}</b>${nxt ? ` &middot; next instalment ${money(nxt.left)} (${fmtShort(nxt.due)})` : ''}</p>
    <div class="fgrid"><label class="f">Amount (Rs)<input id="pa" type="number" inputmode="numeric" value="${nxt ? nxt.left : bal}"></label>
      <label class="f">Paid by<select id="pm">${METHODS.map(m => `<option>${m}</option>`).join('')}</select></label>
      <label class="f full">Note<input id="pn" placeholder="optional"></label></div>`,
    actions: [{ label: 'Cancel', cls: 'ghost', onClick: () => { } }, { label: 'Record payment', cls: 'gold', onClick: el => {
      const a = +$('#pa', el).value; if (!(a > 0)) { toast('Enter an amount', 'bad'); return false; }
      const p = addPayment(sale, a, $('#pm', el).value, $('#pn', el).value.trim()); save();
      toast(`${money(p.amt)} recorded`); done && done(); setTimeout(() => showInvoice(sale), 250);
    } }] });
}

export function reminderText(sale, inst) {
  const c = by(S.d.customers, sale.customerId), name = c ? c.name.split(' ')[0] : 'there';
  return `Assalam o Alaikum ${name}, a gentle reminder from ${S.d.settings.shop}: instalment ${inst.n} of ${money(inst.left)} for invoice ${sale.no} was due on ${fmtShort(inst.due)}. ` +
    `You can pay at the showroom or by bank transfer. Please message us if you need to talk about the date. Thank you!`;
}
export const reminderLink = (sale, inst) => { const c = by(S.d.customers, sale.customerId); return c ? waLink(c.phone, reminderText(sale, inst)) : '#'; };
