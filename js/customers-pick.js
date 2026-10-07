/* Customer picker / quick-add used by Sell and Customers. */
import { S, esc, uid, log, save } from './store.js';
import { $, modal, toast } from './ui.js';

export function customerForm(c, done) {
  const edit = !!c; c = c || { name: '', phone: '', area: '', address: '', notes: '' };
  modal({ title: edit ? 'Edit customer' : 'New customer', html: `<div class="fgrid"><label class="f">Name<input id="cn" value="${esc(c.name)}"></label><label class="f">WhatsApp / phone<input id="cp" inputmode="tel" value="${esc(c.phone)}" placeholder="03xx xxxxxxx"></label>
    <label class="f">Area<input id="ca" value="${esc(c.area)}"></label><label class="f">Address<input id="cd" value="${esc(c.address)}"></label><label class="f full">Notes<input id="cx" value="${esc(c.notes)}"></label></div>`,
    actions: [{ label: 'Cancel', cls: 'ghost', onClick: () => { } }, { label: 'Save', cls: 'gold', onClick: el => {
      const v = id => $(id, el).value.trim();
      if (!v('#cn') || !v('#cp')) { toast('Name and phone are needed', 'bad'); return false; }
      Object.assign(c, { name: v('#cn'), phone: v('#cp'), area: v('#ca'), address: v('#cd'), notes: v('#cx') });
      if (!edit) { c.id = uid(); S.d.customers.unshift(c); log('customer', `New customer added: ${c.name}`); }
      save(); done && done(c.id);
    } }] });
}

export function pickCustomer(done) {
  const list = (q) => S.d.customers.filter(c => !q || (c.name + c.phone + c.area).toLowerCase().includes(q.toLowerCase())).slice(0, 30);
  modal({ title: 'Choose customer', html: `<input id="q" type="search" placeholder="Search name, phone or area" autofocus><div id="cl" style="display:grid;gap:8px"></div>`,
    actions: [{ label: 'Walk-in (no customer)', cls: 'ghost', onClick: () => done(null) }, { label: '+ New customer', cls: 'gold', onClick: () => { customerForm(null, done); } }],
    onOpen: (el, close) => {
      const draw = () => { $('#cl', el).innerHTML = list($('#q', el).value).map(c => `<button class="cust-chip" data-c="${c.id}"><b>${esc(c.name)}</b><span class="mute">${esc(c.phone)} &middot; ${esc(c.area)}</span></button>`).join('') || '<div class="empty">No match</div>'; };
      $('#q', el).oninput = draw; draw();
      $('#cl', el).onclick = e => { const b = e.target.closest('[data-c]'); if (b) { done(b.dataset.c); close(); } };
    } });
}
