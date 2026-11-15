import { state, DOM } from './state.js';
import { render } from '../popup.js';

export function getExtension(url) {
  let e = url.split('.').pop().split(/[#?]/)[0].toLowerCase();
  return ['jpg','jpeg','png','webp','gif','svg','avif','bmp','tiff','tif','ico','heic','heif','jxl'].includes(e) ? e : 'desconocido';
}

export function applyFilters() {
  const w = parseInt(DOM.minWidth.value) || 0;
  const h = parseInt(DOM.minHeight.value) || 0;
  const text = DOM.filterUrl.value.toLowerCase();
  const ext = DOM.filterExt.value;

  state.filteredImages = state.allImages.filter(img => {
    if (DOM.cleanBrokenToggle && DOM.cleanBrokenToggle.checked && img.isBroken) return false;

    // Exempt direct links, kemono thumbs, and actively searching HD images from size filtering initially
    const isExempt = img.hdSearching || (!img.hdFound && (img.isDirectLink || img.isKemonoThumb));
    if (!isExempt && (img.width < w || img.height < h)) return false;
    if (ext !== 'all' && getExtension(img.src) !== ext) return false;
    if (text && !img.src.toLowerCase().includes(text)) return false;
    return true;
  });

  if (DOM.smartComic && DOM.smartComic.checked && state.filteredImages.length > 0) {
      const dirInfo = {};
      state.filteredImages.forEach(img => {
          if (img.hdSearching || (!img.hdFound && (img.isDirectLink || img.isKemonoThumb))) return;
          try {
              const url = img.originalSrc || img.src;
              if (!url.startsWith('http')) return;
              const urlObj = new URL(url);
              const pathStr = urlObj.pathname;
              const dirPath = urlObj.origin + pathStr.substring(0, pathStr.lastIndexOf('/'));
              
              if (!dirInfo[dirPath]) dirInfo[dirPath] = 0;
              if (img.width >= 300 && img.height >= 300) {
                  dirInfo[dirPath] += 2;
              } else {
                  dirInfo[dirPath] += 1;
              }
          } catch(e) {}
      });

      let mainDir = '';
      let maxScore = 0;
      for (const [dir, score] of Object.entries(dirInfo)) {
          if (score > maxScore) {
              maxScore = score;
              mainDir = dir;
          }
      }

      state.filteredImages = state.filteredImages.filter(img => {
          if (img.hdSearching || (!img.hdFound && (img.isDirectLink || img.isKemonoThumb))) return true;

          try {
              const url = img.originalSrc || img.src;
              const urlObj = new URL(url);
              const pathStr = urlObj.pathname;
              const dirPath = urlObj.origin + pathStr.substring(0, pathStr.lastIndexOf('/'));
              
              if (maxScore >= 4) {
                  return dirPath === mainDir && img.width >= 300 && img.height >= 300;
              } else {
                  return img.width >= 300 && img.height >= 300;
              }
          } catch {
              return true;
          }
      });
  }

  // Limpiar selección de lo que ya no es visible
  const visibleSrcs = new Set(state.filteredImages.map(i => i.src));
  state.selectedImages.forEach(src => {
    if (!visibleSrcs.has(src)) state.selectedImages.delete(src);
  });

  render();
}
