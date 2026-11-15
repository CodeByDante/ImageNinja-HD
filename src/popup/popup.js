import { state, DOM } from './modules/state.js';
import { loadSettings, saveSettings } from './modules/settings.js';
import { applyFilters, getExtension } from './modules/filters.js';
import { getImagesFromPageDOM } from './modules/scrapers.js';
import { downloadImage, getUniqueSubfolder } from './modules/downloader.js';

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  initListeners();
  
  const params = new URLSearchParams(window.location.search);
  const targetTabId = params.get('tabId');
  let tab;

  if (targetTabId) {
    try {
      tab = await chrome.tabs.get(parseInt(targetTabId));
      DOM.fullscreenBtn.title = 'Minimizar a Ventana Flotante';
      DOM.fullscreenBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="fill: none; width: 18px; height: 18px; display: block;"><path d="M8 3v3h-3m18 2h-3V5m-18 11h3v3m10 2v-3h3m-5-5l7-7M3 21l7-7"></path></svg>';
      DOM.fullscreenBtn.onclick = () => window.close();
    } catch(e) {
      console.error("No se pudo obtener el tab original", e);
    }
  } else {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    tab = tabs[0];
  }

  if (!tab) return;
  window.currentContextTabId = tab.id;
  window.currentContextTabUrl = tab.url;
  window.currentContextTabTitle = tab.title;

  if (tab.url) {
    let suggestedPattern = tab.url;
    let suggestedStart = 1;
    let suggestedEnd = 10;

    if (tab.url.includes('hentaiera.com/view/')) {
      suggestedPattern = tab.url.replace(/\/view\/(\d+)\/(\d+)\/?/, '/view/$1/{page}/');
      suggestedStart = 1;
      try {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          world: 'MAIN',
          function: () => document.getElementById('pages')?.value || '15'
        }, (res) => {
          if (res?.[0]?.result) {
            const pagesVal = parseInt(res[0].result);
            if (pagesVal && DOM.seqEnd) DOM.seqEnd.value = pagesVal;
          }
        });
      } catch (e) {}
    } else {
      const numRegex = /(\/|-|_|=)(\d+)(\/|\.html|\.htm|$|\?|&)/i;
      const match = tab.url.match(numRegex);
      if (match) {
        suggestedPattern = tab.url.replace(numRegex, `$1{page}$3`);
        suggestedStart = 1;
        suggestedEnd = Math.max(10, parseInt(match[2]));
      }
    }

    if (DOM.seqUrlPattern) {
      DOM.seqUrlPattern.value = suggestedPattern;
      DOM.seqStart.value = suggestedStart;
      DOM.seqEnd.value = suggestedEnd;
    }
  }
  
  const isHitomi = tab.url && tab.url.includes('hitomi.la');
  const isHentaiera = tab.url && tab.url.includes('hentaiera.com') && tab.url.includes('/view/');
  const isNHentai = tab.url && (tab.url.includes('nhentai.xxx') || tab.url.includes('nhentai.net') || tab.url.includes('nhentai.to'));
  const is3Hentai = tab.url && tab.url.includes('3hentai.net');
  const isVerComicsPorno = tab.url && tab.url.includes('vercomicsporno.com');
  const isLectorHentai = tab.url && tab.url.includes('lectorhentai.com');
  const isHentaiMode = tab.url && tab.url.includes('hentaimode.com');
  if (isHitomi || isHentaiera || isNHentai || is3Hentai || isVerComicsPorno || isLectorHentai || isHentaiMode) {
    DOM.forceHD.checked = false;
    DOM.forceHD.disabled = true;
  }
  
  try {
    if (chrome.declarativeNetRequest && tab.url) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [999, 998, 997, 996, 995],
        addRules: [
          {
            id: 999,
            priority: 2,
            action: {
              type: "modifyHeaders",
              requestHeaders: [
                { header: "Referer", operation: "set", value: tab.url },
                { header: "Origin", operation: "set", value: new URL(tab.url).origin }
              ],
              responseHeaders: [
                { header: "Access-Control-Allow-Origin", operation: "set", value: "*" },
                { header: "Cross-Origin-Resource-Policy", operation: "remove" }
              ]
            },
            condition: {
              urlFilter: new URL(tab.url).hostname.replace('www.', ''),
              resourceTypes: ["image", "xmlhttprequest", "other", "main_frame", "sub_frame"]
            }
          },
          {
            id: 998,
            priority: 2,
            action: {
              type: "modifyHeaders",
              requestHeaders: [
                { header: "Referer", operation: "set", value: "https://hitomi.la/" },
                { header: "Origin", operation: "set", value: "https://hitomi.la" }
              ],
              responseHeaders: [
                { header: "Access-Control-Allow-Origin", operation: "set", value: "*" },
                { header: "Cross-Origin-Resource-Policy", operation: "remove" }
              ]
            },
            condition: {
              urlFilter: "gold-usergeneratedcontent.net",
              resourceTypes: ["image", "xmlhttprequest", "other", "main_frame", "sub_frame"]
            }
          },
          {
            id: 997,
            priority: 2,
            action: {
              type: "modifyHeaders",
              requestHeaders: [
                { header: "Referer", operation: "set", value: tab.url },
                { header: "Origin", operation: "set", value: new URL(tab.url).origin }
              ],
              responseHeaders: [
                { header: "Access-Control-Allow-Origin", operation: "set", value: "*" },
                { header: "Cross-Origin-Resource-Policy", operation: "remove" }
              ]
            },
            condition: {
              urlFilter: "nhentaimg.com",
              resourceTypes: ["image", "xmlhttprequest", "other", "main_frame", "sub_frame"]
            }
          },
          {
            id: 996,
            priority: 2,
            action: {
              type: "modifyHeaders",
              requestHeaders: [
                { header: "Referer", operation: "set", value: tab.url.includes('3hentai.net') ? tab.url : "https://3hentai.net/" },
                { header: "Origin", operation: "set", value: tab.url.includes('3hentai.net') ? new URL(tab.url).origin : "https://3hentai.net" }
              ],
              responseHeaders: [
                { header: "Access-Control-Allow-Origin", operation: "set", value: "*" },
                { header: "Cross-Origin-Resource-Policy", operation: "remove" }
              ]
            },
            condition: {
              urlFilter: "3hentai.xyz",
              resourceTypes: ["image", "xmlhttprequest", "other", "main_frame", "sub_frame"]
            }
          },
          {
            id: 995,
            priority: 2,
            action: {
              type: "modifyHeaders",
              requestHeaders: [
                { header: "Referer", operation: "set", value: "https://lectorhentai.com/" },
                { header: "Origin", operation: "set", value: "https://lectorhentai.com" }
              ],
              responseHeaders: [
                { header: "Access-Control-Allow-Origin", operation: "set", value: "*" },
                { header: "Cross-Origin-Resource-Policy", operation: "remove" }
              ]
            },
            condition: {
              urlFilter: "giolandscaping.com",
              resourceTypes: ["image", "xmlhttprequest", "other", "main_frame", "sub_frame"]
            }
          }
        ]
      });
    }
  } catch (e) {
    console.error("Dynamic DNR failed", e);
  }

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    world: (isHitomi || isHentaiera || isNHentai || is3Hentai || isLectorHentai || isHentaiMode) ? 'MAIN' : 'ISOLATED',
    function: getImagesFromPageDOM,
  }, (results) => {
    if (chrome.runtime.lastError || !results?.[0]?.result) {
      DOM.grid.innerHTML = '<div class="loader"><p style="color: var(--danger-color)">Error al obtener imágenes.</p></div>';
      return;
    }
    
    const res = results[0].result;
    
    const uniqueMap = new Map();
    res.forEach(img => {
      if (!uniqueMap.has(img.src) && img.src.startsWith('http')) {
        uniqueMap.set(img.src, img);
      }
    });
    
    state.allImages = Array.from(uniqueMap.values());
    if (DOM.selectAll.checked) {
      state.allImages.forEach(img => state.selectedImages.add(img.src));
    }
    applyFilters();

    if (DOM.forceHD.checked) {
      updateHDUrls();
    }
  });

  // Check if background is currently downloading
  if (window.currentContextTabUrl) {
    chrome.runtime.sendMessage({ action: 'getDownloadProgress', comicUrl: window.currentContextTabUrl }, (resp) => {
      if (resp && resp.downloading) {
        showDownloadingState(resp.completed, resp.total);
      }
    });
  }
});

