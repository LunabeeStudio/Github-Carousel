(async () => {
  const form = document.getElementById('form');
  const status = document.getElementById('status');
  const show = s => {
    form.mode.value = s.mode;
    form.sync.checked = s.sync;
    form.keep.checked = s.keep;
    form.strip.value = s.strip;
    form.wheelZoom.checked = s.wheelZoom;
  };
  show(await GHCSettings.load());
  GHCSettings.onChange(show);
  form.addEventListener('change', () => {
    GHCSettings.set({ mode: form.mode.value, sync: form.sync.checked, keep: form.keep.checked, strip: form.strip.value, wheelZoom: form.wheelZoom.checked });
    status.textContent = 'Saved';
  });
})();
