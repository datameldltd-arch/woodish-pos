/* Sell: browse the showroom, build a basket, add made-to-order pieces, take payment, issue the invoice. */
import { S, esc, by, money, today, iso, addDays, save, custName, photoSrc } from './store.js';
import { $, $$, modal, toast, pinPrompt, pickPhotos, thumbs, img, pill } from './ui.js';
import { totals, createSale, planFor, METHODS, lineTotal } from './logic.js';
import { showInvoice } from './invoice.js';
import { pickCustomer } from './customers-pick.js';

const cart = { customerId: null, lines: [], discount: 0, approvedBy: null };
const ui = { q: '', cat: 'all' };
const fresh = () => Object.assign(cart, { customerId: null, lines: [], discount: 0, approvedBy: null });

export function render(root) {
  root.innerHTML = `<div class="sell"><section class="sell-l">
      <div class="page-head" style="margin:0"><h2>Sell</h2><input id="q" class="search" type="search" placeholder="Search the showroom..." value="${esc(ui.q)}">
        <button class="btn gold" id="custom">+ Made-to-order piece</button></div>
      <div class="chips" id="cats"></div><div class="grid" id="pg"></div></section>
    <aside class="cart" id="cart"></aside></div>`;
  $('#q', root).oninput = e => { ui.q = e.target.value; grid(); };
  $('#custom', root).onclick = () => customPiece();
  $('#cats', root).onclick = e => { const b = e.target.closest('[data-c]'); if (b) { ui.cat = b.dataset.c; cats(); grid(); } };
  $('#pg', root).onclick = e => { const b = e.target.closest('[data-i]'); if (b) pickItem(by(S.d.items, b.dataset.i)); };
  cats(); grid(); drawCart();
}

function cats() {
  const used = S.d.categories.filter(c => S.d.items.some(i => i.cat === c.id));
  $('#cats').innerHTML = [{ id: 'all', name: 'All' }, ...used].map(c => `<button class="chip ${ui.cat === c.id ? 'on' : ''}" data-c="${c.id}">${esc(c.name)}</button>`).join('');
}
function grid() {
  const q = ui.q.trim().toLowerCase();
  const list = S.d.items.filter(i => (ui.cat === 'all' || i.cat === ui.cat) && (!q || (i.name + i.desc).toLowerCase().includes(q)));
  $('#pg').innerHTML = list.length ? list.map(i => {
    const n = i.stock.showroom + i.stock.warehouse;
    return `<button class="pc" data-i="${i.id}">${img(i.photos[0])}<div><b>${esc(i.name)}</b><span>${i.sizes.length ? 'from ' : ''}${money(i.price)}</span><small>${n ? `${i.stock.showroom} on floor, ${i.stock.warehouse} in store` : 'Out of stock - can order'}</small></div></button>`;
  }).join('') : '<div class="empty" style="grid-column:1/-1">Nothing matches. Try a made-to-order piece.</div>';
}

function addLine(l) {
  const same = cart.lines.find(x => !x.custom && !l.custom && x.itemId === l.itemId && x.size === l.size && x.colour === l.colour);
  same ? same.qty += l.qty : cart.lines.push(l); drawCart();
}
function pickItem(it) {
  const add = (size, colour) => addLine({ itemId: it.id, name: it.name, qty: 1, unit: it.price + (size ? size.d : 0), size: size ? size.n : '', colour, photo: it.photos[0], custom: null });
  if (!it.sizes.length) return add(null, '');
  modal({ title: it.name, html: `<div class="opts" id="sz">${it.sizes.map((s, i) => `<label><input type="radio" name="sz" value="${i}" ${i ? '' : 'checked'}>${esc(s.n)} - ${money(it.price + s.d)}</label>`).join('')}</div>
    <label class="f">Colour / finish (optional)<input id="col" placeholder="e.g. Walnut"></label>`,
    actions: [{ label: 'Cancel', cls: 'ghost', onClick: () => { } }, { label: 'Add to basket', cls: 'gold', onClick: el => { add(it.sizes[+$('[name=sz]:checked', el).value], $('#col', el).value.trim()); } }] });
}

