/* State, persistence and small helpers. Everything lives in this browser (IndexedDB) for the demo;
 * the real build swaps this file's load/save for a shared database. */
import { seed, SEED_V } from './seed.js';

export const S = { d: null, user: null };
const listeners = new Set();
export const onChange = fn => (listeners.add(fn), () => listeners.delete(fn));

/* ---------- tiny IndexedDB key-value store ---------- */
let idb;
function open() {
  return idb || (idb = new Promise((res, rej) => {
    const r = indexedDB.open('woodish-pos-demo', 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('kv'); r.result.createObjectStore('photos'); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }));
}
async function tx(store, mode, fn) {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction(store, mode), s = t.objectStore(store), out = fn(s);
    t.oncomplete = () => res(out && 'result' in out ? out.result : undefined); t.onerror = () => rej(t.error);
  });
}

/* ---------- photos: stored as compressed JPEG blobs, referenced as "idb:<id>" ---------- */
const urls = new Map();
export const photoSrc = ref => !ref ? '' : ref.startsWith('idb:') ? (urls.get(ref) || '') : ref;
async function loadPhotos() {
  const db = await open();
  await new Promise(res => {
    const c = db.transaction('photos').objectStore('photos').openCursor();
    c.onsuccess = () => { const cur = c.result; if (!cur) return res(); urls.set('idb:' + cur.key, URL.createObjectURL(cur.value)); cur.continue(); };
    c.onerror = res;
  });
}
export async function addPhoto(file) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
  const cv = document.createElement('canvas'); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
  cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
  const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.82));
  const id = uid();
  await tx('photos', 'readwrite', s => s.put(blob, id));
  urls.set('idb:' + id, URL.createObjectURL(blob));
  return 'idb:' + id;
}

/* ---------- state ---------- */
let timer;
export async function load() {
  await loadPhotos();
  const saved = await tx('kv', 'readonly', s => s.get('state'));
  S.d = saved && saved.v === SEED_V ? saved : seed();
  if (S.d !== saved) await persist();
  const uidSaved = sessionStorage.getItem('wf.user');
  S.user = S.d.users.find(u => u.id === uidSaved && u.active) || null;
}
const persist = () => tx('kv', 'readwrite', s => s.put(JSON.parse(JSON.stringify(S.d)), 'state'));
export function save() { clearTimeout(timer); timer = setTimeout(persist, 150); listeners.forEach(f => f()); }
export async function resetDemo() { S.d = seed(); await persist(); }
export function login(u) { S.user = u; sessionStorage.setItem('wf.user', u.id); }
export function logout() { S.user = null; sessionStorage.removeItem('wf.user'); }

/* ---------- helpers ---------- */
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-3);
export const money = n => 'Rs ' + Math.round(n || 0).toLocaleString('en-PK');
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const iso = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
export const today = () => iso(new Date());
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const addMonths = (d, n) => { const x = new Date(d), day = x.getDate(); x.setMonth(x.getMonth() + n); if (x.getDate() < day) x.setDate(0); return x; };
export const fmtDate = d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
export const fmtShort = d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
export const fmtTime = d => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
export const by = (arr, id) => arr.find(x => x.id === id);
export const userName = id => (by(S.d.users, id) || { name: 'Unknown' }).name;
export const custName = id => id ? (by(S.d.customers, id) || { name: 'Unknown' }).name : 'Walk-in customer';
/* S.clock lets the seed data stamp events in the past */
export const nowIso = () => S.clock || new Date().toISOString();
export const log = (type, text, ref) => { S.d.events.unshift({ id: uid(), at: nowIso(), userId: S.user ? S.user.id : null, type, text, ref: ref || null }); };

export function waNumber(p) {
  const n = String(p || '').replace(/\D/g, '');
  return n.startsWith('92') ? n : n.startsWith('0') ? '92' + n.slice(1) : n;
}
export const waLink = (phone, text) => `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(text)}`;