function initListeners() {
  const handleSizeInput = (slider, valBox) => {
    valBox.value = slider.value;
    applyFilters();
    if (DOM.forceHD.checked) updateHDUrls();
    saveSettings();
  };

  DOM.minWidth.addEventListener('input', () => handleSizeInput(DOM.minWidth, DOM.minWidthVal));
  DOM.minHeight.addEventListener('input', () => handleSizeInput(DOM.minHeight, DOM.minHeightVal));
  DOM.minWidthVal.addEventListener('input', () => { DOM.minWidth.value = DOM.minWidthVal.value; applyFilters(); saveSettings(); });
  DOM.minHeightVal.addEventListener('input', () => { DOM.minHeight.value = DOM.minHeightVal.value; applyFilters(); saveSettings(); });

  DOM.minWidth.addEventListener('change', saveSettings);
  DOM.minHeight.addEventListener('change', saveSettings);

  DOM.filterUrl.addEventListener('input', () => { applyFilters(); saveSettings(); });
  DOM.filterExt.addEventListener('change', () => { applyFilters(); saveSettings(); });
  DOM.forceHD.addEventListener('change', () => { updateHDUrls(); saveSettings(); });
  DOM.separateQuality.addEventListener('change', saveSettings);
  DOM.renameSequential.addEventListener('change', saveSettings);
  DOM.smartComic.addEventListener('change', () => { applyFilters(); saveSettings(); });
  DOM.forcePNG.addEventListener('change', saveSettings);
  DOM.subfolderInput.addEventListener('input', saveSettings);

  DOM.selectAll.addEventListener('change', (e) => {
    if (e.target.checked) {
      state.filteredImages.forEach(img => state.selectedImages.add(img.src));
    } else {
      state.selectedImages.clear();
    }
    updateSelectionVisuals();
    saveSettings();
  });

  DOM.downloadBtn.addEventListener('click', async () => {
    const toDownload = state.filteredImages.filter(img => state.selectedImages.has(img.src));
    if (toDownload.length === 0) return;
    
    const baseSf = DOM.subfolderInput.value.trim().replace(/[\\:*?"<>|]/g, "") || (window.currentContextTabTitle ? window.currentContextTabTitle.replace(/[\\:*?"<>|]/g, "").trim().slice(0, 80) : 'comics_completos');
    const uniqueSf = await getUniqueSubfolder(baseSf);

    const is3Hentai = window.currentContextTabUrl && window.currentContextTabUrl.includes('3hentai.net');

    if (is3Hentai) {
      chrome.runtime.sendMessage({
        action: 'startBackgroundDownloads',
        toDownload,
        baseSf,
        uniqueSf,
        is3Hentai,
        isForcePNG: DOM.forcePNG && DOM.forcePNG.checked,
        separateQuality: DOM.separateQuality && DOM.separateQuality.checked,
        renameSequential: DOM.renameSequential && DOM.renameSequential.checked,
        comicUrl: window.currentContextTabUrl
      }, () => {
        showDownloadingState(0, toDownload.length);
      });
    } else {
      // Original parallel behavior
      toDownload.forEach((img, idx) => downloadImage(img, idx, toDownload.length, uniqueSf));
    }
  });

  if (DOM.fullscreenBtn) {
    DOM.fullscreenBtn.addEventListener('click', () => {
      const params = new URLSearchParams(window.location.search);
      if (!params.has('tabId') && window.currentContextTabId) {
         chrome.tabs.create({ url: chrome.runtime.getURL('popup.html?tabId=' + window.currentContextTabId) });
      }
    });
  }

  window.addEventListener('mouseup', () => state.isDragging = false);
  window.addEventListener('mouseleave', () => state.isDragging = false);

  if (DOM.cleanBrokenToggle) {
    DOM.cleanBrokenToggle.addEventListener('change', () => {
      applyFilters();
      saveSettings();
    });
  }

  if (DOM.toggleFiltersBtn) {
    if (DOM.toggleFiltersBtn.classList.contains('collapsed')) {
      DOM.toggleFiltersBtn.title = "Expandir filtros";
    } else {
      DOM.toggleFiltersBtn.title = "Contraer filtros";
    }
    
    DOM.toggleFiltersBtn.addEventListener('click', () => {
      const isCollapsed = DOM.collapsibleFilters.classList.toggle('collapsed');
      DOM.toggleFiltersBtn.classList.toggle('collapsed', isCollapsed);
      DOM.toggleFiltersBtn.title = isCollapsed ? "Expandir filtros" : "Contraer filtros";
      saveSettings();
    });
  }

  if (DOM.toggleSeqBtn) {
    DOM.toggleSeqBtn.addEventListener('click', () => {
      if (DOM.seqPanel.style.display === 'none') {
        DOM.seqPanel.style.display = 'block';
        DOM.toggleSeqBtn.style.backgroundColor = 'rgba(225, 29, 72, 0.15)';
        DOM.toggleSeqBtn.style.borderColor = 'var(--accent-color)';
        DOM.toggleSeqBtn.style.color = '#fff';
      } else {
        DOM.seqPanel.style.display = 'none';
        DOM.toggleSeqBtn.style.backgroundColor = '';
        DOM.toggleSeqBtn.style.borderColor = '';
        DOM.toggleSeqBtn.style.color = '';
      }
    });
  }

  if (DOM.seqStartBtn) {
    DOM.seqStartBtn.addEventListener('click', startSequentialSearch);
  }

  if (DOM.togglePasteBtn) {
    DOM.togglePasteBtn.addEventListener('click', () => {
      if (DOM.pastePanel.style.display === 'none') {
        DOM.pastePanel.style.display = 'block';
        DOM.togglePasteBtn.style.backgroundColor = 'rgba(225, 29, 72, 0.15)';
        DOM.togglePasteBtn.style.borderColor = 'var(--accent-color)';
        DOM.togglePasteBtn.style.color = '#fff';
      } else {
        DOM.pastePanel.style.display = 'none';
        DOM.togglePasteBtn.style.backgroundColor = '';
        DOM.togglePasteBtn.style.borderColor = '';
        DOM.togglePasteBtn.style.color = '';
      }
    });
  }

  if (DOM.clearPastedBtn) {
    DOM.clearPastedBtn.addEventListener('click', () => {
      DOM.pasteLinksTextarea.value = '';
      if (DOM.pasteStatus) DOM.pasteStatus.textContent = '';
    });
  }

  if (DOM.processPastedBtn) {
    DOM.processPastedBtn.addEventListener('click', () => processPastedLinks(false));
  }

  if (DOM.downloadPastedBtn) {
    DOM.downloadPastedBtn.addEventListener('click', () => processPastedLinks(true));
  }
}

