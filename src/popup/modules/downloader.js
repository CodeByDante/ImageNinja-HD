import { DOM } from './state.js';
import { getExtension } from './filters.js';

export function getQualityFolder(width, height) {
  const max = Math.max(width, height);
  const min = Math.min(width, height);
  if (min >= 2160 || max >= 3840) return '4K';
  if (min >= 1440 || max >= 2560) return '2K';
  if (min >= 1080 || max >= 1920) return '1080p';
  if (min >= 720 || max >= 1280) return '720p';
  return 'Normal';
}

export function convertWebpToPng(blob) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((pngBlob) => {
        if (pngBlob) {
          resolve(pngBlob);
        } else {
          reject(new Error('Canvas conversion to PNG failed'));
        }
      }, 'image/png');
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

export async function getUniqueSubfolder(baseFolder) {
  return baseFolder || 'comics_completos';
}

export async function downloadImage(img, idx = 0, totalItems = 1, uniqueSf = null) {
  const url = img.src || img; // Fallback
  const width = img.width || 0;
  const height = img.height || 0;

  const isForcePNG = DOM.forcePNG && DOM.forcePNG.checked;
  const ext = isForcePNG ? 'png' : (getExtension(url) === 'desconocido' ? 'jpg' : getExtension(url));
  
  let sf = uniqueSf;
  if (!sf) {
    sf = DOM.subfolderInput.value.trim().replace(/[\\:*?"<>|]/g, "") || 'comics_completos';
  }
  
  if (DOM.separateQuality && DOM.separateQuality.checked && width > 0 && height > 0) {
    const quality = getQualityFolder(width, height);
    sf = `${sf}/${quality}`;
  }

  let name = url.split('/').pop().split(/[#?]/)[0].slice(0, 50) || `img_${idx + 1}`;
  
  if (DOM.renameSequential && DOM.renameSequential.checked) {
    const padLength = Math.max(2, String(totalItems).length);
    name = `pag_${String(idx + 1).padStart(padLength, '0')}`;
  }

  const filename = `${sf}/${name}.${ext}`;
  
  const requiresBlobFetch = url.includes('poringa.') || url.includes('chochox.') || url.includes('gold-usergeneratedcontent.net') || url.includes('nhentaimg.com') || url.includes('sexkomix') || url.includes('3hentai.xyz') || url.includes('3hentai.net') || url.includes('vercomicsporno.com') || url.includes('lectorhentai.com') || url.includes('hentaimode.com') || url.includes('giolandscaping.com') || isForcePNG;

  if (requiresBlobFetch) {
     return new Promise((resolve) => {
       fetch(url)
         .then(r => { if(!r.ok) throw new Error('Fetch failed'); return r.blob(); })
         .then(async (blob) => {
            let finalBlob = blob;
            if (isForcePNG && blob.type !== 'image/png') {
              try {
                finalBlob = await convertWebpToPng(blob);
              } catch (e) {
                console.warn("PNG conversion failed, falling back to original blob", e);
              }
            }
            const reader = new FileReader();
            reader.onloadend = () => {
              const dataUrl = reader.result;
              chrome.runtime.sendMessage({ action: 'registerDownload', url: dataUrl, filename: filename }, () => {
                chrome.downloads.download({ url: dataUrl, filename: filename, saveAs: false }, () => resolve());
              });
            };
            reader.readAsDataURL(finalBlob);
         })
         .catch(e => {
            console.warn("Blob fetch failed, falling back to direct download", e);
            chrome.runtime.sendMessage({ action: 'registerDownload', url: url, filename: filename }, () => {
               chrome.downloads.download({ url, filename: filename, saveAs: false }, () => resolve());
            });
         });
     });
  }

  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'registerDownload', url: url, filename: filename }, () => {
      chrome.downloads.download({ url, filename: filename, saveAs: false }, () => resolve());
    });
  });
}
