export async function getImagesFromPageDOM() {
  const isHentaiMode = window.location.hostname.includes('hentaimode.com');
  if (isHentaiMode) {
    try {
      if (typeof window.ts_reader !== 'undefined') {
        let images = null;
        if (window.ts_reader.sources && window.ts_reader.sources[0] && window.ts_reader.sources[0].images) {
          images = window.ts_reader.sources[0].images;
        } else if (window.ts_reader.params && window.ts_reader.params.sources && window.ts_reader.params.sources[0] && window.ts_reader.params.sources[0].images) {
          images = window.ts_reader.params.sources[0].images;
        }
        
        if (images && images.length > 0) {
          return images.map(src => {
            let finalSrc = src;
            try {
              finalSrc = new URL(finalSrc, window.location.href).href;
            } catch (e) {}
            return {
              src: finalSrc,
              width: 0,
              height: 0,
              inLink: false,
              linkHref: null,
              isKemonoThumb: false,
              isDirectLink: true
            };
          });
        }
      }

      const isMangaDetailsPage = !window.location.pathname.includes('/leer/');
      
      if (isMangaDetailsPage) {
        const title = document.querySelector('h1, .post-title h1, .manga-title h1')?.textContent?.trim() || document.title;
        const coverEl = document.querySelector('.summary_image img, .manga-cover img, .summary-image img, .manga-info img, img.cover');
        const cover = coverEl ? (coverEl.getAttribute('data-src') || coverEl.getAttribute('data-lazy-src') || coverEl.getAttribute('src') || '') : '';
        
        const chapters = [];
        const seenChapters = new Set();
        const chapterLinks = document.querySelectorAll('a[href*="/leer/"]');
        chapterLinks.forEach(a => {
          let href = a.href;
          if (href) {
            try {
              href = new URL(href, window.location.href).href;
            } catch(e) {}
            if (!seenChapters.has(href)) {
              seenChapters.add(href);
              chapters.push(href);
            }
          }
        });
        
        if (chapters.length > 0) {
          chapters.reverse();
          const results = [];
          const seenImages = new Set();
          
          for (const url of chapters) {
            try {
              const resp = await fetch(url);
              if (resp.ok) {
                const html = await resp.text();
                
                const match = html.match(/ts_reader\s*=\s*({[\s\S]*?});/);
                if (match) {
                  try {
                    const data = JSON.parse(match[1]);
                    let images = null;
                    if (data.sources && data.sources[0] && data.sources[0].images) {
                      images = data.sources[0].images;
                    } else if (data.params && data.params.sources && data.params.sources[0] && data.params.sources[0].images) {
                      images = data.params.sources[0].images;
                    }
                    
                    if (images && images.length > 0) {
                      images.forEach(src => {
                        let finalSrc = src;
                        try {
                          finalSrc = new URL(finalSrc, url).href;
                        } catch (e) {}
                        if (finalSrc.startsWith('http') && !seenImages.has(finalSrc)) {
                          seenImages.add(finalSrc);
                          results.push({
                            src: finalSrc,
                            width: 0,
                            height: 0,
                            inLink: false,
                            linkHref: null,
                            isKemonoThumb: false,
                            isDirectLink: true
                          });
                        }
                      });
                      continue;
                    }
                  } catch(e) {}
                }
                
                const doc = new DOMParser().parseFromString(html, 'text/html');
                const selectors = [
                  '.reading-content img',
                  '.wp-manga-chapter-img img',
                  '.wp-manga-chapter-img',
                  '.page-break img',
                  '.viewer-pages img',
                  '#viewer img',
                  '#viewer-container img',
                  '.chapter-images img',
                  '.reader-images img',
                  '#reader img',
                  '.reader img',
                  '#readerarea img'
                ];
                
                doc.querySelectorAll(selectors.join(', ')).forEach(img => {
                  let src = img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.getAttribute('data-original') || img.getAttribute('src');
                  if (src && !src.includes('readerarea.svg')) {
                    try {
                      src = new URL(src, url).href;
                    } catch(e) {}
                    if (src.startsWith('http') && !seenImages.has(src)) {
                      seenImages.add(src);
                      results.push({
                        src: src,
                        width: img.naturalWidth || img.width || 0,
                        height: img.naturalHeight || img.height || 0,
                        inLink: false,
                        linkHref: null,
                        isKemonoThumb: false,
                        isDirectLink: true
                      });
                    }
                  }
                });
              }
            } catch(err) {}
          }
          if (results.length > 0) {
            return results;
          }
        }
      }
      
      const results = [];
      const seen = new Set();
      const selectors = [
        '.reading-content img',
        '.wp-manga-chapter-img img',
        '.wp-manga-chapter-img',
        '.page-break img',
        '.viewer-pages img',
        '#viewer img',
        '#viewer-container img',
        '.chapter-images img',
        '.reader-images img',
        '#reader img',
        '.reader img',
        '#readerarea img'
      ];
      
      document.querySelectorAll(selectors.join(', ')).forEach(img => {
        let src = img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.getAttribute('data-original') || img.getAttribute('src');
        if (src && !src.includes('readerarea.svg')) {
          try {
            if (!src.startsWith('data:') && !src.startsWith('blob:')) {
              src = new URL(src, window.location.href).href;
            }
          } catch(e) {}
          if (src.startsWith('http') && !seen.has(src)) {
            seen.add(src);
            results.push({
              src: src,
              width: img.naturalWidth || img.width || 0,
              height: img.naturalHeight || img.height || 0,
              inLink: false,
              linkHref: null,
              isKemonoThumb: false,
              isDirectLink: true
            });
          }
        }
      });
      
      if (results.length < 3) {
        try {
          const resp = await fetch(window.location.href);
          if (resp.ok) {
            const html = await resp.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');
            doc.querySelectorAll(selectors.join(', ')).forEach(img => {
              let src = img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.getAttribute('data-original') || img.getAttribute('src');
              if (src && !src.includes('readerarea.svg')) {
                try {
                  if (!src.startsWith('data:') && !src.startsWith('blob:')) {
                    src = new URL(src, window.location.href).href;
                  }
                } catch(e) {}
                if (src.startsWith('http') && !seen.has(src)) {
                  seen.add(src);
                  results.push({
                    src: src,
                    width: img.naturalWidth || img.width || 0,
                    height: img.naturalHeight || img.height || 0,
                    inLink: false,
                    linkHref: null,
                    isKemonoThumb: false,
                    isDirectLink: true
                  });
                }
              }
            });
          }
        } catch(err) {}
      }
      
      if (results.length === 0) {
        document.querySelectorAll('img').forEach(img => {
          let src = img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.getAttribute('data-original') || img.getAttribute('data-opt-src') || img.src;
          if (src && !src.includes('readerarea.svg')) {
            try {
              if (!src.startsWith('data:') && !src.startsWith('blob:')) {
                src = new URL(src, window.location.href).href;
              }
            } catch(e) {}
            if (src.startsWith('http') && !src.includes('logo') && !src.includes('banner') && !seen.has(src)) {
              seen.add(src);
              results.push({
                src: src,
                width: img.naturalWidth || img.width || 0,
                height: img.naturalHeight || img.height || 0,
                inLink: false,
                linkHref: null,
                isKemonoThumb: false,
                isDirectLink: true
              });
            }
          }
        });
      }
      
      if (results.length > 0) {
        return results;
      }
    } catch (e) {
      console.error("HentaiMode parser error:", e);
    }
  }

  const isLectorHentai = window.location.hostname.includes('lectorhentai.com');
  if (isLectorHentai) {
    try {
      if (typeof window.ts_reader !== 'undefined') {
        let images = null;
        if (window.ts_reader.sources && window.ts_reader.sources[0] && window.ts_reader.sources[0].images) {
          images = window.ts_reader.sources[0].images;
        } else if (window.ts_reader.params && window.ts_reader.params.sources && window.ts_reader.params.sources[0] && window.ts_reader.params.sources[0].images) {
          images = window.ts_reader.params.sources[0].images;
        }
        
        if (images && images.length > 0) {
          return images.map(src => {
            let finalSrc = src;
            try {
              finalSrc = new URL(finalSrc, window.location.href).href;
            } catch (e) {}
            return {
              src: finalSrc,
              width: 0,
              height: 0,
              inLink: false,
              linkHref: null,
              isKemonoThumb: false,
              isDirectLink: true
            };
          });
        }
      }

      const isMangaDetailsPage = window.location.pathname.includes('/manga/') && 
                                 !window.location.pathname.includes('/capitulo') && 
                                 !window.location.pathname.includes('/chapter') &&
                                 !window.location.pathname.includes('/read/') &&
                                 !window.location.pathname.includes('/lector/');
      const hasReaderElement = document.querySelector('.reading-content, .wp-manga-chapter-img, .page-break, #viewer, .chapter-images, #readerarea');
      
      if (isMangaDetailsPage && !hasReaderElement) {
        const title = document.querySelector('h1, .post-title h1, .manga-title h1')?.textContent?.trim() || document.title;
        const coverEl = document.querySelector('.summary_image img, .manga-cover img, .summary-image img, .manga-info img');
        const cover = coverEl ? (coverEl.getAttribute('data-src') || coverEl.getAttribute('data-lazy-src') || coverEl.getAttribute('src') || '') : '';
        
        const chapters = [];
        const seenChapters = new Set();
        const chapterLinks = document.querySelectorAll('.wp-manga-chapter a, .listing-chapters_wrap a, a[href*="/capitulo-"], a[href*="/chapter-"], a[href*="/read/"], a[href*="/lector/"]');
        chapterLinks.forEach(a => {
          let href = a.href;
          if (href) {
            try {
              href = new URL(href, window.location.href).href;
            } catch(e) {}
            if (!seenChapters.has(href)) {
              seenChapters.add(href);
              chapters.push(href);
            }
          }
        });
        
        if (chapters.length === 0) {
          document.querySelectorAll('a').forEach(a => {
            let href = a.href;
            if (href && (href.includes('/capitulo-') || href.includes('/chapter-') || href.includes('/read/') || href.includes('/lector/') || a.textContent.toLowerCase().includes('capítulo') || a.textContent.toLowerCase().includes('cap.') || a.textContent.toLowerCase().includes('chapter') || a.textContent.toLowerCase().includes('ch.'))) {
              try {
                href = new URL(href, window.location.href).href;
              } catch(e) {}
              if (!seenChapters.has(href)) {
                seenChapters.add(href);
                chapters.push(href);
              }
            }
          });
        }
        
        if (chapters.length > 0) {
          chapters.reverse();
          
          const results = [];
          const seenImages = new Set();
          const selectors = [
            '.reading-content img',
            '.wp-manga-chapter-img img',
            '.wp-manga-chapter-img',
            '.page-break img',
            '.viewer-pages img',
            '#viewer img',
            '.chapter-images img',
            '#readerarea img'
          ];
          
          for (const url of chapters) {
            try {
              const resp = await fetch(url);
              if (resp.ok) {
                const html = await resp.text();
                
                const match = html.match(/ts_reader\s*=\s*({[\s\S]*?});/);
                if (match) {
                  try {
                    const data = JSON.parse(match[1]);
                    let images = null;
                    if (data.sources && data.sources[0] && data.sources[0].images) {
                      images = data.sources[0].images;
                    } else if (data.params && data.params.sources && data.params.sources[0] && data.params.sources[0].images) {
                      images = data.params.sources[0].images;
                    }
                    
                    if (images && images.length > 0) {
                      images.forEach(src => {
                        let finalSrc = src;
                        try {
                          finalSrc = new URL(finalSrc, url).href;
                        } catch (e) {}
                        if (finalSrc.startsWith('http') && !seenImages.has(finalSrc)) {
                          seenImages.add(finalSrc);
                          results.push({
                            src: finalSrc,
                            width: 0,
                            height: 0,
                            inLink: false,
                            linkHref: null,
                            isKemonoThumb: false,
                            isDirectLink: true
                          });
                        }
                      });
                      continue;
                    }
                  } catch(e) {}
                }
                
                const doc = new DOMParser().parseFromString(html, 'text/html');
                
                doc.querySelectorAll(selectors.join(', ')).forEach(img => {
                  let src = img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.getAttribute('data-original') || img.getAttribute('src');
                  if (src && !src.includes('readerarea.svg')) {
                    try {
                      src = new URL(src, url).href;
                    } catch(e) {}
                    if (src.startsWith('http') && !seenImages.has(src)) {
                      seenImages.add(src);
                      results.push({
                        src: src,
                        width: img.naturalWidth || img.width || 0,
                        height: img.naturalHeight || img.height || 0,
                        inLink: false,
                        linkHref: null,
                        isKemonoThumb: false,
                        isDirectLink: true
                      });
                    }
                  }
                });
                
                if (results.length === 0) {
                  doc.querySelectorAll('img').forEach(img => {
                    let src = img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.getAttribute('data-original') || img.getAttribute('data-opt-src') || img.src;
                    if (src && !src.includes('readerarea.svg')) {
                      try {
                        src = new URL(src, url).href;
                      } catch(e) {}
                      if (src.startsWith('http') && !src.includes('logo') && !src.includes('banner') && !seenImages.has(src)) {
                        seenImages.add(src);
                        results.push({
                          src: src,
                          width: img.naturalWidth || img.width || 0,
                          height: img.naturalHeight || img.height || 0,
                          inLink: false,
                          linkHref: null,
                          isKemonoThumb: false,
                          isDirectLink: true
                        });
                      }
                    }
                  });
                }
              }
            } catch(err) {}
          }
          
          if (results.length > 0) {
            return results;
          }
        }
      }
      
      const results = [];
      const seen = new Set();
      const selectors = [
        '.reading-content img',
        '.wp-manga-chapter-img img',
        '.wp-manga-chapter-img',
        '.page-break img',
        '.viewer-pages img',
        '#viewer img',
        '.chapter-images img',
        '#readerarea img'
      ];
      
      document.querySelectorAll(selectors.join(', ')).forEach(img => {
        let src = img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.getAttribute('data-original') || img.getAttribute('src');
        if (src) {
          try {
            if (!src.startsWith('data:') && !src.startsWith('blob:')) {
              src = new URL(src, window.location.href).href;
            }
          } catch(e) {}
          if (src.startsWith('http') && !seen.has(src)) {
            seen.add(src);
            results.push({
              src: src,
              width: img.naturalWidth || img.width || 0,
              height: img.naturalHeight || img.height || 0,
              inLink: false,
              linkHref: null,
              isKemonoThumb: false,
              isDirectLink: true
            });
          }
        }
      });
      
      if (results.length < 3) {
        try {
          const resp = await fetch(window.location.href);
          if (resp.ok) {
            const html = await resp.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');
            doc.querySelectorAll(selectors.join(', ')).forEach(img => {
              let src = img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.getAttribute('data-original') || img.getAttribute('src');
              if (src) {
                try {
                  if (!src.startsWith('data:') && !src.startsWith('blob:')) {
                    src = new URL(src, window.location.href).href;
                  }
                } catch(e) {}
                if (src.startsWith('http') && !seen.has(src)) {
                  seen.add(src);
                  results.push({
                    src: src,
                    width: img.naturalWidth || img.width || 0,
                    height: img.naturalHeight || img.height || 0,
                    inLink: false,
                    linkHref: null,
                    isKemonoThumb: false,
                    isDirectLink: true
                  });
                }
              }
            });
          }
        } catch(err) {}
      }
      
      if (results.length === 0) {
        document.querySelectorAll('img').forEach(img => {
          let src = img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.getAttribute('data-original') || img.getAttribute('data-opt-src') || img.src;
          if (src) {
            try {
              if (!src.startsWith('data:') && !src.startsWith('blob:')) {
                src = new URL(src, window.location.href).href;
              }
            } catch(e) {}
            if (src.startsWith('http') && !src.includes('logo') && !src.includes('banner') && !seen.has(src)) {
              seen.add(src);
              results.push({
                src: src,
                width: img.naturalWidth || img.width || 0,
                height: img.naturalHeight || img.height || 0,
                inLink: false,
                linkHref: null,
                isKemonoThumb: false,
                isDirectLink: true
              });
            }
          }
        });
      }
      
      if (results.length > 0) {
        return results;
      }
    } catch (e) {
      console.error("LectorHentai parser error:", e);
    }
  }

  const isVerComicsPorno = window.location.hostname.includes('vercomicsporno.com');
  if (isVerComicsPorno) {
    try {
      const results = [];
      const seen = new Set();
      document.querySelectorAll('.wp-content img, .posts img').forEach(img => {
        let src = img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.getAttribute('src');
        if (src) {
          try {
            if (!src.startsWith('data:') && !src.startsWith('blob:')) {
              src = new URL(src, window.location.href).href;
            }
          } catch(e) {}
          if (
            src.startsWith('http') && 
            src.includes('/wp-content/uploads/') && 
            !src.includes('avatar.jpg') &&
            !src.includes('/avatar') &&
            !src.match(/-\d+x\d+\.(jpg|jpeg|png|webp|gif)$/i) &&
            !seen.has(src)
          ) {
            seen.add(src);
            results.push({
              src: src,
              width: img.naturalWidth || img.width || 0,
              height: img.naturalHeight || img.height || 0,
              inLink: false,
              linkHref: null,
              isKemonoThumb: false,
              isDirectLink: true
            });
          }
        }
      });
      if (results.length > 0) {
        return results;
      }
    } catch (e) {
      console.error("vercomicsporno parser error:", e);
    }
  }

  const isSexkomix = window.location.hostname.includes('sexkomix');
  if (isSexkomix) {
    try {
      const results = [];
      const seen = new Set();
      document.querySelectorAll('ul#comix_pages_ul > li img').forEach(img => {
        let src = img.getAttribute('data-src') || img.getAttribute('src');
        if (src) {
          try {
            if (!src.startsWith('data:') && !src.startsWith('blob:')) {
              src = new URL(src, window.location.href).href;
            }
          } catch(e) {}
          if (src.startsWith('http') && !seen.has(src)) {
            seen.add(src);
            results.push({
              src: src,
              width: img.naturalWidth || img.width || 0,
              height: img.naturalHeight || img.height || 0,
              inLink: false,
              linkHref: null,
              isKemonoThumb: false,
              isDirectLink: true
            });
          }
        }
      });
      if (results.length > 0) {
        return results;
      }
    } catch (e) {
      console.error("sexkomix parser error:", e);
    }
  }

  const isNHentai = window.location.hostname.includes('nhentai.xxx') || window.location.hostname.includes('nhentai.net') || window.location.hostname.includes('nhentai.to');
  if (isNHentai) {
    try {
      const g_th = window.g_th;
      if (g_th) {
        const g_th_fl = g_th.fl || g_th;
        let baseUrl = '';
        const mediaServer = window.media_server;
        const imageDir = document.getElementById('image_dir')?.value;
        const galleryId = document.getElementById('gallery_id')?.value;
        if (mediaServer && imageDir && galleryId) {
          baseUrl = `https://${mediaServer}/${imageDir}/${galleryId}`;
        }
        if (!baseUrl) {
          const mainImg = document.querySelector('.fw_img img');
          const mainSrc = mainImg ? (mainImg.getAttribute('data-src') || mainImg.getAttribute('src')) : null;
          if (mainSrc && mainSrc.startsWith('http')) {
            const lastSlash = mainSrc.lastIndexOf('/');
            baseUrl = mainSrc.substring(0, lastSlash);
          }
        }
        if (!baseUrl) {
          const thumbImg = document.querySelector('.gallery_thumbs img, .gt_th img, #thumbs_append img');
          const thumbSrc = thumbImg ? (thumbImg.getAttribute('data-src') || thumbImg.getAttribute('src')) : null;
          if (thumbSrc && thumbSrc.startsWith('http')) {
            const lastSlash = thumbSrc.lastIndexOf('/');
            baseUrl = thumbSrc.substring(0, lastSlash);
          }
        }
        if (baseUrl) {
          const totalPages = Object.keys(g_th_fl).length;
          const results = [];
          for (let i = 1; i <= totalPages; i++) {
            const pageData = g_th_fl[String(i)];
            if (pageData) {
              const parts = pageData.split(',');
              const code = parts[0];
              const w = parseInt(parts[1]) || 0;
              const h = parseInt(parts[2]) || 0;
              let ext = 'jpg';
              if (code === 'w') ext = 'webp';
              else if (code === 'p') ext = 'png';
              else if (code === 'j') ext = 'jpg';
              
              const src = `${baseUrl}/${i}.${ext}`;
              results.push({
                src: src,
                width: w,
                height: h,
                inLink: false,
                linkHref: null,
                isKemonoThumb: false
              });
            }
          }
          if (results.length > 0) {
            return results;
          }
        }
      }
    } catch (e) {
      console.error("nhentai parser error:", e);
    }
  }

  const is3Hentai = window.location.hostname.includes('3hentai.net');
  if (is3Hentai) {
    try {
      const results = [];
      const seen = new Set();
      
      const readerPages = window.readerPages;
      if (readerPages && readerPages.pages && readerPages.baseUriImg) {
        const baseUriImg = readerPages.baseUriImg;
        const totalPages = readerPages.lastPage || Object.keys(readerPages.pages).length;
        
        for (let i = 1; i <= totalPages; i++) {
          const pageData = readerPages.pages[String(i)];
          if (pageData && pageData.f) {
            const src = baseUriImg.replace('%s', pageData.f);
            if (!seen.has(src)) {
              seen.add(src);
              results.push({
                src: src,
                width: pageData.w || 0,
                height: pageData.h || 0,
                inLink: false,
                linkHref: null,
                isKemonoThumb: false
              });
            }
          }
        }
      }
      
      if (results.length === 0) {
        const thumbs = document.querySelectorAll('#thumbnail-gallery img, .single-thumb img, .single-thumb-col img');
        thumbs.forEach(img => {
          let src = img.getAttribute('data-src') || img.getAttribute('src');
          if (src) {
            try {
              if (!src.startsWith('data:') && !src.startsWith('blob:')) {
                src = new URL(src, window.location.href).href;
              }
            } catch(e) {}
            
            const match = src.match(/^(.*\/)(\d+)t\.(jpg|png|webp|jpeg|gif)$/i);
            if (match) {
              const base = match[1];
              const pageNum = match[2];
              const ext = match[3];
              const fullSrc = `${base}${pageNum}.${ext}`;
              
              if (!seen.has(fullSrc)) {
                seen.add(fullSrc);
                results.push({
                  src: fullSrc,
                  width: img.naturalWidth || img.width || 0,
                  height: img.naturalHeight || img.height || 0,
                  inLink: false,
                  linkHref: null,
                  isKemonoThumb: false
                });
              }
            }
          }
        });
      }
      
      if (results.length > 0) {
        return results;
      }
    } catch (e) {
      console.error("3hentai parser error:", e);
    }
  }

  const isHentaiera = window.location.hostname.includes('hentaiera.com') && window.location.pathname.includes('/view/');
  if (isHentaiera) {
    try {
      const pagesInput = document.getElementById('pages');
      const gimg = document.getElementById('gimg');
      const g_th = window.g_th;
      if (pagesInput && gimg && g_th) {
        const totalPages = parseInt(pagesInput.value) || 0;
        const firstImgSrc = gimg.src || gimg.getAttribute('data-src');
        if (firstImgSrc && totalPages > 0) {
          const lastSlashIdx = firstImgSrc.lastIndexOf('/');
          const baseUrl = firstImgSrc.substring(0, lastSlashIdx);
          const results = [];
          for (let i = 1; i <= totalPages; i++) {
            const pageData = g_th[String(i)];
            if (pageData) {
              const parts = pageData.split(',');
              const code = parts[0];
              const w = parseInt(parts[1]) || 0;
              const h = parseInt(parts[2]) || 0;
              let ext = 'jpg';
              if (code === 'w') ext = 'webp';
              else if (code === 'p') ext = 'png';
              else if (code === 'j') ext = 'jpg';
              
              const src = `${baseUrl}/${i}.${ext}`;
              results.push({
                src: src,
                width: w,
                height: h,
                inLink: false,
                linkHref: null,
                isKemonoThumb: false
              });
            }
          }
          if (results.length > 0) {
            return results;
          }
        }
      }
    } catch (e) {
      console.error("Hentaiera parser error:", e);
    }
  }

  const isHitomi = window.location.hostname.includes('hitomi.la');
  if (isHitomi) {
    try {
      const match = window.location.href.match(/([0-9]+)\.html/);
      if (match) {
        const galleryId = match[1];
        
        const loadScript = (src) => {
          return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Failed to load ${src}`));
            (document.head || document.documentElement).appendChild(script);
          });
        };

        if (typeof window.galleryinfo === 'undefined' || !window.galleryinfo || !window.galleryinfo.files) {
          await loadScript(`https://ltn.hitomi.la/galleries/${galleryId}.js`);
        }
        if (typeof window.url_from_url_from_hash === 'undefined') {
          await loadScript('https://ltn.hitomi.la/common.js');
        }
        if (typeof window.gg === 'undefined' || !window.gg || !window.gg.m || !window.gg.s || !window.gg.b) {
          await loadScript('https://ltn.hitomi.la/gg.js');
        }

        if (window.galleryinfo && window.galleryinfo.files) {
          const results = [];
          window.galleryinfo.files.forEach((file) => {
            let src = '';
            try {
              src = window.url_from_url_from_hash(galleryId, file, 'webp', undefined, undefined);
            } catch (e) {
              console.error("url_from_url_from_hash failed", e);
            }
            if (src) {
              results.push({
                src: src,
                width: file.width || 0,
                height: file.height || 0,
                inLink: false,
                linkHref: null,
                isKemonoThumb: false
              });
            }
          });
          if (results.length > 0) {
            return results;
          }
        }
      }
    } catch (e) {
      console.error("Hitomi parser error:", e);
    }
  }

  const results = [];
  document.querySelectorAll('img').forEach(img => {
    let p = img.parentElement, inLink = false, linkHref = null;
    while(p && p.tagName !== 'BODY') {
      if (p.tagName === 'A') { inLink = true; linkHref = p.href; break; }
      p = p.parentElement;
    }
    let src = img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.getAttribute('data-opt-src') || img.src;
    
    try {
      if (src && !src.startsWith('data:') && !src.startsWith('blob:')) {
        src = new URL(src, window.location.href).href;
      }
    } catch(e) {}

    if (src?.startsWith('http')) {
      const isKemonoThumb = src.includes('kemono.') && src.includes('/thumbnail/data/');
      results.push({ src, width: img.naturalWidth || 0, height: img.naturalHeight || 0, inLink, linkHref, isKemonoThumb });
    }
  });

  document.querySelectorAll('.post__files a, .post__file a, .fileThumb, a[href*="kemono."]').forEach(a => {
    if (a.href.match(/\.(jpg|jpeg|png|webp|gif|svg|avif|bmp|tiff|tif|ico|heic|heif|jxl)$/i)) {
      results.push({ src: a.href, width: 0, height: 0, inLink: true, linkHref: a.href, isDirectLink: true });
    }
  });
  return results;
}
