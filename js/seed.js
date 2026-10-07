/* Sample data for the demo: a showroom catalogue, a small team, and ~10 weeks of believable sales. */
import { S, iso, addDays } from './store.js';
import { createSale, addPayment, moveJob, schedule } from './logic.js';

export const SEED_V = 3;
export const CATEGORIES = [
  ['sofas', 'Sofas & Sectionals'], ['beds', 'Beds & Bedroom Sets'], ['dressing', 'Dressing Tables & Mirrors'], ['wardrobes', 'Wardrobes & Cupboards'],
  ['dining', 'Dining Tables & Chairs'], ['armchairs', 'Armchairs & Accent Chairs'], ['ottomans', 'Ottomans & Poufs'], ['tables', 'Coffee & Side Tables'],
  ['tv', 'TV Consoles & Units'], ['storage', 'Shelves & Shoe Racks'], ['study', 'Study & Office'], ['kids', 'Kids Furniture'], ['mattress', 'Mattresses'], ['decor', 'Decor & Lighting']
].map(([id, name]) => ({ id, name }));

const bedSizes = [{ n: 'Queen', d: 0 }, { n: 'King', d: 12000 }];
const P = 'assets/products/';
const ITEMS = [
  ['wingback-chair', 'armchairs', 'Wingback Accent Chairs (pair)', 36000, 'wingback-chair.jpg', null, 4, 6],
  ['round-ottoman', 'ottomans', 'Round Cushion Ottoman', 14500, 'round-ottoman.jpg', null, 5, 8],
  ['sage-lounge-chair', 'armchairs', 'Sage Lounge Chair', 28500, 'sage-lounge-chair.jpg', null, 3, 4],
  ['boucle-chairs', 'armchairs', 'Boucle Accent Chairs (pair)', 42000, 'boucle-chairs.jpg', null, 2, 4],
  ['panel-bed', 'beds', 'Panel Headboard Bed', 118000, 'panel-bed.jpg', bedSizes, 1, 3],
  ['carved-bed-set', 'beds', 'Carved Royal Bedroom Set', 245000, 'carved-bed-set.jpg', null, 1, 1],
  ['inlay-bed', 'beds', 'Inlay Wooden Bed', 135000, 'inlay-bed.jpg', bedSizes, 1, 2],
  ['solid-wood-bed', 'beds', 'Solid Wood Premium Bed', 128000, 'solid-wood-bed.jpg', bedSizes, 1, 2],
  ['upholstered-bed', 'beds', 'Upholstered Modern Bed', 98000, 'upholstered-bed.jpg', bedSizes, 2, 3],
  ['sheesham-bed', 'beds', 'Sheesham & Velvet Bed', 112000, 'sheesham-bed.jpg', bedSizes, 1, 2]
];

const CUSTOMS = [
  { name: 'Custom 3-seater sofa', price: 96000, img: 'sofa-scene.jpg', dims: '220 x 95 x 85 cm', wood: 'Sheesham frame', fabric: 'Grey velvet', colour: 'Grey', notes: 'Deep seat, tight back cushions' },
  { name: 'Custom bed with storage', price: 138000, img: 'solid-wood-bed.jpg', dims: 'King, 6.5 x 6 ft', wood: 'Solid sheesham', fabric: 'Walnut polish', colour: 'Walnut', notes: 'Hydraulic storage, tall headboard' },
  { name: 'Custom wingback chairs (pair)', price: 52000, img: 'wingback-chair.jpg', dims: 'Standard', wood: 'Beech legs', fabric: 'Mocha fabric', colour: 'Mocha', notes: 'Match the sofa colour sample' },
  { name: 'Custom upholstered bed', price: 112000, img: 'upholstered-bed.jpg', dims: 'Queen', wood: 'Pine frame', fabric: 'Cream suede', colour: 'Cream', notes: 'Channel stitched headboard' }
];

const NAMES = [['Zainab Malik', 'Satellite Town'], ['Imran Qureshi', 'Bahria Town'], ['Farah Siddiqui', 'Westridge'], ['Hassan Raza', 'Chaklala'],
  ['Nadia Aslam', 'Saddar'], ['Tariq Mehmood', 'Adiala Road'], ['Ayesha Khan', 'Satellite Town'], ['Kamran Butt', 'Bahria Town']];