function customPiece() {
  let photos = [];
  const m = modal({ title: 'Made-to-order piece', wide: true, html: `<p class="mute">Goes straight to the workshop board once the sale is completed.</p>
    <div class="fgrid"><label class="f full">What are we making?<input id="cn" placeholder="e.g. 3-seater sofa, L-shape"></label>
      <label class="f">Size (L x W x H)<input id="cd" placeholder="e.g. 220 x 95 x 85 cm"></label><label class="f">Wood / frame<input id="cw" placeholder="e.g. Sheesham"></label>
      <label class="f">Fabric / finish<input id="cf" placeholder="e.g. Grey velvet, walnut polish"></label><label class="f">Colour<input id="cc"></label>
      <label class="f">Agreed price (Rs)<input id="cp" type="number" inputmode="numeric" min="0"></label><label class="f">Promised by<input id="cu" type="date" value="${iso(addDays(new Date(), 21))}"></label>
      <label class="f full">Notes for the carpenter<textarea id="cx"></textarea></label></div>
    <div><button class="btn" id="cph">Take / add photos</button><div id="cpt" style="margin-top:10px"></div></div>`,
    actions: [{ label: 'Cancel', cls: 'ghost', onClick: () => { } }, { label: 'Add to basket', cls: 'gold', onClick: el => {
      const name = $('#cn', el).value.trim(), price = +$('#cp', el).value;
      if (!name || !price) { toast('Add a name and a price', 'bad'); return false; }
      addLine({ itemId: null, name, qty: 1, unit: price, size: '', colour: $('#cc', el).value.trim(), photo: photos[0] || '',
        custom: { dims: $('#cd', el).value.trim(), wood: $('#cw', el).value.trim(), fabric: $('#cf', el).value.trim(), colour: $('#cc', el).value.trim(), notes: $('#cx', el).value.trim(), photos, due: $('#cu', el).value } });
    } }],
    onOpen: el => { $('#cph', el).onclick = async () => { photos = photos.concat(await pickPhotos()); $('#cpt', el).innerHTML = thumbs(photos); }; } });
  return m;
}

function drawCart() {
  const c = $('#cart'); if (!c) return;
  const t = totals(cart.lines, cart.discount, 0), cu = cart.customerId ? by(S.d.customers, cart.customerId) : null;
  c.innerHTML = `<div class="cart-h"><h3 style="flex:1">Basket</h3>${cart.lines.length ? '<button class="link" id="clr">Clear</button>' : ''}</div>
    <div class="cart-b"><button class="cust-chip" id="cust">${cu ? `<b>${esc(cu.name)}</b><span class="mute">${esc(cu.phone)}</span>` : '<span class="mute">+ Add customer (needed for deposits, plans and delivery)</span>'}</button>
    ${cart.lines.length ? cart.lines.map((l, i) => `<div class="cl">${img(l.photo)}<div><b>${esc(l.name)}</b><small>${[l.size, l.colour, l.custom ? 'Made to order' : ''].filter(Boolean).map(esc).join(' &middot; ')}</small>
      <div class="qty"><button data-q="${i}" data-d="-1">&minus;</button><span>${l.qty}</span><button data-q="${i}" data-d="1">+</button></div></div><b class="num">${money(lineTotal(l))}</b></div>`).join('')
      : '<div class="empty" style="margin-top:14px">Tap a piece to add it.</div>'}</div>
    <div class="cart-f"><div class="row"><span class="mute">Subtotal</span><b class="num">${money(t.sub)}</b></div>
      <div class="row"><span class="mute">Discount (Rs)</span><input id="disc" type="number" inputmode="numeric" min="0" value="${cart.discount || ''}" placeholder="0" style="width:120px;min-height:38px"></div>
      ${cart.approvedBy ? `<div class="row dim" style="font-size:.74rem">Discount approved by ${esc(cart.approvedBy)}</div>` : ''}
      <div class="row total"><span>Total</span><span class="num">${money(t.total)}</span></div>
      <button class="btn gold" id="pay" ${cart.lines.length ? '' : 'disabled'} style="min-height:52px;font-size:1rem">Take payment</button></div>`;
  c.onclick = e => {
    const q = e.target.closest('[data-q]');
    if (q) { const l = cart.lines[+q.dataset.q]; l.qty += +q.dataset.d; if (l.qty < 1) cart.lines.splice(+q.dataset.q, 1); return drawCart(); }
    if (e.target.closest('#clr')) { fresh(); return drawCart(); }
    if (e.target.closest('#cust')) return pickCustomer(id => { cart.customerId = id; drawCart(); });
    if (e.target.closest('#pay')) return checkout();
  };
  $('#disc', c).onchange = async e => {
    const v = Math.max(0, +e.target.value || 0), sub = totals(cart.lines, 0, 0).sub, limit = sub * S.d.settings.discountPinPct / 100;
    cart.approvedBy = null;
    if (v > limit) {
      const u = await pinPrompt(`A discount over ${S.d.settings.discountPinPct}% (${money(v)}) needs a manager or owner PIN.`);
      if (!u) { cart.discount = 0; return drawCart(); }
      cart.approvedBy = u.name;
    }
    cart.discount = v; drawCart();
  };
}