async function processPastedLinks(shouldDownload = false) {
  const rawText = DOM.pasteLinksTextarea ? DOM.pasteLinksTextarea.value : '';
  if (!rawText || !rawText.trim()) {
    if (DOM.pasteStatus) {
      DOM.pasteStatus.style.color = 'var(--danger-color)';
      DOM.pasteStatus.textContent = '❌ Pega algunos enlaces primero.';
    }
    return;
  }

  const extractedUrls = rawText.match(/https?:\/\/[^\s"']+/gi) || [];
  if (extractedUrls.length === 0) {
    if (DOM.pasteStatus) {
      DOM.pasteStatus.style.color = 'var(--danger-color)';
      DOM.pasteStatus.textContent = '❌ No se encontraron enlaces válidos (http/https).';
    }
    return;
  }

  const existingSrcs = new Set(state.allImages.map(img => img.src));
  let addedCount = 0;

  extractedUrls.forEach((url, i) => {
    const cleanUrl = url.trim();
    if (!existingSrcs.has(cleanUrl)) {
      existingSrcs.add(cleanUrl);
      const imgObj = {
        src: cleanUrl,
        alt: `Imagen Pegada ${i + 1}`,
        width: 0,
        height: 0,
        isDirectLink: true
      };
      state.allImages.push(imgObj);
      addedCount++;
    }
    state.selectedImages.add(cleanUrl);
  });

  if (DOM.selectAll) DOM.selectAll.checked = true;
  applyFilters();

  if (DOM.pasteStatus) {
    DOM.pasteStatus.style.color = '#10b981';
    DOM.pasteStatus.textContent = `¡${extractedUrls.length} enlaces listos (${addedCount} nuevos cargados en la galería)!`;
  }

  if (shouldDownload) {
    const toDownload = state.filteredImages.filter(img => state.selectedImages.has(img.src));
    if (toDownload.length === 0) return;

    const baseSf = DOM.subfolderInput.value.trim().replace(/[\\:*?"<>|]/g, "") || (window.currentContextTabTitle ? window.currentContextTabTitle.replace(/[\\:*?"<>|]/g, "").trim().slice(0, 80) : 'comics_completos');
    const uniqueSf = await getUniqueSubfolder(baseSf);

    if (DOM.pasteStatus) {
      DOM.pasteStatus.textContent = `⬇️ Descargando ${toDownload.length} imágenes a '${uniqueSf}'...`;
    }

    toDownload.forEach((img, idx) => downloadImage(img, idx, toDownload.length, uniqueSf));
  }
}

async function updateHDUrls() {
  const isHitomi = window.currentContextTabUrl && window.currentContextTabUrl.includes('hitomi.la');
  const isHentaiera = window.currentContextTabUrl && window.currentContextTabUrl.includes('hentaiera.com');
  const isNHentai = window.currentContextTabUrl && (window.currentContextTabUrl.includes('nhentai.xxx') || window.currentContextTabUrl.includes('nhentai.net') || window.currentContextTabUrl.includes('nhentai.to'));
  const is3Hentai = window.currentContextTabUrl && window.currentContextTabUrl.includes('3hentai.net');
  const isVerComicsPorno = window.currentContextTabUrl && window.currentContextTabUrl.includes('vercomicsporno.com');
  if (isHitomi || isHentaiera || isNHentai || is3Hentai || isVerComicsPorno) {
    DOM.forceHD.checked = false;
    DOM.forceHD.disabled = true;
    return;
  }

  if (!DOM.forceHD.checked) {
    state.allImages.forEach(img => {
      if (img.originalSrc) {
        img.src = img.originalSrc;
        img.width = img.origWidth;
        img.height = img.origHeight;
      }
      img.hdSearching = false;
      img.hdFound = false;
    });
    applyFilters();
    return;
  }

  state.allImages.forEach(img => {
    if (!img.originalSrc) {
      img.originalSrc = img.src;
      img.origWidth = img.width;
      img.origHeight = img.height;
    }
  });

  state.filteredImages.forEach(img => {
    if (img.inLink && img.linkHref && !img.hdFound && !img.hdSearching) {
      img.hdSearching = true;
    }
    if (!img.hdFound && img.src.includes('kemono.') && img.src.includes('/thumbnail/data/')) {
      img.src = img.src.replace('/thumbnail/data/', '/data/');
      img.linkHref = img.src;
      img.hdSearching = true;
    }
  });

  render();

  let queue = state.filteredImages.map((img, idx) => ({img, idx})).filter(x => x.img.hdSearching);
  const limit = 5;
  let active = 0;

  await new Promise(resolve => {
    if (queue.length === 0) return resolve();
    
    const processNext = async () => {
      if (queue.length === 0 && active === 0) return resolve();
      
      while (active < limit && queue.length > 0) {
        active++;
        const {img, idx} = queue.shift();
        
        try {
          const resp = await fetch(img.linkHref);
          const html = await resp.text();
          const doc = new DOMParser().parseFromString(html, 'text/html');
          
          let foundSrc = doc.querySelector('#image-container img, .fit-horizontal img, #gimg, .gallery-image img, figure img, .post__content img')?.getAttribute('src');
          
          if (!foundSrc && img.linkHref.match(/\.(jpg|jpeg|png|webp|gif|svg|avif|bmp|tiff|tif|ico|heic|heif|jxl)$/i)) foundSrc = img.linkHref;
          
          if (!foundSrc) {
            const folder = (new URL(img.originalSrc)).pathname.split('/').slice(0,-1).join('/');
            foundSrc = Array.from(doc.querySelectorAll('img'))
              .map(i => i.getAttribute('src'))
              .find(s => s?.includes(folder) && !s.match(/t\.(jpg|jpeg|png|webp|gif|svg|avif|bmp|tiff|tif|ico|heic|heif|jxl)$/i) && !s.includes('logo'));
          }

          if (foundSrc) {
            const fullUrl = foundSrc.startsWith('http') ? foundSrc : new URL(foundSrc, img.linkHref).href;
            img.src = fullUrl;
            await new Promise(r => {
              const t = new Image();
              t.onload = () => { img.width = t.naturalWidth; img.height = t.naturalHeight; img.hdFound = true; r(); };
              t.onerror = r;
              t.src = fullUrl;
            });
          }
        } catch {}
        
        img.hdSearching = false;
        updateCardForHD(idx);
        active--;
        processNext();
      }
    };
    processNext();
  });
}

function updateCardForHD(idx) {
  const cards = DOM.grid.querySelectorAll('.image-card');
  const card = cards[idx];
  if (!card) return;
  const img = state.filteredImages[idx];
  
  let info = `${img.width} × ${img.height}`;
  let style = '';
  if (DOM.forceHD.checked) {
    if (img.hdSearching) { info = '🔎 Buscando...'; style = 'color: #f39c12; font-size: 11px;'; }
    else if (img.hdFound) { info = `🌟 HD: ${img.width}×${img.height}`; style = 'color: #2ecc71; font-weight: bold;'; }
    else { info = '❌ Normal'; style = 'color: #e74c3c; font-size: 11px;'; }
  }

  const span = card.querySelector('.card-info span');
  if (span) {
    span.innerHTML = info;
    span.setAttribute('style', style);
  }
  
  if (img.hdFound) {
    const imgEl = card.querySelector('.image-wrapper img');
    if (imgEl && imgEl.src !== img.src) imgEl.src = img.src;
    const urlBar = card.querySelector('.url-bar');
    if (urlBar && urlBar.textContent !== img.src) urlBar.textContent = img.src;
  }
}

export function render() {
  const scroll = DOM.grid.scrollTop;
  DOM.grid.innerHTML = '';

  if (state.filteredImages.length === 0) {
    DOM.grid.innerHTML = '<div class="loader"><p>No se encontraron imágenes.</p></div>';
  } else {
    state.filteredImages.forEach((img, idx) => {
      const isSelected = state.selectedImages.has(img.src);
      const card = document.createElement('div');
      card.className = `image-card ${isSelected ? 'selected' : ''}`;
      
      let info = `${img.width} × ${img.height}`;
      let style = '';
      if (DOM.forceHD.checked) {
        if (img.hdSearching) { info = '🔎 Buscando...'; style = 'color: #f39c12; font-size: 11px;'; }
        else if (img.hdFound) { info = `🌟 HD: ${img.width}×${img.height}`; style = 'color: #2ecc71; font-weight: bold;'; }
        else { info = '❌ Normal'; style = 'color: #e74c3c; font-size: 11px;'; }
      }

      card.innerHTML = `
        <input type="checkbox" class="card-checkbox" ${isSelected ? 'checked' : ''}>
        <div class="card-actions">
          <button class="icon-btn btn-ext"><svg viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></button>
          <button class="icon-btn btn-dl"><svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg></button>
        </div>
        <div class="image-wrapper"><img src="${img.src}" loading="lazy" /><div class="url-bar">${img.src}</div></div>
        <div class="card-info"><span style="${style}">${info}</span></div>
      `;

      card.querySelector('.btn-ext').onclick = (e) => { e.stopPropagation(); chrome.tabs.create({ url: img.src }); };
      card.querySelector('.btn-dl').onclick = async (e) => { 
        e.stopPropagation(); 
        const baseSf = DOM.subfolderInput.value.trim().replace(/[\\:*?"<>|]/g, "") || (window.currentContextTabTitle ? window.currentContextTabTitle.replace(/[\\:*?"<>|]/g, "").trim().slice(0, 80) : 'comics_completos');
        const uniqueSf = await getUniqueSubfolder(baseSf);
        downloadImage(img, idx, state.filteredImages.length, uniqueSf); 
      };
      
      const imgEl = card.querySelector('img');
      imgEl.addEventListener('dragstart', (e) => e.preventDefault());
      imgEl.addEventListener('load', () => {
        if ((img.width === 0 || img.height === 0) && imgEl.naturalWidth > 0) {
          img.width = imgEl.naturalWidth;
          img.height = imgEl.naturalHeight;
          const infoSpan = card.querySelector('.card-info span');
          if (infoSpan && !DOM.forceHD.checked) {
            infoSpan.textContent = `${img.width} × ${img.height}`;
          }
        }
      });
      imgEl.addEventListener('error', () => { 
        img.isBroken = true; 
        if (DOM.cleanBrokenToggle && DOM.cleanBrokenToggle.checked) {
          card.style.display = 'none';
          state.selectedImages.delete(img.src);
          updateSelectionVisuals();
        }
      });

      card.addEventListener('mousedown', (e) => {
        if (e.target.closest('.card-actions')) return;
        e.preventDefault();
        if (e.shiftKey) {
            toggleSelection(idx, true);
        } else {
            state.isDragging = true;
            state.dragStartIdx = idx;
            state.dragMode = !state.selectedImages.has(img.src);
            state.dragSavedSelection = new Set(state.selectedImages);
            updateDragSelection(idx);
        }
      });
      
      card.addEventListener('mouseenter', (e) => {
          if (state.isDragging) {
              updateDragSelection(idx);
          }
      });
      
      DOM.grid.appendChild(card);
    });
  }

  updateSelectionVisuals();
  DOM.grid.scrollTop = scroll;
}

