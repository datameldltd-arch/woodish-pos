/* Shared UI helpers: modal, toast, PIN pad, photo picker, small html bits. */
import { S, esc, addPhoto, photoSrc } from './store.js';

export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const ROLE = { owner: 'Owner', manager: 'Manager', sales: 'Sales', workshop: 'Carpenter' };

export const avatar = (u, size = 30) => u ? `<span class="av" style="--c:${u.color};width:${size}px;height:${size}px;font-size:${size * .45}px" title="${esc(u.name)}">${esc(u.name[0])}</span>` : '';
export const who = u => u ? `<span class="who">${avatar(u, 22)}${esc(u.name)}</span>` : '';
export const img = (ref, cls = '') => ref ? `<img class="${cls}" src="${esc(photoSrc(ref))}" alt="" loading="lazy">` : `<span class="noimg ${cls}">No photo</span>`;
export const pill = (text, tone = '') => `<span class="pill ${tone}">${esc(text)}</span>`;
export const empty = text => `<div class="empty">${esc(text)}</div>`;

let toastT;
export function toast(msg, tone) {
  const t = $('#toast'); t.textContent = msg; t.className = 'toast on ' + (tone || '');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600);
}

export function modal({ title, html, wide, actions = [], onOpen, cls = '' }) {
  const root = document.createElement('div');
  root.className = 'modal-wrap';
  root.innerHTML = `<div class="modal ${wide ? 'wide' : ''} ${cls}" role="dialog" aria-modal="true">
    <div class="modal-head"><h3>${esc(title || '')}</h3><button class="x" data-close aria-label="Close">&times;</button></div>
    <div class="modal-body">${html}</div>
    ${actions.length ? `<div class="modal-foot">${actions.map((a, i) => `<button class="btn ${a.cls || ''}" data-a="${i}">${esc(a.label)}</button>`).join('')}</div>` : ''}</div>`;
  document.body.appendChild(root);
  requestAnimationFrame(() => root.classList.add('on'));
  const close = () => { root.classList.remove('on'); setTimeout(() => root.remove(), 200); document.removeEventListener('keydown', key); };
  const key = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', key);
  root.addEventListener('click', async e => {
    if (e.target === root || e.target.closest('[data-close]')) return close();
    const b = e.target.closest('[data-a]');
    if (b) { const a = actions[+b.dataset.a]; const r = await a.onClick(root, close); if (r !== false) close(); }
  });
  onOpen && onOpen(root, close);
  return { el: root, close };
}

export function confirmBox(msg, label = 'Yes, do it', cls = 'danger') {
  return new Promise(res => {
    let done = false;
    const m = modal({ title: 'Please confirm', html: `<p>${esc(msg)}</p>`, actions: [
      { label: 'Cancel', cls: 'ghost', onClick: () => { done = true; res(false); } },
      { label, cls, onClick: () => { done = true; res(true); } }] });
    m.el.addEventListener('click', e => { if (!done && (e.target === m.el || e.target.closest('[data-close]'))) { done = true; res(false); } });
  });
}

/* Ask for a manager/owner PIN. Resolves to that user, or null. */
export function pinPrompt(reason, roles = ['owner', 'manager']) {
  return new Promise(res => {
    let pin = '', settled = false;
    const m = modal({ title: 'Approval needed', cls: 'pinbox', html: `<p class="mute">${esc(reason)}</p><div class="pin-dots" id="pd">${'<i></i>'.repeat(4)}</div><div class="pin-err" id="pe"></div>
      <div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '<'].map(k => `<button type="button" data-k="${k}">${k === '<' ? '&#9003;' : k}</button>`).join('')}</div>`,
      onOpen: el => {
        const dots = $$('#pd i', el);
        el.addEventListener('click', e => {
          const b = e.target.closest('[data-k]'); if (!b) return; const k = b.dataset.k;
          if (k === 'C') pin = ''; else if (k === '<') pin = pin.slice(0, -1); else if (pin.length < 4) pin += k;
          dots.forEach((d, i) => d.classList.toggle('f', i < pin.length));
          if (pin.length === 4) {
            const u = S.d.users.find(x => x.active && roles.includes(x.role) && x.pin === pin);
            if (u) { settled = true; res(u); m.close(); } else { $('#pe', el).textContent = 'Wrong PIN'; pin = ''; setTimeout(() => dots.forEach(d => d.classList.remove('f')), 250); }
          }
        });
      } });
    m.el.addEventListener('click', e => { if (!settled && (e.target === m.el || e.target.closest('[data-close]'))) { settled = true; res(null); } });
  });
}

/* Open the camera / photo library and return stored photo refs. */
export function pickPhotos(multiple = true) {
  return new Promise(res => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = multiple;
    inp.onchange = async () => {
      const refs = [];
      for (const f of inp.files) { try { refs.push(await addPhoto(f)); } catch (e) { toast('Could not read that photo', 'bad'); } }
      res(refs);
    };
    inp.addEventListener('cancel', () => res([]));
    inp.click();
  });
}

export const thumbs = (refs, cls = '') => refs.length ? `<div class="thumbs ${cls}">${refs.map(r => `<img src="${esc(photoSrc(r))}" alt="" data-zoom="${esc(r)}">`).join('')}</div>` : '';

/* click any [data-zoom] image to see it large */
document.addEventListener('click', e => {
  const z = e.target.closest('[data-zoom]'); if (!z) return;
  modal({ title: '', wide: true, cls: 'zoom', html: `<img class="zoomimg" src="${esc(photoSrc(z.dataset.zoom))}" alt="">` });
});
