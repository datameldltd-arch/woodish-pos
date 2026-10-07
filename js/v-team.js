/* Team & settings (owner only): staff logins and shop details. */
import { S, esc, uid, log, save, by, money } from './store.js';
import { $, modal, avatar, ROLE, toast, confirmBox, pill } from './ui.js';

const COLORS = ['#f6bd1f', '#6fd0a0', '#7fb4ff', '#ff9db1', '#c4a3ff', '#ffb36b', '#7fe0e0', '#e0d27f'];

export function render(root) {
  root.innerHTML = '<div class="page-head"><h2>Team &amp; settings</h2><button class="btn gold" id="add">+ Add staff member</button></div><div id="tm"></div><div class="day-h">Shop details</div><div id="sh"></div>';
  $('#add', root).onclick = () => staff(null);
  root.onclick = e => { const b = e.target.closest('[data-u]'); if (b) staff(by(S.d.users, b.dataset.u)); };
  draw();
  function draw() {
    $('#tm', root).innerHTML = `<div class="tablewrap"><table><thead><tr><th>Name</th><th>Role</th><th>Sales (all time)</th><th>PIN</th><th></th></tr></thead><tbody>${S.d.users.map(u => {
      const mine = S.d.sales.filter(s => s.userId === u.id);
      return `<tr class="click" data-u="${u.id}"><td><span class="who">${avatar(u, 28)}<b>${esc(u.name)}</b></span></td><td>${ROLE[u.role]}</td><td class="num">${mine.length ? `${mine.length} &middot; ${money(mine.reduce((t, s) => t + s.total, 0))}` : '-'}</td><td>&bull;&bull;&bull;&bull;</td><td>${u.active ? '' : pill('Disabled', 'bad')}</td></tr>`;
    }).join('')}</tbody></table></div>`;
    const s = S.d.settings, f = (id, l, v, t = 'text') => `<label class="f">${l}<input id="${id}" type="${t}" value="${esc(v)}"></label>`;
    $('#sh', root).innerHTML = `<div class="card"><div class="fgrid">${f('s-shop', 'Shop name', s.shop)}${f('s-phone', 'Phone / WhatsApp', s.phone)}<label class="f full">Address<input id="s-addr" value="${esc(s.address)}"></label>
      ${f('s-ntn', 'NTN (shown on invoices)', s.ntn)}${f('s-strn', 'Sales tax registration no. (STRN)', s.strn)}${f('s-tax', 'Sales tax % (prices include tax)', s.taxPct, 'number')}${f('s-disc', 'Discount above this % needs manager PIN', s.discountPinPct, 'number')}
      ${f('s-down', 'Instalment plan: minimum down payment %', s.downPct, 'number')}${f('s-mo', 'Instalment plan: usual number of months', s.months, 'number')}</div>
      <p class="dim" style="font-size:.78rem;margin-top:10px">Check the tax rate and the invoice wording with your accountant before issuing real invoices. Instalment prices here are the flat agreed total, split over the months, with no added charge.</p>
      <button class="btn gold" id="ss" style="margin-top:12px">Save settings</button></div>`;
    $('#ss', root).onclick = () => {
      const v = id => $('#' + id, root).value.trim();
      Object.assign(S.d.settings, { shop: v('s-shop'), phone: v('s-phone'), address: v('s-addr'), ntn: v('s-ntn'), strn: v('s-strn'), taxPct: +v('s-tax') || 0, discountPinPct: +v('s-disc') || 0, downPct: +v('s-down') || 0, months: +v('s-mo') || 6 });
      save(); toast('Settings saved');
    };
  }
  function staff(u) {
    const isNew = !u; const d = u || { id: uid(), name: '', role: 'sales', pin: '', active: true, color: COLORS[S.d.users.length % COLORS.length] };
    modal({ title: isNew ? 'Add staff member' : d.name, html: `<div class="fgrid"><label class="f">Name<input id="un" value="${esc(d.name)}"></label>
      <label class="f">Role<select id="ur">${Object.entries(ROLE).map(([k, l]) => `<option value="${k}" ${k === d.role ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="f">4-digit PIN<input id="up" inputmode="numeric" maxlength="4" value="${esc(d.pin)}"></label>
      <label class="f">Status<select id="ua"><option value="1" ${d.active ? 'selected' : ''}>Active</option><option value="0" ${d.active ? '' : 'selected'}>Disabled</option></select></label></div>
      <p class="dim" style="font-size:.78rem">Owner and manager PINs also approve discounts. A PIN shows who did what; it is not strong security, so keep each person's PIN private.</p>`,
      actions: [{ label: 'Cancel', cls: 'ghost', onClick: () => { } }, { label: 'Save', cls: 'gold', onClick: el => {
        const name = $('#un', el).value.trim(), pin = $('#up', el).value.trim();
        if (!name || !/^\d{4}$/.test(pin)) { toast('Name and a 4-digit PIN are needed', 'bad'); return false; }
        if (S.d.users.some(x => x !== u && x.pin === pin && x.active)) { toast('That PIN is already used', 'bad'); return false; }
        const role = $('#ur', el).value;
        if (u && u.role === 'owner' && (role !== 'owner' || $('#ua', el).value === '0')) { toast('Keep at least the owner account active', 'bad'); return false; }
        Object.assign(d, { name, pin, role, active: $('#ua', el).value === '1' });
        if (isNew) { S.d.users.push(d); log('team', `Staff member added: ${name} (${ROLE[role]})`); } else log('team', `Staff updated: ${name}`);
        save(); draw();
      } }] });
  }
}