function updateSelectionVisuals() {
    const cards = DOM.grid.querySelectorAll('.image-card');
    state.filteredImages.forEach((img, idx) => {
        const isSelected = state.selectedImages.has(img.src);
        const card = cards[idx];
        if (card) {
            if (isSelected) card.classList.add('selected');
            else card.classList.remove('selected');
            
            const checkbox = card.querySelector('.card-checkbox');
            if (checkbox) checkbox.checked = isSelected;
        }
    });
    
    DOM.selectedCount.textContent = state.selectedImages.size;
    DOM.btnCounter.textContent = state.selectedImages.size;
    DOM.selectAll.checked = state.filteredImages.length > 0 && state.selectedImages.size === state.filteredImages.length;
    DOM.downloadBtn.disabled = state.selectedImages.size === 0;
    DOM.totalCount.textContent = state.filteredImages.length;
}

function updateDragSelection(currentIdx) {
  state.selectedImages = new Set(state.dragSavedSelection);
  const start = Math.min(state.dragStartIdx, currentIdx);
  const end = Math.max(state.dragStartIdx, currentIdx);

  for (let i = start; i <= end; i++) {
    const src = state.filteredImages[i].src;
    if (state.dragMode) state.selectedImages.add(src);
    else state.selectedImages.delete(src);
  }
  
  state.lastSelectedIdx = currentIdx;
  updateSelectionVisuals();
}