function checkout() {
  const s = S.d.settings, t0 = totals(cart.lines, cart.discount, 0), hasCustom = cart.lines.some(l => l.custom);
  const st = { mode: hasCustom ? 'deposit' : 'full', method: 'Cash', months: s.months, now: 0, deliver: false, d: { date: iso(addDays(new Date(), 3)), slot: 'Afternoon', area: '', address: '', fee: 0 } };
  const cu = () => cart.customerId ? by(S.d.customers, cart.customerId) : null;
  if (cu()) { st.d.area = cu().area || ''; st.d.address = cu().address || ''; }
  const total = () => totals(cart.lines, cart.discount, st.deliver ? +st.d.fee || 0 : 0).total;
  const defNow = () => st.mode === 'plan' ? Math.round(total() * s.downPct / 100 / 100) * 100 : st.mode === 'deposit' ? Math.round(total() * (hasCustom ? 0.5 : 0.4) / 100) * 100 : total();
  st.now = defNow();
  const m = modal({ title: 'Take payment', wide: true, html: '<div id="co"></div>', actions: [
    { label: 'Back', cls: 'ghost', onClick: () => { } },
    { label: 'Complete sale', cls: 'gold', onClick: el => {
      const t = total(), now = st.mode === 'full' ? t : Math.min(t, +st.now || 0);
      if ((st.mode !== 'full' || hasCustom || st.deliver) && !cart.customerId) { toast('Add the customer first (name and phone)', 'bad'); return false; }
      if (st.mode !== 'full' && now <= 0) { toast('Enter the amount received now', 'bad'); return false; }
      if (st.mode === 'plan' && now < t * s.downPct / 100 - 1) { toast(`Down payment must be at least ${s.downPct}%`, 'bad'); return false; }
      if (st.deliver && !st.d.date) { toast('Pick a delivery date', 'bad'); return false; }
      const sale = createSale({ customerId: cart.customerId, lines: cart.lines, discount: cart.discount, delivery: st.deliver ? { ...st.d, fee: +st.d.fee || 0 } : null,
        payMode: st.mode, payNow: now, method: st.method, months: +st.months });
      if (cart.approvedBy) { sale.note = 'Discount approved by ' + cart.approvedBy; }
      save(); fresh(); drawCart(); grid(); toast(`${sale.no} created`); setTimeout(() => showInvoice(sale), 250);
    } }],
    onOpen: el => {
      const draw = () => {
        const t = total(), now = st.mode === 'full' ? t : Math.min(t, +st.now || 0), plan = st.mode === 'plan' ? planFor(t, now, +st.months, new Date()) : null;
        $('#co', el).innerHTML = `<div class="row total"><span>Total to pay</span><span class="num">${money(t)}</span></div>
          <div class="opts" id="mode">${[['full', 'Pay in full'], ['deposit', 'Part payment / deposit'], ['plan', 'Instalment plan']].map(([v, l]) => `<label><input type="radio" name="mode" value="${v}" ${st.mode === v ? 'checked' : ''}>${l}</label>`).join('')}</div>
          <div class="fgrid">${st.mode !== 'full' ? `<label class="f">${st.mode === 'plan' ? `Down payment (min ${s.downPct}%)` : 'Amount received now'} (Rs)<input id="now" type="number" inputmode="numeric" value="${st.now}"></label>` : ''}
            ${st.mode === 'plan' ? `<label class="f">Months<select id="mo">${[3, 4, 6, 9, 12].map(n => `<option ${+st.months === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>` : ''}
            <label class="f">Paid by<select id="meth">${METHODS.map(x => `<option ${st.method === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label></div>
          ${plan ? `<table class="sched"><tr><th>Due</th><th class="right">Amount</th></tr>${plan.items.map(i => `<tr><td>${i.n}. ${i.due}</td><td class="right num">${money(i.amt)}</td></tr>`).join('')}</table>` : ''}
          ${st.mode === 'deposit' ? `<p class="mute">Balance of <b>${money(t - now)}</b> stays open on the invoice.</p>` : ''}
          <label class="opts" style="display:block"><label style="border:0;padding:0"><input type="checkbox" id="dl" ${st.deliver ? 'checked' : ''}>Home delivery</label></label>
          ${st.deliver ? `<div class="fgrid"><label class="f">Date<input id="dd" type="date" value="${st.d.date}"></label><label class="f">Time<select id="ds">${['Morning', 'Afternoon', 'Evening'].map(x => `<option ${st.d.slot === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
            <label class="f">Area<input id="da" value="${esc(st.d.area)}"></label><label class="f">Delivery charge (Rs)<input id="df" type="number" inputmode="numeric" value="${st.d.fee || ''}"></label>
            <label class="f full">Address and notes (floor, stairs, landmark)<input id="dr" value="${esc(st.d.address)}"></label></div>` : ''}
          <div class="mute" style="font-size:.8rem">Customer: <b>${esc(custName(cart.customerId))}</b></div>`;
        const on = (id, ev, fn) => { const n = $(id, el); if (n) n[ev] = fn; };
        $$('[name=mode]', el).forEach(r => r.onchange = () => { st.mode = r.value; st.now = defNow(); draw(); });
        on('#now', 'onchange', e => { st.now = +e.target.value; draw(); }); on('#mo', 'onchange', e => { st.months = +e.target.value; draw(); });
        on('#meth', 'onchange', e => { st.method = e.target.value; });
        on('#dl', 'onchange', e => { st.deliver = e.target.checked; st.now = defNow(); draw(); });
        on('#dd', 'onchange', e => { st.d.date = e.target.value; }); on('#ds', 'onchange', e => { st.d.slot = e.target.value; });
        on('#da', 'onchange', e => { st.d.area = e.target.value; }); on('#dr', 'onchange', e => { st.d.address = e.target.value; });
        on('#df', 'onchange', e => { st.d.fee = +e.target.value; st.now = defNow(); draw(); });
      };
      draw();
    } });
  return m;
}
