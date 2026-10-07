/* Catalogue: the showroom with photos. Owner and managers add pieces and take pictures. */
import { S, esc, by, money, uid, log, save, photoSrc } from './store.js';
import { $, $$, modal, img, pickPhotos, thumbs, toast, confirmBox, pill } from './ui.js';

const ui = { q: '', cat: 'all' };
export function render(root) {
  const edit = ['owner', 'manager'].includes(S.user.role);
  root.innerHTML = `<div class="page-head"><h2>Catalogue</h2><input id="q" class="search" type="search" placeholder="Search" value="${esc(ui.q)}">${edit ? '<button class="btn gold" id="add">+ Add a piece (take photo)</button>' : ''}</div><div class="chips" id="cats" style="margin-bottom:14px"></div><div class="grid" id="g" style="grid-template-columns:repeat(auto-fill,minmax(210px,1fr))"></div>`;
  $('#q', root).oninput = e => { ui.q = e.target.value; draw(); };
  $('#cats', root).onclick = e => { const b = e.target.closest('[data-c]'); if (b) { ui.cat = b.dataset.c; draw(); } };
  $('#g', root).onclick = e => { const b = e.target.closest('[data-i]'); if (b) form(by(S.d.items, b.dataset.i)); };
  if (edit) $('#add', root).onclick = () => form(null);
  draw();
  function draw() {
    $('#cats', root).innerHTML = [{ id: 'all', name: 'All' }, ...S.d.categories].map(c => `<button class="chip ${ui.cat === c.id ? 'on' : ''}" data-c="${c.id}">${esc(c.name)}</button>`).join('');
    const q = ui.q.trim().toLowerCase();
    const list = S.d.items.filter(i => (ui.cat === 'all' || i.cat === ui.cat) && (!q || (i.name + i.desc).toLowerCase().includes(q)));
    $('#g', root).innerHTML = list.map(i => `<button class="pc" data-i="${i.id}">${img(i.photos[0])}<div><b>${esc(i.name)}</b><span>${money(i.price)}</span><small>${i.photos.length} photo${i.photos.length === 1 ? '' : 's'} &middot; ${i.stock.showroom} floor / ${i.stock.warehouse} store</small></div></button>`).join('') || '<div class="empty" style="grid-column:1/-1">Nothing here yet.</div>';
  }
  function form(it) {
    const isNew = !it, d = it || { id: uid(), cat: ui.cat === 'all' ? 'beds' : ui.cat, name: '', desc: '', price: 0, photos: [], sizes: [], stock: { showroom: 1, warehouse: 0 } };
    const photos = [...d.photos];
    const sizeText = d.sizes.map(s => s.d ? `${s.n} +${s.d}` : s.n).join(', ');
    modal({ title: isNew ? 'New piece' : edit ? 'Edit piece' : d.name, wide: true, html: `<div class="fgrid"><div class="full"><div id="ph">${thumbs(photos, 'big')}</div>${edit ? '<button class="btn" id="cam" style="margin-top:10px">Take / add photos</button> <button class="btn ghost" id="rmp" style="margin-top:10px">Remove last photo</button>' : ''}</div>
      <label class="f full">Name<input id="n" value="${esc(d.name)}" ${edit ? '' : 'disabled'}></label>
      <label class="f">Category<select id="c" ${edit ? '' : 'disabled'}>${S.d.categories.map(c => `<option value="${c.id}" ${c.id === d.cat ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
      <label class="f">Price (Rs)<input id="p" type="number" inputmode="numeric" value="${d.price || ''}" ${edit ? '' : 'disabled'}></label>
      <label class="f full">Sizes (optional, e.g. Queen, King +12000)<input id="sz" value="${esc(sizeText)}" ${edit ? '' : 'disabled'}></label>
      <label class="f">On the showroom floor<input id="s1" type="number" value="${d.stock.showroom}" ${edit ? '' : 'disabled'}></label><label class="f">In the store / warehouse<input id="s2" type="number" value="${d.stock.warehouse}" ${edit ? '' : 'disabled'}></label>
      <label class="f full">Description<textarea id="ds" ${edit ? '' : 'disabled'}>${esc(d.desc)}</textarea></label></div>`,
      actions: edit ? [...(isNew ? [] : [{ label: 'Delete', cls: 'danger', onClick: async () => { if (await confirmBox(`Delete ${d.name} from the catalogue?`)) { S.d.items = S.d.items.filter(x => x !== it); log('catalogue', `Removed from catalogue: ${d.name}`); save(); draw(); } else return false; } }]),
        { label: 'Save', cls: 'gold', onClick: el => {
          const name = $('#n', el).value.trim(), price = +$('#p', el).value; if (!name || !price) { toast('Name and price are needed', 'bad'); return false; }
          d.name = name; d.price = price; d.cat = $('#c', el).value; d.desc = $('#ds', el).value.trim(); d.photos = photos;
          d.stock = { showroom: +$('#s1', el).value || 0, warehouse: +$('#s2', el).value || 0 };
          d.sizes = $('#sz', el).value.split(',').map(x => x.trim()).filter(Boolean).map(x => { const m = x.match(/^(.*?)\s*\+\s*(\d+)$/); return m ? { n: m[1], d: +m[2] } : { n: x, d: 0 }; });
          if (isNew) { S.d.items.unshift(d); log('catalogue', `New piece added: ${d.name} (${photos.length} photo${photos.length === 1 ? '' : 's'})`); } else log('catalogue', `Updated: ${d.name}`);
          save(); draw(); toast('Saved');
        } }] : [{ label: 'Close', cls: 'ghost', onClick: () => { } }],
      onOpen: el => {
        if (!edit) return; const redraw = () => { $('#ph', el).innerHTML = thumbs(photos, 'big'); };
        $('#cam', el).onclick = async () => { photos.push(...await pickPhotos()); redraw(); };
        $('#rmp', el).onclick = () => { photos.pop(); redraw(); };
      } });
  }
}