function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export function seed() {
  const rand = rng(20261007), pick = a => a[Math.floor(rand() * a.length)];
  const d = {
    v: SEED_V,
    settings: { shop: 'Woodish Furniture', phone: '0347 4747751', address: 'Kuri Road, Amer Pura Mohalla Chowk, Rawalpindi 46000', ntn: '', strn: '', taxPct: 18, downPct: 30, months: 6, discountPinPct: 10, nextInv: 1001 },
    users: [
      { id: 'u-owner', name: 'Owner', role: 'owner', pin: '1111', active: true, color: '#f6bd1f' },
      { id: 'u-mgr', name: 'Hamza', role: 'manager', pin: '2222', active: true, color: '#6fd0a0' },
      { id: 'u-ali', name: 'Ali', role: 'sales', pin: '3333', active: true, color: '#7fb4ff' },
      { id: 'u-sara', name: 'Sara', role: 'sales', pin: '4444', active: true, color: '#ff9db1' },
      { id: 'u-bilal', name: 'Bilal', role: 'sales', pin: '5555', active: true, color: '#c4a3ff' },
      { id: 'u-usman', name: 'Usman', role: 'workshop', pin: '6666', active: true, color: '#ffb36b' }
    ],
    categories: CATEGORIES,
    items: ITEMS.map(([id, cat, name, price, img, sizes, show, wh]) => ({
      id, cat, name, price, desc: '', photos: [P + img], sizes: sizes || [], stock: { showroom: show, warehouse: wh }
    })),
    customers: NAMES.map(([name, area], i) => ({ id: 'c' + i, name, area, address: area + ', Rawalpindi', phone: '0300 000 00' + String(10 + i), notes: '' })),
    sales: [], jobs: [], events: []
  };
  const prev = { d: S.d, user: S.user, clock: S.clock };
  S.d = d;
  const sellers = d.users.filter(u => u.role === 'sales' || u.role === 'manager');
  const owner = d.users[0], carpenter = d.users[5];
  const stamp = (day, h) => { const x = addDays(new Date(), -day); x.setHours(h, Math.floor(rand() * 59), 0, 0); return x; };

  for (let day = 70; day >= 0; day--) {
    const hr = new Date().getHours(); if (day === 0 && hr < 10) continue;
    const n = day <= 2 ? 1 + (rand() < 0.5 ? 1 : 0) : rand() < 0.35 ? 0 : rand() < 0.7 ? 1 : 2;
    for (let k = 0; k < n; k++) {
      const when = stamp(day, day === 0 ? 10 + Math.floor(rand() * Math.max(1, hr - 10)) : 10 + Math.floor(rand() * 9));
      S.clock = when.toISOString(); S.user = pick(sellers);
      const cust = pick(d.customers), custom = rand() < 0.26;
      const it = pick(d.items), size = it.sizes.length ? pick(it.sizes) : null;
      const lines = [{ itemId: it.id, name: it.name, qty: 1, unit: it.price + (size ? size.d : 0), size: size ? size.n : '', colour: '', photo: it.photos[0], custom: null }];
      if (rand() < 0.3) { const o = pick(d.items.filter(x => !x.sizes.length)); lines.push({ itemId: o.id, name: o.name, qty: 1, unit: o.price, size: '', colour: '', photo: o.photos[0], custom: null }); }
      if (custom) {
        const cp = pick(CUSTOMS);
        lines.push({ itemId: null, name: cp.name, qty: 1, unit: cp.price, size: '', colour: cp.colour, photo: P + cp.img,
          custom: { dims: cp.dims, wood: cp.wood, fabric: cp.fabric, colour: cp.colour, notes: cp.notes, photos: [P + cp.img], due: iso(addDays(when, 21)) } });
      }
      const sub = lines.reduce((s, l) => s + l.qty * l.unit, 0), r = rand();
      const mode = custom || r > 0.8 ? 'plan' : r > 0.62 ? 'deposit' : 'full';
      const delivers = rand() < 0.5 || mode !== 'full';
      const sale = createSale({
        customerId: mode === 'full' && rand() < 0.3 ? null : cust.id, lines, discount: rand() < 0.2 ? Math.round(sub * 0.05 / 500) * 500 : 0,
        delivery: delivers ? { date: iso(addDays(when, 3 + Math.floor(rand() * 5))), slot: pick(['Morning', 'Afternoon', 'Evening']), area: cust.area, address: cust.address, fee: pick([0, 1500, 2500]) } : null,
        payMode: mode, payNow: mode === 'plan' ? Math.round(sub * 0.3 / 500) * 500 : Math.round(sub * 0.5 / 500) * 500,
        method: pick(['Cash', 'Cash', 'Bank transfer', 'Card', 'Easypaisa']), months: pick([4, 6, 6, 9, 12])
      });
      if (sale.delivery) sale.delivery.status = new Date(sale.delivery.date) < addDays(new Date(), -1) ? 'delivered' : rand() < 0.2 ? 'out' : 'scheduled';
      if (sale.delivery) sale.delivery.driver = pick(['Rizwan', 'Shahid']);
      // later payments: good payers keep up, one in four falls behind
      if (mode === 'deposit' && day > 8) { S.clock = addDays(when, 6).toISOString(); S.user = owner; addPayment(sale, sale.total, 'Cash', 'Balance on delivery'); }
      if (mode === 'plan') {
        const lag = rand() < 0.28; 
        for (const it2 of schedule(sale)) {
          if (new Date(it2.due) > new Date()) break;
          if (lag && it2.n > 1) break;
          S.clock = new Date(it2.due + 'T14:00:00').toISOString(); S.user = pick(sellers); addPayment(sale, it2.amt, pick(['Cash', 'Bank transfer', 'Easypaisa']), 'Instalment ' + it2.n);
        }
      }
      d.jobs.filter(j => j.saleId === sale.id).forEach(j => {
        const age = day, steps = age > 30 ? 4 : age > 18 ? 3 : age > 9 ? 2 : age > 3 ? 1 : 0;
        ['building', 'finishing', 'ready', 'delivered'].slice(0, steps).forEach((st, i) => { S.clock = addDays(when, 2 + i * 5).toISOString(); S.user = carpenter; if (i === 0) j.carpenter = carpenter.id; moveJob(j, st); });
      });
    }
  }
  ITEMS.forEach(([id, , , , , , show, wh]) => { d.items.find(i => i.id === id).stock = { showroom: show, warehouse: wh }; }); // the shop restocks
  S.d = prev.d; S.user = prev.user; S.clock = prev.clock;
  return d;
}
