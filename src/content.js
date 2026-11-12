// Finds screenshot tables in PR comments and adds the carousel trigger to each one.
(() => {
  const PR_PATH = /^\/[^/]+\/[^/]+\/pull\/\d+/;
  const ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.75 2.5h12.5c.966 0 1.75.784 1.75 1.75v7.5A1.75 1.75 0 0 1 14.25 13.5H1.75A1.75 1.75 0 0 1 0 11.75v-7.5C0 3.284.784 2.5 1.75 2.5Zm0 1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25ZM6 5.75v4.5a.25.25 0 0 0 .379.214l3.75-2.25a.25.25 0 0 0 0-.428l-3.75-2.25A.25.25 0 0 0 6 5.75Z"/></svg>';

  // Emoji, badges and avatars are images too; only count real screenshots.
  const isScreenshot = img => !img.classList.contains('emoji')
    && !(img.complete && img.naturalWidth && (img.naturalWidth < 32 || img.naturalHeight < 32));
  const shots = root => [...root.querySelectorAll('img')].filter(isScreenshot);

  // Caption: the column header, else the cell's own text (e.g. a <sub> under the image).
  function cell(img, header, td) {
    return {
      img, header: header || td.textContent.trim(), alt: img.alt,
      // Read at open time: GitHub may refresh signed private-image URLs.
      get src() { return img.currentSrc || img.src; },
      get href() { return img.closest('a')?.href || img.currentSrc || img.src; }
    };
  }

  function parseTable(table) {
    const head = table.tHead?.rows[0];
    // People sometimes put screenshots in the Markdown header row itself.
    const headIsData = !!head && shots(head).length > 0;
    const headers = head && !headIsData ? [...head.cells].map(c => c.textContent.trim()) : [];
    return [...table.rows].filter(tr => tr !== head || headIsData).map(tr => {
      const tds = [...tr.cells];
      const label = tds.map(td => shots(td).length ? '' : td.textContent.trim()).find(Boolean) || '';
      const cells = [];
      tds.forEach((td, ci) => shots(td).forEach(img => cells.push(cell(img, headers[ci] || '', td))));
      return { tr, label, cells };
    }).filter(r => r.cells.length);
  }

  function scan() {
    if (!PR_PATH.test(location.pathname)) return;
    document.querySelectorAll('.markdown-body table:not([data-ghc])').forEach(table => {
      const rows = parseTable(table);
      table.dataset.ghc = rows.length ? 'on' : 'skip';
      if (!rows.length) return;
      const n = rows.reduce((a, r) => a + r.cells.length, 0);
      const bar = document.createElement('div');
      bar.className = 'ghc-bar';
      bar.innerHTML = `<button type="button" class="ghc-trigger">${ICON}View ${n} screenshot${n > 1 ? 's' : ''} in carousel</button><span class="ghc-hint-inline">or click any screenshot</span>`;
      bar.firstElementChild.addEventListener('click', e => GHCCarousel.open(rows, 0, 0, e.currentTarget));
      // GitHub wraps rendered tables in <markdown-accessiblity-table> (sic).
      (table.closest('markdown-accessiblity-table') || table).before(bar);
      // Capture phase, so the image link never navigates. Modified clicks keep opening the raw file.
      table.addEventListener('click', e => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const img = e.target.closest('img');
        if (!img) return;
        const r = rows.findIndex(row => row.tr === img.closest('tr'));
        if (r < 0) return;
        const c = rows[r].cells.findIndex(x => x.img === img);
        if (c < 0) return;
        e.preventDefault();
        e.stopPropagation();
        // The <img> cannot take focus back on close; its link or the trigger can.
        GHCCarousel.open(rows, r, c, img.closest('a') || bar.firstElementChild);
      }, true);
    });
  }

  // GitHub swaps pages without a full reload and loads comments late, so rescan on DOM changes.
  let timer = 0;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => requestAnimationFrame(scan), 150);
  };
  new MutationObserver(records => {
    if (records.some(r => r.addedNodes.length)) schedule();
  }).observe(document.body, { childList: true, subtree: true });
  document.addEventListener('turbo:load', schedule);
  document.addEventListener('turbo:render', schedule);
  window.addEventListener('popstate', schedule);

  GHCSettings.load();
  scan();
})();
