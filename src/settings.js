// Shared by the content scripts and the options page.
const GHCSettings = (() => {
  const DEFAULTS = { mode: 'row', sync: true, keep: false };
  let cache = { ...DEFAULTS };
  const listeners = new Set();
  const notify = () => listeners.forEach(fn => fn(cache));

  async function load() {
    try {
      cache = { ...DEFAULTS, ...(await chrome.storage.sync.get(DEFAULTS)) };
    } catch {
      // Storage is unavailable once the extension is reloaded under an open tab.
      cache = { ...DEFAULTS };
    }
    return cache;
  }

  function set(patch) {
    cache = { ...cache, ...patch };
    try { chrome.storage.sync.set(patch).catch(() => {}); } catch {}
    notify();
  }

  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync') return;
      const keys = Object.keys(DEFAULTS).filter(k => k in changes);
      if (!keys.length) return;
      keys.forEach(k => { cache[k] = changes[k].newValue ?? DEFAULTS[k]; });
      notify();
    });
  } catch {}

  return { DEFAULTS, get: () => cache, load, set, onChange: fn => listeners.add(fn) };
})();
