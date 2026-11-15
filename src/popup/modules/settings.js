import { DOM } from './state.js';

export function saveSettings() {
  if (typeof chrome === 'undefined' || !chrome.storage) return;
  const settings = {
    filterUrl: DOM.filterUrl.value,
    filterExt: DOM.filterExt.value,
    minWidth: DOM.minWidth.value,
    minHeight: DOM.minHeight.value,
    forceHD: DOM.forceHD.checked,
    separateQuality: DOM.separateQuality.checked,
    renameSequential: DOM.renameSequential.checked,
    smartComic: DOM.smartComic.checked,
    forcePNG: DOM.forcePNG.checked,
    subfolder: DOM.subfolderInput.value,
    selectAll: DOM.selectAll.checked,
    cleanBroken: DOM.cleanBrokenToggle ? DOM.cleanBrokenToggle.checked : false,
    filtersCollapsed: DOM.collapsibleFilters ? DOM.collapsibleFilters.classList.contains('collapsed') : false
  };
  chrome.storage.local.set({ extensionSettings: settings });
}

export async function loadSettings() {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage) return resolve();
    chrome.storage.local.get(['extensionSettings'], (res) => {
      const s = res.extensionSettings;
      if (s) {
        DOM.filterUrl.value = s.filterUrl || '';
        DOM.filterExt.value = s.filterExt || 'all';
        DOM.minWidth.value = s.minWidth ?? 0;
        DOM.minWidthVal.value = s.minWidth ?? 0;
        DOM.minHeight.value = s.minHeight ?? 0;
        DOM.minHeightVal.value = s.minHeight ?? 0;
        DOM.forceHD.checked = !!s.forceHD;
        DOM.separateQuality.checked = !!s.separateQuality;
        DOM.renameSequential.checked = s.renameSequential !== false; // Activo por defecto
        DOM.smartComic.checked = s.smartComic !== false;
        DOM.forcePNG.checked = !!s.forcePNG;
        DOM.subfolderInput.value = s.subfolder || '';
        DOM.selectAll.checked = !!s.selectAll;
        if (DOM.cleanBrokenToggle) {
          DOM.cleanBrokenToggle.checked = !!s.cleanBroken;
        }
        if (DOM.collapsibleFilters && s.filtersCollapsed) {
          DOM.collapsibleFilters.classList.add('collapsed');
          if (DOM.toggleFiltersBtn) {
            DOM.toggleFiltersBtn.classList.add('collapsed');
          }
        }
      }
      resolve();
    });
  });
}