function toggleSelection(idx, shift, forceState = null) {
  const img = state.filteredImages[idx];
  const isCurrentlySelected = state.selectedImages.has(img.src);

  if (shift && state.lastSelectedIdx !== -1) {
    const start = Math.min(state.lastSelectedIdx, idx);
    const end = Math.max(state.lastSelectedIdx, idx);
    const shouldSelect = !state.selectedImages.has(state.filteredImages[state.lastSelectedIdx].src);
    
    for (let i = start; i <= end; i++) {
        const src = state.filteredImages[i].src;
        if (shouldSelect) state.selectedImages.add(src);
        else state.selectedImages.delete(src);
    }
  } else {
    if (forceState !== null) {
        if (forceState) state.selectedImages.add(img.src);
        else state.selectedImages.delete(img.src);
    } else {
        if (isCurrentlySelected) state.selectedImages.delete(img.src);
        else state.selectedImages.add(img.src);
    }
    state.lastSelectedIdx = idx;
  }
  updateSelectionVisuals();
}

async function startSequentialSearch() {
  const urlPattern = DOM.seqUrlPattern.value.trim();
  const startPage = parseInt(DOM.seqStart.value) || 1;
  const endPage = parseInt(DOM.seqEnd.value) || 1;
  const customSelector = DOM.seqSelector.value.trim();

  if (!urlPattern.includes('{page}')) {
    alert('Por favor, introduce una URL con el marcador {page} para poder paginar.');
    return;
  }

  if (startPage > endPage) {
    alert('La página de inicio ("Desde") no puede ser mayor que la página final ("Hasta").');
    return;
  }

  DOM.seqStartBtn.disabled = true;
  DOM.seqStartBtn.textContent = 'Buscando...';
  DOM.seqUrlPattern.disabled = true;
  DOM.seqStart.disabled = true;
  DOM.seqEnd.disabled = true;
  DOM.seqSelector.disabled = true;
  DOM.seqProgress.style.display = 'block';

  state.allImages = [];
  state.selectedImages.clear();
  applyFilters();
  
  const totalPages = endPage - startPage + 1;
  let loadedCount = 0;
  
  DOM.seqProgressText.textContent = `0 / ${totalPages}`;
  DOM.seqProgressStatus.textContent = 'Iniciando búsqueda...';
  DOM.seqProgressBar.style.width = '0%';

  const queue = [];
  for (let p = startPage; p <= endPage; p++) {
    queue.push(p);
  }

  const limit = 3;
  let activeCount = 0;

  const processNext = async () => {
    if (queue.length === 0 && activeCount === 0) {
      DOM.seqStartBtn.disabled = false;
      DOM.seqStartBtn.textContent = 'Buscar';
      DOM.seqUrlPattern.disabled = false;
      DOM.seqStart.disabled = false;
      DOM.seqEnd.disabled = false;
      DOM.seqSelector.disabled = false;
      DOM.seqProgressStatus.textContent = '¡Búsqueda completa!';
      
      state.allImages.forEach(img => state.selectedImages.add(img.src));
      updateSelectionVisuals();
      return;
    }

    while (activeCount < limit && queue.length > 0) {
      activeCount++;
      const pageNum = queue.shift();
      const pageUrl = urlPattern.replace('{page}', pageNum);
      
      DOM.seqProgressStatus.textContent = `Cargando página ${pageNum}...`;
      
      try {
        const resp = await fetch(pageUrl);
        if (!resp.ok) throw new Error(`HTTP error ${resp.status}`);
        
        const html = await resp.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        
        let foundSrc = '';
        if (customSelector) {
          foundSrc = doc.querySelector(customSelector)?.getAttribute('src') || doc.querySelector(customSelector)?.getAttribute('data-src');
        }
        
        if (!foundSrc) {
          const standardSelectors = '#gimg, #image-container img, .fit-horizontal img, .gallery-image img, figure img, .post__content img';
          foundSrc = doc.querySelector(standardSelectors)?.getAttribute('src') || doc.querySelector(standardSelectors)?.getAttribute('data-src');
        }

        if (!foundSrc) {
          const imgs = Array.from(doc.querySelectorAll('img'));
          let bestImg = null;
          let bestScore = 0;
          
          imgs.forEach(img => {
            const src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
            if (!src || src.startsWith('data:') || src.startsWith('blob:')) return;
            if (src.includes('logo') || src.includes('banner') || src.includes('avatar') || src.includes('icon')) return;
            
            let score = 10;
            const filename = src.split('/').pop();
            if (filename.match(/\d+/)) score += 20;
            if (img.width >= 300 || img.height >= 300) score += 50;
            
            if (score > bestScore) {
              bestScore = score;
              bestImg = src;
            }
          });
          
          if (bestImg) {
            foundSrc = bestImg;
          }
        }

        if (foundSrc) {
          const fullUrl = foundSrc.startsWith('http') ? foundSrc : new URL(foundSrc, pageUrl).href;
          
          const imgObj = {
            src: fullUrl,
            width: 0,
            height: 0,
            inLink: false,
            linkHref: null,
            isKemonoThumb: false,
            originalSrc: fullUrl,
            origWidth: 0,
            origHeight: 0
          };
          
          await new Promise(resolve => {
            const t = new Image();
            t.onload = () => { 
              imgObj.width = t.naturalWidth; 
              imgObj.height = t.naturalHeight; 
              imgObj.origWidth = t.naturalWidth;
              imgObj.origHeight = t.naturalHeight;
              resolve(); 
            };
            t.onerror = () => { resolve(); };
            t.src = fullUrl;
          });
          
          if (!state.allImages.some(img => img.src === imgObj.src)) {
            state.allImages.push(imgObj);
            state.selectedImages.add(imgObj.src);
            applyFilters();
          }
        }
      } catch (err) {
        console.error(`Error al cargar página ${pageNum}:`, err);
      }
      
      loadedCount++;
      activeCount--;
      
      const progressPercent = (loadedCount / totalPages) * 100;
      DOM.seqProgressText.textContent = `${loadedCount} / ${totalPages}`;
      DOM.seqProgressBar.style.width = `${progressPercent}%`;
      
      processNext();
    }
  };

  processNext();
}

let originalHTML = '';

function showDownloadingState(completed, total) {
  if (!originalHTML) {
    originalHTML = DOM.downloadBtn.innerHTML;
  }
  DOM.downloadBtn.disabled = true;
  const percentage = Math.round((completed / total) * 100);
  DOM.downloadBtn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="7 10 12 15 17 10"></polyline>
      <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
    Descargando... ${percentage}% (${completed}/${total})
  `;
}

function restoreDownloadButton() {
  if (originalHTML) {
    DOM.downloadBtn.disabled = false;
    DOM.downloadBtn.innerHTML = originalHTML;
    originalHTML = '';
  }
  updateSelectionVisuals();
}

chrome.runtime.onMessage.addListener((request) => {
  if (request.action === 'downloadProgress' && request.comicUrl === window.currentContextTabUrl) {
    if (request.downloading) {
      showDownloadingState(request.completed, request.total);
    } else {
      restoreDownloadButton();
    }
  }
});

