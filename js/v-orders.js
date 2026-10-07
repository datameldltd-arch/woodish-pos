/* Workshop: made-to-order pieces moving from queued to handed over, with progress photos. */
import { S, esc, by, fmtShort, fmtDate, fmtTime, today, userName, custName, save } from './store.js';
import { $, modal, who, img, pill, thumbs, pickPhotos, toast } from './ui.js';
import { JOB_STAGES, moveJob } from './logic.js';

export function render(root) {
  const canMove = ['owner', 'manager', 'workshop'].includes(S.user.role);
  root.innerHTML = `<div class="page-head"><h2>Workshop</h2><span class="mute">${S.d.jobs.filter(j => j.status !== 'delivered').length} pieces in progress</span></div><div class="board" id="bd"></div>`;
  const draw = () => {
    $('#bd', root).innerHTML = JOB_STAGES.map(st => {
      let jobs = S.d.jobs.filter(j => j.status === st.id).sort((a, b) => (a.due || 'z').localeCompare(b.due || 'z'));
      if (st.id === 'delivered') jobs = jobs.slice(-8).reverse();
      return `<div class="col"><h4><span>${st.label}</span><span>${jobs.length}</span></h4>${jobs.map(j => {
        const sale = by(S.d.sales, j.saleId), late = j.due && j.due < today() && !['ready', 'delivered'].includes(j.status);
        return `<button class="job" data-j="${j.id}">${img((j.progress.slice(-1)[0]) || j.photos[0])}<div><b>${esc(j.name)}</b><small>${esc(sale ? sale.no : '')} &middot; ${esc(custName(sale && sale.customerId))}</small>
          <small class="${late ? 'bad' : ''}">${j.due ? 'Due ' + fmtShort(j.due) + (late ? ' - late' : '') : 'No date'}</small>${j.carpenter ? `<small>${esc(userName(j.carpenter))}</small>` : ''}</div></button>`;
      }).join('') || '<div class="dim" style="font-size:.8rem;padding:8px">Nothing here</div>'}</div>`;
    }).join('');
  };
  draw();
  $('#bd', root).onclick = e => { const b = e.target.closest('[data-j]'); if (b) open(by(S.d.jobs, b.dataset.j)); };

  function open(j) {
    const sale = by(S.d.sales, j.saleId), sp = j.spec || {}, idx = JOB_STAGES.findIndex(s => s.id === j.status);
    const m = modal({ title: j.name, wide: true, html: `<div class="two" style="grid-template-columns:1.2fr 1fr">
      <div class="card"><div class="fgrid"><div><small class="dim">Size</small><br>${esc(sp.dims || '-')}</div><div><small class="dim">Wood / frame</small><br>${esc(sp.wood || '-')}</div><div><small class="dim">Fabric / finish</small><br>${esc(sp.fabric || '-')}</div><div><small class="dim">Colour</small><br>${esc(sp.colour || '-')}</div>
        <div class="full"><small class="dim">Notes from the shop</small><br>${esc(sp.notes || '-')}</div></div>
        <p style="margin-top:10px"><small class="dim">Customer</small><br>${esc(custName(sale && sale.customerId))} &middot; ${esc(sale ? sale.no : '')} &middot; promised ${j.due ? fmtDate(j.due) : '-'}</p></div>
      <div class="card"><b>Reference photos</b><div style="margin-top:8px">${thumbs(j.photos) || '<span class="dim">None</span>'}</div></div></div>
      <div class="card"><div class="row"><b>Progress photos</b>${canMove ? '<button class="btn sm" id="pp">+ Add photo</button>' : ''}</div><div id="pg" style="margin-top:8px">${thumbs(j.progress) || '<span class="dim">No progress photos yet.</span>'}</div></div>
      ${canMove ? `<div class="fgrid"><label class="f">Carpenter<select id="cp"><option value="">Unassigned</option>${S.d.users.filter(u => u.role === 'workshop' && u.active).map(u => `<option value="${u.id}" ${j.carpenter === u.id ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select></label>
        <label class="f">Workshop note<input id="nt" value="${esc(j.notes)}"></label></div>` : j.notes ? `<p class="mute">Workshop note: ${esc(j.notes)}</p>` : ''}
      <div class="dim" style="font-size:.78rem">${j.history.map(h => `${esc(JOB_STAGES.find(s => s.id === h.status).label)} - ${esc(userName(h.userId))}, ${fmtShort(h.at)} ${fmtTime(h.at)}`).join(' &rsaquo; ')}</div>`,
      actions: canMove ? [
        ...(idx > 0 ? [{ label: '< ' + JOB_STAGES[idx - 1].label, cls: 'ghost', onClick: el => { apply(el, JOB_STAGES[idx - 1].id); } }] : []),
        { label: 'Save', cls: 'ghost', onClick: el => { apply(el, j.status); } },
        ...(idx < 4 ? [{ label: JOB_STAGES[idx + 1].label + ' >', cls: 'gold', onClick: el => { apply(el, JOB_STAGES[idx + 1].id); } }] : [])] : [{ label: 'Close', cls: 'ghost', onClick: () => { } }],
      onOpen: el => { const b = $('#pp', el); if (b) b.onclick = async () => { j.progress.push(...await pickPhotos()); save(); $('#pg', el).innerHTML = thumbs(j.progress); draw(); }; } });
    function apply(el, status) {
      const cp = $('#cp', el), nt = $('#nt', el);
      if (cp) j.carpenter = cp.value || null; if (nt) j.notes = nt.value.trim();
      if (status !== j.status) { moveJob(j, status); if (status === 'ready') toast('Marked ready - tell the customer'); }
      save(); draw();
    }
    return m;
  }
}
