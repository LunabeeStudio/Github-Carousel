// Full-screen carousel overlay. GHCCarousel.open(rows, rowIndex, cellIndex, opener)
// takes the rows built by content.js: [{ label, cells: [{ header, alt, src, href }] }].
const GHCCarousel = (() => {
  const el = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };

  const TEMPLATE = `
    <div class="ghc-top">
      <div class="ghc-title"><strong class="ghc-label" id="ghc-label"></strong><span class="ghc-count"></span></div>
      <div class="ghc-tools">
        <span class="ghc-seg" role="group" aria-label="One slide shows">
          <button class="ghc-btn" type="button" data-mode="row">Rows</button><button class="ghc-btn" type="button" data-mode="single">Images</button>
        </span>
        <span class="ghc-zoom" aria-live="polite">Fit</span>
        <button class="ghc-btn" type="button" data-act="out" aria-label="Zoom out">−</button>
        <button class="ghc-btn" type="button" data-act="in" aria-label="Zoom in">+</button>
        <button class="ghc-btn" type="button" data-act="fit">Fit</button>
        <button class="ghc-btn" type="button" data-act="actual">1:1</button>
        <label class="ghc-check"><input type="checkbox" class="ghc-sync"> Sync zoom</label>
        <button class="ghc-btn" type="button" data-act="original">Open original</button>
        <button class="ghc-btn ghc-close" type="button" data-act="close" aria-label="Close carousel">✕</button>
      </div>
    </div>
    <div class="ghc-stage">
      <button class="ghc-nav ghc-prev" type="button" data-act="prev" aria-label="Previous slide">‹</button>
      <div class="ghc-panels"></div>
      <button class="ghc-nav ghc-next" type="button" data-act="next" aria-label="Next slide">›</button>
    </div>
    <div class="ghc-strip" aria-label="Slides"></div>
    <div class="ghc-keys"><kbd>←</kbd> <kbd>→</kbd> slides · scroll or pinch to zoom · drag to pan · double-click to zoom · <kbd>S</kbd> sync · <kbd>O</kbd> original · <kbd>Esc</kbd> close</div>`;

  let ov = null, panelsEl, stripEl, zoomEl;
  let S = null;
  const q = s => ov.querySelector(s);
  const opts = () => GHCSettings.get();

  function ensureOverlay() {
    if (ov) return;
    ov = el('div', 'ghc-overlay');
    ov.hidden = true;
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.setAttribute('aria-labelledby', 'ghc-label');
    ov.innerHTML = TEMPLATE;
    document.body.append(ov);
    panelsEl = q('.ghc-panels'); stripEl = q('.ghc-strip'); zoomEl = q('.ghc-zoom');
    ov.addEventListener('click', e => {
      if (!S) return;
      const act = e.target.closest('[data-act]');
      if (act) return ACTIONS[act.dataset.act]();
      const mode = e.target.closest('[data-mode]');
      if (mode) GHCSettings.set({ mode: mode.dataset.mode });
    });
    q('.ghc-sync').addEventListener('change', e => setSync(e.target.checked));
  }

  // Side by side stops being readable past this many images in one row.
  const MAX_ROW_PANELS = 4;

  function buildSlides(rows, mode) {
    if (mode === 'row') return rows.map((r, ri) => ({ title: r.label || `Row ${ri + 1}`, cells: r.cells, ri, ci: null }));
    let n = 0;
    return rows.flatMap((r, ri) => r.cells.map((c, ci) => {
      n++;
      return { title: [r.label, c.header].filter(Boolean).join(' · ') || `Image ${n}`, cells: [c], ri, ci };
    }));
  }
  const indexOf = (ri, ci) => Math.max(0, S.slides.findIndex(s => s.ri === ri && (s.ci === null || s.ci === ci)));

  function open(rows, ri, ci, opener) {
    ensureOverlay();
    savedMode = opts().mode;
    const wide = rows.some(r => r.cells.length > MAX_ROW_PANELS);
    S = { rows, mode: wide ? 'single' : opts().mode, slides: [], i: 0, T: [], opener, active: ci };
    S.slides = buildSlides(rows, S.mode);
    S.i = indexOf(ri, ci);
    syncToolbar();
    ov.hidden = false;
    document.documentElement.classList.add('ghc-lock');
    buildStrip();
    render([]);
    q('.ghc-close').focus();
  }

  function close() {
    if (!S) return;
    ov.hidden = true;
    document.documentElement.classList.remove('ghc-lock');
    const opener = S.opener;
    S = null;
    panelsEl.innerHTML = '';
    stripEl.innerHTML = '';
    if (opener?.isConnected) opener.focus();
  }

  function go(i) {
    if (!S || i < 0 || i >= S.slides.length || i === S.i) return;
    const prev = S.T;
    S.i = i;
    render(prev);
  }

  function applyMode(mode) {
    if (!S || S.mode === mode) return;
    const sl = S.slides[S.i];
    const ci = sl.ci ?? Math.min(S.active, sl.cells.length - 1);
    S.mode = mode;
    S.slides = buildSlides(S.rows, mode);
    S.i = indexOf(sl.ri, ci);
    S.active = ci;
    buildStrip();
    render([]);
  }

  function syncToolbar() {
    const o = opts();
    ov.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === (S?.mode ?? o.mode))));
    q('.ghc-sync').checked = o.sync;
  }

  function buildStrip() {
    stripEl.innerHTML = '';
    S.slides.forEach((sl, i) => {
      const b = el('button', 'ghc-thumb');
      b.type = 'button';
      const imgs = el('span', 'ghc-thumb-imgs');
      sl.cells.forEach(c => { const im = new Image(); im.src = c.src; im.alt = ''; imgs.append(im); });
      const lbl = el('span');
      lbl.textContent = sl.title;
      b.append(imgs, lbl);
      b.addEventListener('click', () => go(i));
      stripEl.append(b);
    });
  }

  function render(prev) {
    const sl = S.slides[S.i];
    q('.ghc-label').textContent = sl.title;
    q('.ghc-count').textContent = `${S.i + 1} / ${S.slides.length}`;
    q('.ghc-prev').disabled = S.i === 0;
    q('.ghc-next').disabled = S.i === S.slides.length - 1;
    [...stripEl.children].forEach((b, i) => b.setAttribute('aria-current', String(i === S.i)));
    stripEl.children[S.i]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });

    panelsEl.innerHTML = '';
    S.T = sl.cells.map((c, j) => {
      const panel = el('div', 'ghc-panel'), cap = el('div', 'ghc-cap'), vp = el('div', 'ghc-vp'), img = new Image();
      // In single mode the title already names the image.
      cap.textContent = sl.cells.length > 1 ? c.header : '';
      img.src = c.src; img.alt = c.alt || c.header; img.draggable = false;
      vp.append(img); panel.append(cap, vp); panelsEl.append(panel);
      const t = { vp, img, s: 1, x: 0, y: 0, fw: 0, fh: 0, nw: 1, vw: 0, vh: 0, ready: false };
      bindViewport(t, j);
      return t;
    });
    requestAnimationFrame(() => S && S.T.forEach((t, j) => {
      const keep = opts().keep && prev[j]?.ready ? prev[j] : null;
      const done = () => S && fit(t, keep);
      if (t.img.complete && t.img.naturalWidth) done(); else t.img.onload = done;
    }));
  }

  function fit(t, keep) {
    t.vw = t.vp.clientWidth; t.vh = t.vp.clientHeight;
    t.nw = t.img.naturalWidth;
    const nh = t.img.naturalHeight, k = Math.min(t.vw / t.nw, t.vh / nh);
    t.fw = t.nw * k; t.fh = nh * k;
    t.img.style.width = `${t.fw}px`; t.img.style.height = `${t.fh}px`;
    if (keep) { t.s = keep.s; t.x = keep.x; t.y = keep.y; } else { t.s = 1; t.x = 0; t.y = 0; }
    t.ready = true;
    apply(t);
  }

  function apply(t) {
    const w = t.fw * t.s, h = t.fh * t.s;
    t.x = w <= t.vw ? (t.vw - w) / 2 : Math.min(0, Math.max(t.vw - w, t.x));
    t.y = h <= t.vh ? (t.vh - h) / 2 : Math.min(0, Math.max(t.vh - h, t.y));
    t.img.style.transform = `translate(${t.x}px, ${t.y}px) scale(${t.s})`;
    t.vp.classList.toggle('ghc-zoomed', t.s > 1.01);
    if (S && t === (S.T[S.active] ?? S.T[0])) zoomEl.textContent = t.s <= 1.001 ? 'Fit' : `${Math.round(t.s * t.fw / t.nw * 100)}%`;
  }

  const ready = () => S.T.filter(t => t.ready);
  const targets = j => opts().sync ? ready() : [S.T[j]].filter(t => t.ready);
  const maxScale = t => Math.max(4, (t.nw / t.fw) * 4);

  function zoomAt(list, f, px, py) {
    list.forEach(t => {
      const ns = Math.min(maxScale(t), Math.max(1, t.s * f));
      const pxx = px ?? t.vw / 2, pyy = py ?? t.vh / 2;
      t.x = pxx - (pxx - t.x) * (ns / t.s);
      t.y = pyy - (pyy - t.y) * (ns / t.s);
      t.s = ns;
      apply(t);
    });
  }
  const zoomTo = (list, fn) => list.forEach(t => zoomAt([t], fn(t) / t.s));
  const pan = (list, dx, dy) => list.forEach(t => { t.x += dx; t.y += dy; apply(t); });

  function bindViewport(t, j) {
    const vp = t.vp, pts = new Map();
    let last = { n: 0 }, start = null;
    const snap = () => {
      const a = [...pts.values()];
      if (a.length >= 2) return { n: 2, cx: (a[0].x + a[1].x) / 2, cy: (a[0].y + a[1].y) / 2, d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1 };
      if (a.length === 1) return { n: 1, cx: a[0].x, cy: a[0].y };
      return { n: 0 };
    };
    const local = (cx, cy) => { const r = vp.getBoundingClientRect(); return [cx - r.left, cy - r.top]; };

    vp.addEventListener('wheel', e => {
      e.preventDefault();
      const [px, py] = local(e.clientX, e.clientY);
      zoomAt(targets(j), Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), px, py);
    }, { passive: false });

    vp.addEventListener('pointerdown', e => {
      vp.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) start = { x: e.clientX, y: e.clientY };
      last = snap();
      S.active = j;
      vp.classList.add('ghc-dragging');
    });
    vp.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const cur = snap();
      if (cur.n === 1 && last.n === 1 && t.s > 1.01) pan(targets(j), cur.cx - last.cx, cur.cy - last.cy);
      if (cur.n === 2 && last.n === 2) {
        const [px, py] = local(cur.cx, cur.cy);
        zoomAt(targets(j), cur.d / last.d, px, py);
        pan(targets(j), cur.cx - last.cx, cur.cy - last.cy);
        start = null;
      }
      last = cur;
    });
    const end = e => {
      if (!pts.has(e.pointerId)) return;
      pts.delete(e.pointerId);
      last = snap();
      if (pts.size) return;
      vp.classList.remove('ghc-dragging');
      if (start && t.s <= 1.01 && e.type === 'pointerup') {
        const dx = e.clientX - start.x, dy = e.clientY - start.y;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(S.i + (dx < 0 ? 1 : -1));
      }
      start = null;
    };
    vp.addEventListener('pointerup', end);
    vp.addEventListener('pointercancel', end);

    vp.addEventListener('dblclick', e => {
      const [px, py] = local(e.clientX, e.clientY);
      if (t.s > 1.01) zoomTo(targets(j), () => 1);
      else zoomAt(targets(j), 2.5, px, py);
    });
  }

  function setSync(on) {
    GHCSettings.set({ sync: on });
    if (on && S && S.T[0]?.ready) {
      const a = S.T[0];
      ready().slice(1).forEach(t => { t.s = a.s; t.x = a.x; t.y = a.y; apply(t); });
    }
  }

  function openOriginal() {
    const cells = S.slides[S.i].cells;
    const c = cells[Math.min(S.active, cells.length - 1)] ?? cells[0];
    window.open(c.href || c.src, '_blank', 'noopener');
  }

  const ACTIONS = {
    prev: () => go(S.i - 1),
    next: () => go(S.i + 1),
    in: () => zoomAt(ready(), 1.25),
    out: () => zoomAt(ready(), 1 / 1.25),
    fit: () => zoomTo(ready(), () => 1),
    actual: () => zoomTo(ready(), t => t.nw / t.fw),
    original: openOriginal,
    close
  };

  // Capture phase on window, so GitHub hotkeys (s, /, t, .) never fire behind the overlay.
  window.addEventListener('keydown', e => {
    if (!S) return;
    e.stopPropagation();
    if (e.key === 'Tab') {
      const f = [...ov.querySelectorAll('button:not(:disabled), input')];
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { f[f.length - 1].focus(); e.preventDefault(); }
      else if (!e.shiftKey && i === f.length - 1) { f[0].focus(); e.preventDefault(); }
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const map = { Escape: 'close', ArrowLeft: 'prev', ArrowRight: 'next', '+': 'in', '=': 'in', '-': 'out', '0': 'fit', '1': 'actual', o: 'original', O: 'original' };
    if (map[e.key]) ACTIONS[map[e.key]]();
    else if (e.key === 's' || e.key === 'S') setSync(!opts().sync);
    else return;
    e.preventDefault();
  }, true);

  window.addEventListener('resize', () => S && S.T.forEach(t => t.ready && fit(t, null)));
  document.addEventListener('turbo:before-visit', close);
  window.addEventListener('popstate', close);

  // Only a real change of the saved mode switches the open carousel, so toggling
  // sync never undoes the automatic one-image mode of a wide table.
  let savedMode = null;
  GHCSettings.onChange(o => {
    const modeChanged = savedMode !== null && o.mode !== savedMode;
    savedMode = o.mode;
    if (!S) return;
    if (modeChanged) applyMode(o.mode);
    syncToolbar();
  });

  return { open, close };
})();
