/* Business rules: totals, tax, instalment plans, payments, workshop jobs, deliveries. */
import { S, uid, by, log, nowIso, iso, addMonths, money, custName } from './store.js';

export const JOB_STAGES = [
  { id: 'queued', label: 'Queued' }, { id: 'building', label: 'In workshop' },
  { id: 'finishing', label: 'Finishing' }, { id: 'ready', label: 'Ready' }, { id: 'delivered', label: 'Handed over' }
];
export const METHODS = ['Cash', 'Bank transfer', 'Card', 'Easypaisa', 'JazzCash', 'Cheque'];

export const lineTotal = l => l.qty * l.unit;
export const subtotal = lines => lines.reduce((s, l) => s + lineTotal(l), 0);
export function totals(lines, discount, fee) {
  const sub = subtotal(lines), disc = Math.min(sub, Math.max(0, discount || 0)), f = fee || 0;
  const total = sub - disc + f, r = (S.d.settings.taxPct || 0) / 100;
  const net = r ? total / (1 + r) : total; // prices are tax-inclusive
  return { sub, disc, fee: f, total, net, tax: total - net };
}
export const paidOf = sale => sale.payments.reduce((s, p) => s + p.amt, 0);
export const balanceOf = sale => Math.max(0, sale.total - paidOf(sale));
export const hasCustom = sale => sale.lines.some(l => l.custom);

/* Instalments: payments beyond the down payment are applied to the oldest unpaid instalment first. */
export function schedule(sale) {
  if (!sale.plan) return [];
  let pool = Math.max(0, paidOf(sale) - sale.plan.down);
  return sale.plan.items.map(it => { const got = Math.min(it.amt, pool); pool -= got; return { ...it, got, left: it.amt - got }; });
}
export function planFor(total, down, months, from) {
  const rest = Math.max(0, total - down), n = Math.max(1, months), base = Math.floor(rest / n);
  const items = Array.from({ length: n }, (_, i) => ({ n: i + 1, due: iso(addMonths(from, i + 1)), amt: i === n - 1 ? rest - base * (n - 1) : base }));
  return { down, months: n, items };
}

function nextNo() { const s = S.d.settings, no = 'WF-' + s.nextInv; s.nextInv += 1; return no; }

/* draft: {customerId, lines, discount, delivery, payMode, payNow, method, months, note} */
export function createSale(draft) {
  const d = S.d, at = nowIso();
  const lines = draft.lines.map(l => ({ ...l }));
  const t = totals(lines, draft.discount, draft.delivery ? draft.delivery.fee : 0);
  const sale = {
    id: uid(), no: nextNo(), at, userId: S.user.id, customerId: draft.customerId || null, lines, discount: t.disc,
    total: t.total, delivery: draft.delivery ? { ...draft.delivery, status: 'scheduled', driver: '' } : null,
    payments: [], plan: null, note: draft.note || ''
  };
  const now = draft.payMode === 'full' ? t.total : Math.min(t.total, Math.max(0, draft.payNow || 0));
  if (draft.payMode === 'plan') sale.plan = planFor(t.total, now, draft.months, new Date(at));
  if (now > 0) sale.payments.push({ id: uid(), at, amt: now, method: draft.method || 'Cash', userId: S.user.id, note: draft.payMode === 'plan' ? 'Down payment' : draft.payMode === 'deposit' ? 'Deposit' : '' });
  d.sales.unshift(sale);

  lines.forEach((l, idx) => {
    if (l.custom) {
      d.jobs.push({
        id: uid(), saleId: sale.id, lineIdx: idx, name: l.name, spec: l.custom, photos: [...(l.custom.photos || [])], progress: [],
        status: 'queued', due: l.custom.due || '', carpenter: null, notes: '', history: [{ at, userId: S.user.id, status: 'queued' }]
      });
      log('job', `Custom order sent to workshop: ${l.name} (${sale.no})`, sale.id);
    } else if (l.itemId) {
      const it = by(d.items, l.itemId);
      if (it) { let q = l.qty; const take = Math.min(q, it.stock.showroom); it.stock.showroom -= take; q -= take; it.stock.warehouse = Math.max(0, it.stock.warehouse - q); }
    }
  });
  const how = draft.payMode === 'plan' ? `instalment plan, ${money(now)} down` : draft.payMode === 'deposit' ? `${money(now)} deposit` : 'paid in full';
  log('sale', `${sale.no}: ${money(t.total)} to ${custName(sale.customerId)} (${how})`, sale.id);
  if (sale.delivery) log('delivery', `Delivery booked for ${sale.no} on ${sale.delivery.date}`, sale.id);
  return sale;
}

export function addPayment(sale, amt, method, note) {
  const a = Math.min(amt, balanceOf(sale)); if (a <= 0) return null;
  const p = { id: uid(), at: nowIso(), amt: a, method, userId: S.user.id, note: note || '' };
  sale.payments.push(p);
  log('payment', `${money(a)} received on ${sale.no} from ${custName(sale.customerId)} (${method})`, sale.id);
  return p;
}

export function moveJob(job, status, note) {
  job.status = status; if (note) job.notes = note;
  job.history.push({ at: nowIso(), userId: S.user.id, status });
  const label = JOB_STAGES.find(s => s.id === status).label;
  log('job', `Workshop: ${job.name} moved to "${label}"`, job.saleId);
}
export function setDeliveryStatus(sale, status) {
  sale.delivery.status = status;
  log('delivery', `Delivery for ${sale.no} marked ${status}`, sale.id);
}
export const dueOverdue = sale => schedule(sale).filter(i => i.left > 0 && i.due < iso(new Date()));
