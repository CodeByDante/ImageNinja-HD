const downloadMap = new Map();
const activeSessions = new Map();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'registerDownload') {
    downloadMap.set(request.url, request.filename);
    sendResponse({ success: true });
    return true;
  }
  
  if (request.action === 'startBackgroundDownloads') {
    startBackgroundQueue(request);
    sendResponse({ success: true });
    return true;
  }
  
  if (request.action === 'getDownloadProgress') {
    const session = activeSessions.get(request.comicUrl);
    if (session) {
      sendResponse(session);
    } else {
      sendResponse({ downloading: false });
    }
    return true;
  }
});

chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  if (downloadMap.has(item.url)) {
    suggest({ filename: downloadMap.get(item.url), conflictAction: 'uniquify' });
  } else {
    suggest();
  }
});

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function getExtension(url) {
  const cleanUrl = url.split(/[#?]/)[0];
  const parts = cleanUrl.split('.');
  if (parts.length > 1) {
    const ext = parts.pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'avif', 'bmp', 'tiff', 'tif', 'ico', 'heic', 'heif', 'jxl'].includes(ext)) {
      return ext;
    }
  }
  return 'jpg';
}

function getQualityFolder(width, height) {
  const max = Math.max(width, height);
  const min = Math.min(width, height);
  if (min >= 2160 || max >= 3840) return '4K';
  if (min >= 1440 || max >= 2560) return '2K';
  if (min >= 1080 || max >= 1920) return '1080p';
  if (min >= 720 || max >= 1280) return '720p';
  return 'Normal';
}

async function startBackgroundQueue({ toDownload, baseSf, uniqueSf, is3Hentai, isForcePNG, separateQuality, renameSequential, comicUrl }) {
  const finalComicUrl = comicUrl || (toDownload[0]?.src || toDownload[0] || 'default');
  const session = {
    downloading: true,
    completed: 0,
    total: toDownload.length
  };
  activeSessions.set(finalComicUrl, session);
  
  const total = toDownload.length;
  let completed = 0;
  
  const limit = is3Hentai ? 3 : total;
  let active = 0;
  let i = 0;
  
  const broadcastProgress = () => {
    chrome.runtime.sendMessage({
      action: 'downloadProgress',
      comicUrl: finalComicUrl,
      completed: completed,
      total: total,
      downloading: true
    }).catch(() => {
      // Ignore error when popup is closed
    });
    session.completed = completed;
    session.total = total;
  };

  const runNext = async () => {
    if (i >= total) {
      if (completed === total) {
        activeSessions.delete(finalComicUrl);
        chrome.runtime.sendMessage({
          action: 'downloadProgress',
          comicUrl: finalComicUrl,
          completed: completed,
          total: total,
          downloading: false
        }).catch(() => {});
      }
      return;
    }
    
    const idx = i++;
    const img = toDownload[idx];
    active++;
    
    try {
      const url = img.src || img;
      const width = img.width || 0;
      const height = img.height || 0;
      const ext = isForcePNG ? 'png' : getExtension(url);
      
      let sf = uniqueSf || baseSf || 'comics_completos';
      if (separateQuality && width > 0 && height > 0) {
        const quality = getQualityFolder(width, height);
        sf = `${sf}/${quality}`;
      }
      
      let name = url.split('/').pop().split(/[#?]/)[0].slice(0, 50) || `img_${idx + 1}`;
      if (renameSequential) {
        const padLength = Math.max(2, String(total).length);
        name = `pag_${String(idx + 1).padStart(padLength, '0')}`;
      }
      
      const filename = `${sf}/${name}.${ext}`;
      const requiresBlobFetch = url.includes('poringa.') || url.includes('chochox.') || url.includes('gold-usergeneratedcontent.net') || url.includes('nhentaimg.com') || url.includes('sexkomix') || url.includes('3hentai.xyz') || url.includes('3hentai.net') || url.includes('vercomicsporno.com') || url.includes('lectorhentai.com') || url.includes('hentaimode.com') || url.includes('giolandscaping.com') || isForcePNG;
      
      if (requiresBlobFetch) {
        try {
          const resp = await fetch(url);
          if (!resp.ok) throw new Error('Fetch failed');
          const blob = await resp.blob();
          
          const buffer = await blob.arrayBuffer();
          const base64 = arrayBufferToBase64(buffer);
          const dataUrl = `data:${blob.type};base64,${base64}`;
          
          await new Promise((resolve) => {
            downloadMap.set(dataUrl, filename);
            chrome.downloads.download({ url: dataUrl, filename: filename, saveAs: false }, () => resolve());
          });
        } catch (e) {
          console.warn("Background fetch failed, falling back to direct download", e);
          await new Promise((resolve) => {
            downloadMap.set(url, filename);
            chrome.downloads.download({ url: url, filename: filename, saveAs: false }, () => resolve());
          });
        }
      } else {
        await new Promise((resolve) => {
          downloadMap.set(url, filename);
          chrome.downloads.download({ url: url, filename: filename, saveAs: false }, () => resolve());
        });
      }
    } catch (err) {
      console.error("Background download error:", err);
    }
    
    active--;
    completed++;
    broadcastProgress();
    runNext();
  };

  for (let j = 0; j < Math.min(limit, total); j++) {
    runNext();
  }
}
