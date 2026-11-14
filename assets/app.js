/**
 * h0syh0aπg Cinema - Clean & Ultra-Fast Player Engine (Artplayer + Hls.js)
 * Tính năng cao cấp: Phụ đề tương phản cao, Nhớ tiến độ xem & Tiếp tục, Tự chuyển tập, Yêu thích & Phím tắt.
 */

// ==========================================
// 1. Quản lý Bộ nhớ: Lịch sử Xem & Yêu thích
// ==========================================
const KEY_HISTORY = 'h0_watch_history';
const KEY_FAVORITES = 'h0_favorites';

function getWatchHistory() {
  try {
    return JSON.parse(localStorage.getItem(KEY_HISTORY) || '[]');
  } catch (e) { return []; }
}

function saveWatchHistory(item) {
  if (!item || !item.slug) return;
  try {
    let hist = getWatchHistory().filter(x => x.slug !== item.slug);
    hist.unshift({
      slug: item.slug,
      name: item.name,
      poster: item.poster,
      epIndex: item.epIndex || 0,
      epName: item.epName || 'Tập 1',
      time: Math.floor(item.time || 0),
      duration: Math.floor(item.duration || 0),
      percent: item.duration > 0 ? Math.min(100, Math.floor((item.time / item.duration) * 100)) : 0,
      updatedAt: Date.now()
    });
    if (hist.length > 24) hist = hist.slice(0, 24);
    localStorage.setItem(KEY_HISTORY, JSON.stringify(hist));
  } catch (e) {}
}

window.removeWatchHistory = function(slug, e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  try {
    const hist = getWatchHistory().filter(x => x.slug !== slug);
    localStorage.setItem(KEY_HISTORY, JSON.stringify(hist));
    const shelf = document.querySelector('.resume-shelf');
    if (shelf) {
      if (hist.length) {
        shelf.outerHTML = renderResumeShelfHtml();
      } else {
        shelf.remove();
      }
    }
  } catch (e) {}
};

window.clearAllHistory = function() {
  if (confirm('Bạn có chắc muốn xoá toàn bộ lịch sử xem không?')) {
    localStorage.removeItem(KEY_HISTORY);
    const shelf = document.querySelector('.resume-shelf');
    if (shelf) shelf.remove();
  }
};

function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem(KEY_FAVORITES) || '[]');
  } catch (e) { return []; }
}

function isMovieFavorited(slug) {
  return getFavorites().some(x => x.slug === slug);
}

window.toggleFavMovie = function(slug, name, poster, year, type) {
  try {
    let favs = getFavorites();
    const idx = favs.findIndex(x => x.slug === slug);
    let isNowFav = false;
    if (idx >= 0) {
      favs.splice(idx, 1);
      isNowFav = false;
    } else {
      favs.unshift({ slug, name, poster, year, type, addedAt: Date.now() });
      isNowFav = true;
    }
    localStorage.setItem(KEY_FAVORITES, JSON.stringify(favs));
    const btn = document.getElementById('favBtn');
    if (btn) {
      btn.innerHTML = isNowFav ? '💖 Đã Lưu' : '❤️ Lưu Phim';
      btn.style.color = isNowFav ? '#ef4444' : '#fff';
      btn.style.borderColor = isNowFav ? '#ef4444' : 'rgba(255,255,255,0.15)';
      btn.style.background = isNowFav ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)';
    }
  } catch (e) {}
};

function formatTime(sec) {
  if (!sec || isNaN(sec)) return '00:00';
  const s = Math.floor(sec);
  const m = Math.floor(s / 60);
  const remS = s % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const remM = m % 60;
    return `${h}:${remM < 10 ? '0' : ''}${remM}:${remS < 10 ? '0' : ''}${remS}`;
  }
  return `${m}:${remS < 10 ? '0' : ''}${remS}`;
}

// ==========================================
// 2. Trạng thái Player & Auto-Next
// ==========================================
let currentArtInstance = null;
let currentMovieContext = null;
let currentPlaySeq = 0;
let autoNextTimer = null;
let lastHistorySaveTime = 0;

function clearAutoNext() {
  if (autoNextTimer) {
    clearInterval(autoNextTimer);
    autoNextTimer = null;
  }
  const overlay = document.getElementById('autoNextOverlay');
  if (overlay) overlay.remove();
}

window.cancelAutoNext = function() {
  clearAutoNext();
};

window.triggerAutoNextNow = function(nextEpIdx) {
  clearAutoNext();
  if (typeof switchEpisode === 'function') {
    switchEpisode(nextEpIdx);
  }
};

function showAutoNextCountdown(nextEp, nextEpIdx) {
  clearAutoNext();
  const box = document.querySelector('.player__box');
  if (!box) return;

  const overlay = document.createElement('div');
  overlay.id = 'autoNextOverlay';
  overlay.className = 'auto-next-overlay';
  overlay.innerHTML = `
    <div class="auto-next-card">
      <div style="font-size:12px;font-weight:700;letter-spacing:1px;color:#8b94a7;text-transform:uppercase;">Tập Kế Tiếp</div>
      <div style="font-size:18px;font-weight:700;color:#fff;margin:8px 0;">${nextEp.name || ('Tập ' + (nextEpIdx + 1))}</div>
      <div style="font-size:14px;color:#00f0ff;margin-bottom:16px;">Tự động phát sau <span id="autoNextSec" style="font-size:18px;font-weight:700;">4</span>s...</div>
      <div style="display:flex;gap:10px;justify-content:center;">
        <button type="button" onclick="triggerAutoNextNow(${nextEpIdx})" style="padding:9px 20px;background:#00f0ff;color:#000;border:none;border-radius:8px;font-weight:700;cursor:pointer;">Chuyển Ngay</button>
        <button type="button" onclick="cancelAutoNext()" style="padding:9px 18px;background:rgba(255,255,255,0.15);color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;">Hủy</button>
      </div>
    </div>
  `;
  box.appendChild(overlay);

  let remain = 4;
  autoNextTimer = setInterval(() => {
    remain--;
    const secEl = document.getElementById('autoNextSec');
    if (secEl) secEl.innerText = remain;
    if (remain <= 0) {
      clearAutoNext();
      triggerAutoNextNow(nextEpIdx);
    }
  }, 1000);
}

// ==========================================
// 3. VSMov Worker Proxy & Subtitle Loader
// ==========================================
async function resolveVsmovData(rawUrl) {
  const m = rawUrl.match(/^https:\/\/(v\d+\.streamvsmov\.com)\/stream\/([a-zA-Z0-9-]+)\/master\.m3u8/);
  if (!m) return { url: rawUrl, subtitles: [] };
  const host = 'https://' + m[1];
  try {
    const embedUrl = host + '/video/' + m[2];
    const workerUrl = 'https://damp-feather-8471.hoangsv19092009.workers.dev/?url=' + encodeURIComponent(embedUrl);
    const resp = await fetch(workerUrl);
    if (!resp.ok) return { url: rawUrl, subtitles: [] };
    const html = await resp.text();

    let resolvedUrl = rawUrl;
    const sigMatch = html.match(/signedMasterUrl:\s*"([^"]+)"/);
    if (sigMatch && sigMatch[1]) {
      resolvedUrl = sigMatch[1];
    }

    let subs = [];
    const subMatch = html.match(/subtitles:\s*(\[[\s\S]*?\])\s*,/);
    if (subMatch && subMatch[1]) {
      try {
        const parsed = JSON.parse(subMatch[1]);
        const getSubMeta = (s) => {
          const c = String(s.code || '').toLowerCase().trim();
          if (c === 'vie' || c === 'vi' || c.startsWith('vi')) return { norm: 'vie', label: s.label || 'Tiếng Việt', order: 1 };
          if (c === 'zho' || c === 'chi' || c === 'zh' || c === 'cmn' || c.startsWith('zh')) return { norm: 'zho', label: s.label || 'Tiếng Trung', order: 2 };
          if (c === 'eng' || c === 'en' || c.startsWith('en')) return { norm: 'eng', label: s.label || 'English', order: 3 };
          return { norm: c || 'other', label: s.label || (s.code ? s.code.toUpperCase() : 'Khác'), order: 4 };
        };
        subs = parsed
          .filter(s => s && s.url)
          .map(s => {
            const meta = getSubMeta(s);
            return {
              code: meta.norm,
              order: meta.order,
              label: meta.label,
              src: s.url.startsWith('//') ? ('https:' + s.url) : (s.url.startsWith('/') ? (host + s.url) : s.url)
            };
          })
          .sort((a, b) => a.order - b.order);
      } catch (pe) {}
    }

    return { url: resolvedUrl, subtitles: subs };
  } catch (e) {
    return { url: rawUrl, subtitles: [] };
  }
}

async function createCleanVttBlobUrl(vttUrl) {
  try {
    const resp = await fetch(vttUrl);
    if (!resp.ok) return vttUrl;
    let text = await resp.text();
    if (!text.trimStart().startsWith('WEBVTT')) {
      text = 'WEBVTT\n\n' + text;
    }
    text = text.replace(/(\d{1,2}:\d{2}(?::\d{2})?),(\d{3})/g, '$1.$2');
    return URL.createObjectURL(new Blob([text], { type: 'text/vtt;charset=utf-8' }));
  } catch (e) {
    return vttUrl;
  }
}

// ==========================================
// 4. Khởi tạo & Điều khiển Trình phát Artplayer
// ==========================================
let activeStallWatchdog = null;

function clearStallWatchdog() {
  if (activeStallWatchdog) {
    clearInterval(activeStallWatchdog);
    activeStallWatchdog = null;
  }
}

function tryFallbackToNextServer(reasonText) {
  if (!currentMovieContext || !currentMovieContext.servers) return false;
  const nextServerIdx = (currentMovieContext.currentServerIdx || 0) + 1;
  if (nextServerIdx >= currentMovieContext.servers.length) return false;

  const epIdx = currentMovieContext.currentEpIdx || 0;
  const resumeSec = (currentArtInstance && currentArtInstance.currentTime > 2) ? currentArtInstance.currentTime : 0;
  const serverBtns = document.querySelectorAll('.server-list button');
  const nextBtn = serverBtns[nextServerIdx] || null;

  console.warn('[SmartFallback]', reasonText, '-> Switching to server', nextServerIdx);
  switchServer(nextServerIdx, nextBtn, epIdx, resumeSec);

  setTimeout(() => {
    if (currentArtInstance && currentArtInstance.notice) {
      currentArtInstance.notice.show = reasonText || '⚡ Đã tự động chuyển sang máy chủ dự phòng mượt hơn!';
    }
  }, 600);
  return true;
}

window.playStream = async function(url, initialSeekTime = 0) {
  const box = document.querySelector('.player__box');
  if (!box || !url) return;

  const seq = ++currentPlaySeq;
  clearAutoNext();
  clearStallWatchdog();

  if (currentArtInstance) {
    try { currentArtInstance.destroy(false); } catch (e) {}
    currentArtInstance = null;
  }

  // Xóa nút phụ đề cũ nếu có
  const oldSubBar = document.getElementById('subSwitcherBar');
  if (oldSubBar) oldSubBar.remove();

  if (url.includes('.m3u8')) {
    box.innerHTML = '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#00f0ff;font-size:16px;background:#000;">⚡ Đang kết nối luồng phát sạch...</div>';

    let finalUrl = url;
    let subtitles = [];
    if (url.includes('streamvsmov.com/stream/') && !url.includes('signature=')) {
      const resolved = await resolveVsmovData(url);
      if (seq !== currentPlaySeq) return;
      finalUrl = resolved.url;
      subtitles = resolved.subtitles;
    }

    if (seq !== currentPlaySeq) return;
    box.innerHTML = '';

    // Chuẩn bị phụ đề blob
    let subTracks = [];
    if (subtitles && subtitles.length > 0) {
      subTracks = await Promise.all(subtitles.map(async s => ({
        code: s.code,
        label: s.label || (s.code === 'vie' ? 'Tiếng Việt' : 'English'),
        url: await createCleanVttBlobUrl(s.src)
      })));
    }

    const defaultSub = subTracks.find(s => s.code === 'vie') || subTracks[0];

    try {
      const art = new Artplayer({
        container: box,
        url: finalUrl,
        type: 'm3u8',
        autoplay: true,
        autoSize: false,
        autoMini: false,
        loop: false,
        playbackRate: true,
        aspectRatio: true,
        setting: true,
        hotkey: true,
        pip: true,
        fullscreen: true,
        fullscreenWeb: true,
        airplay: true,
        theme: '#00f0ff',
        lang: 'vi',
        customType: {
          m3u8: function(video, m3u8Url, artInst) {
            if (window.Hls && Hls.isSupported()) {
              if (artInst.hls) artInst.hls.destroy();
              const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: false,
                startFragPrefetch: true,
                testBandwidth: true,
                maxBufferLength: 60,
                maxMaxBufferLength: 120,
                maxBufferSize: 100 * 1000 * 1000,
                maxBufferHole: 0.8,
                highBufferWatchdogPeriod: 2,
                nudgeOffset: 0.15,
                nudgeMaxRetry: 5,
                backBufferLength: 30,
                abrEwmaDefaultEstimate: 2500000,
                fragLoadingTimeOut: 25000,
                fragLoadingMaxRetry: 4,
                manifestLoadingTimeOut: 15000,
                manifestLoadingMaxRetry: 4,
                levelLoadingTimeOut: 15000,
                levelLoadingMaxRetry: 4
              });
              hls.loadSource(m3u8Url);
              hls.attachMedia(video);
              artInst.hls = hls;
              artInst.on('destroy', () => {
                clearStallWatchdog();
                hls.destroy();
              });

              // D. Bộ chọn Độ phân giải (Quality Selector) khi có nhiều luồng (1080p / 720p / 480p...)
              hls.on(Hls.Events.MANIFEST_PARSED, function() {
                if (hls.levels && hls.levels.length > 1) {
                  const qualitySelector = [
                    { default: true, html: 'Tự động (Auto)', level: -1 },
                    ...hls.levels.map((lv, idx) => ({
                      default: false,
                      html: lv.height ? `${lv.height}p` : `Mức ${idx + 1}`,
                      level: idx
                    })).reverse()
                  ];
                  try {
                    artInst.setting.add({
                      html: 'Chất lượng',
                      width: 200,
                      tooltip: 'Tự động',
                      selector: qualitySelector,
                      onSelect: function(item) {
                        hls.currentLevel = item.level;
                        artInst.notice.show = `📺 Chất lượng: ${item.html}`;
                        return item.html;
                      }
                    });
                  } catch (qe) {}
                } else {
                  try {
                    artInst.setting.add({
                      html: 'Chất lượng',
                      width: 200,
                      tooltip: 'Gốc (FHD)',
                      selector: [{ default: true, html: 'Bản gốc (Single Stream)' }],
                      onSelect: function(item) { return item.html; }
                    });
                  } catch (qe) {}
                }
              });

              let fatalRetryCount = 0;
              hls.on(Hls.Events.ERROR, function(evt, data) {
                // Xử lý non-fatal BUFFER_STALLED_ERROR (bị kẹt micro-gap gây quay tròn)
                if (data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR || data.details === 'bufferStalledError') {
                  if (video.buffered && video.buffered.length > 0) {
                    for (let i = 0; i < video.buffered.length; i++) {
                      const bStart = video.buffered.start(i);
                      if (bStart > video.currentTime && bStart - video.currentTime < 1.5) {
                        video.currentTime = bStart + 0.05;
                        break;
                      }
                    }
                  }
                  hls.startLoad();
                  return;
                }

                if (data.fatal) {
                  fatalRetryCount++;
                  if (fatalRetryCount >= 3) {
                    if (tryFallbackToNextServer('⚠️ Máy chủ bị nghẽn, đang tự chuyển máy chủ dự phòng...')) {
                      return;
                    }
                  }
                  if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                    hls.startLoad();
                  } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                    hls.recoverMediaError();
                  }
                }
              });

              // Watchdog chống kẹt quay tròn kéo dài
              let lastTrackedTime = -1;
              let stallSeconds = 0;
              clearStallWatchdog();
              activeStallWatchdog = setInterval(() => {
                if (seq !== currentPlaySeq || !video || video.paused || video.ended) {
                  stallSeconds = 0;
                  return;
                }
                if (video.readyState < 3 && Math.abs(video.currentTime - lastTrackedTime) < 0.05) {
                  stallSeconds++;
                  // Sau 2s đứng hình: thử nhích nhẹ qua khe rỗng và kích tải lại
                  if (stallSeconds === 2) {
                    hls.startLoad();
                    if (video.buffered && video.buffered.length > 0) {
                      for (let i = 0; i < video.buffered.length; i++) {
                        if (video.buffered.start(i) > video.currentTime && video.buffered.start(i) - video.currentTime < 1.5) {
                          video.currentTime = video.buffered.start(i) + 0.05;
                          break;
                        }
                      }
                    } else if (video.currentTime > 0) {
                      video.currentTime += 0.1;
                    }
                  }
                  // Sau 7s vẫn quay tròn không thoát: tự động chuyển sang server dự phòng (nếu có)
                  if (stallSeconds >= 7) {
                    stallSeconds = 0;
                    if (!tryFallbackToNextServer('⚠️ Luồng phát đang chậm, tự động đổi máy chủ dự phòng...')) {
                      artInst.notice.show = '⚠️ Mạng tới máy chủ phim đang chậm, bạn thử tải lại hoặc đổi tập/máy chủ khác!';
                      hls.startLoad();
                    }
                  }
                } else {
                  stallSeconds = 0;
                }
                lastTrackedTime = video.currentTime;
              }, 1000);
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
              video.src = m3u8Url;
            }
          }
        },
        subtitle: defaultSub ? {
          url: defaultSub.url,
          type: 'vtt',
          style: {
            color: '#ffffff',
            fontSize: '20px',
            fontWeight: '600',
            background: 'rgba(0, 0, 0, 0.78)',
            padding: '4px 14px',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            lineHeight: '1.4',
            textShadow: '0 2px 4px rgba(0,0,0,0.95)',
            bottom: '36px'
          }
        } : undefined,
        settings: subTracks.length > 0 ? [
          {
            html: 'Phụ đề',
            width: 220,
            tooltip: defaultSub ? defaultSub.label : 'Tắt',
            selector: [
              { default: !defaultSub, html: 'Tắt phụ đề', url: '' },
              ...subTracks.map(st => ({
                default: defaultSub && defaultSub.code === st.code,
                html: st.label,
                url: st.url
              }))
            ],
            onSelect: function(item) {
              if (item.url) {
                art.subtitle.show = true;
                art.subtitle.switch(item.url, { name: item.html });
              } else {
                art.subtitle.show = false;
              }
              updateSubButtons(item.url);
              return item.html;
            }
          }
        ] : []
      });

      currentArtInstance = art;

      // Xử lý Resume Playback
      art.on('ready', () => {
        if (initialSeekTime > 10) {
          art.currentTime = initialSeekTime;
          showResumeToast(initialSeekTime);
        }
      });

      // Lưu lịch sử xem định kỳ mỗi 5s
      art.on('video:timeupdate', () => {
        const now = Date.now();
        if (now - lastHistorySaveTime >= 5000) {
          lastHistorySaveTime = now;
          if (currentMovieContext) {
            saveWatchHistory({
              slug: currentMovieContext.slug,
              name: currentMovieContext.name,
              poster: currentMovieContext.poster,
              epIndex: currentMovieContext.currentEpIdx,
              epName: currentMovieContext.currentEpName,
              time: art.currentTime,
              duration: art.duration
            });
          }
        }
      });

      art.on('video:pause', () => {
        if (currentMovieContext) {
          saveWatchHistory({
            slug: currentMovieContext.slug,
            name: currentMovieContext.name,
            poster: currentMovieContext.poster,
            epIndex: currentMovieContext.currentEpIdx,
            epName: currentMovieContext.currentEpName,
            time: art.currentTime,
            duration: art.duration
          });
        }
      });

      // Tự chuyển tập khi hết video
      art.on('video:ended', () => {
        if (currentMovieContext && currentMovieContext.episodes) {
          const nextIdx = currentMovieContext.currentEpIdx + 1;
          if (nextIdx < currentMovieContext.episodes.length) {
            const nextEp = currentMovieContext.episodes[nextIdx];
            showAutoNextCountdown(nextEp, nextIdx);
          } else {
            art.notice.show = '🎉 Bạn đã xem hết các tập hiện có!';
          }
        }
      });

      // Render thanh chuyển phụ đề trực tiếp dưới Player
      if (subTracks.length > 0) {
        renderSubtitleButtons(box, subTracks, defaultSub);
      }

    } catch (err) {
      console.error('Artplayer init error:', err);
      // Fallback native video nếu cần
      box.innerHTML = `<video id="fallback-video" controls autoplay playsinline src="${finalUrl}" style="width:100%;height:100%;"></video>`;
    }
  } else {
    // Iframe (Nguồn ngoài)
    box.innerHTML = `<iframe src="${url}" style="position:absolute;inset:0;width:100%;height:100%;border:none;" allowfullscreen allow="autoplay; fullscreen; encrypted-media; picture-in-picture"></iframe>`;
  }
};

function showResumeToast(time) {
  const box = document.querySelector('.player__box');
  if (!box) return;
  const old = document.getElementById('resumeToast');
  if (old) old.remove();

  const toast = document.createElement('div');
  toast.id = 'resumeToast';
  toast.style.cssText = 'position:absolute;bottom:75px;left:20px;z-index:99;background:rgba(19,23,34,0.92);border:1px solid rgba(0,240,255,0.4);border-radius:8px;padding:8px 14px;color:#fff;font-size:13px;display:flex;align-items:center;gap:10px;box-shadow:0 8px 24px rgba(0,0,0,0.6);backdrop-filter:blur(8px);';
  toast.innerHTML = `
    <span>⏯️ Đang tiếp tục xem từ <b>${formatTime(time)}</b></span>
    <button type="button" onclick="if(currentArtInstance)currentArtInstance.currentTime=0;this.parentElement.remove();" style="background:#00f0ff;color:#000;border:none;border-radius:4px;padding:3px 8px;font-size:12px;font-weight:700;cursor:pointer;">Xem từ đầu</button>
    <button type="button" onclick="this.parentElement.remove();" style="background:transparent;color:#8b94a7;border:none;font-size:14px;cursor:pointer;padding:0 2px;">✕</button>
  `;
  box.appendChild(toast);
  setTimeout(() => { if (toast.parentElement) toast.remove(); }, 8000);
}

function renderSubtitleButtons(box, subTracks, activeSub) {
  const container = box.parentElement;
  if (!container) return;

  const bar = document.createElement('div');
  bar.id = 'subSwitcherBar';
  bar.style.cssText = 'margin-top:12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;background:rgba(255,255,255,0.03);padding:8px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);';

  let btns = `<span style="color:#8b94a7;font-size:13px;font-weight:600;">💬 Phụ đề:</span>`;

  btns += `<button type="button" class="sub-btn" data-url="" onclick="switchSubManual('', this)" style="padding:5px 12px;border-radius:6px;font-size:12px;cursor:pointer;font-weight:600;border:1px solid rgba(255,255,255,0.1);${!activeSub ? 'background:#00f0ff;color:#000;' : 'background:rgba(255,255,255,0.08);color:#fff;'}">Tắt</button>`;

  subTracks.forEach(st => {
    const isAct = activeSub && activeSub.code === st.code;
    const flag = st.code === 'vie' ? '🇻🇳 ' : (st.code === 'zho' ? '🇨🇳 ' : (st.code === 'eng' ? '🇬🇧 ' : '🌐 '));
    btns += `<button type="button" class="sub-btn" data-url="${st.url}" onclick="switchSubManual('${st.url}', this)" style="padding:5px 12px;border-radius:6px;font-size:12px;cursor:pointer;font-weight:600;border:1px solid rgba(255,255,255,0.1);${isAct ? 'background:#00f0ff;color:#000;' : 'background:rgba(255,255,255,0.08);color:#fff;'}">${flag}${st.label}</button>`;
  });

  bar.innerHTML = btns;
  box.after(bar);
}

window.switchSubManual = function(url, btn) {
  if (!currentArtInstance) return;
  if (url) {
    currentArtInstance.subtitle.show = true;
    currentArtInstance.subtitle.switch(url);
  } else {
    currentArtInstance.subtitle.show = false;
  }
  updateSubButtons(url);
};

function updateSubButtons(activeUrl) {
  document.querySelectorAll('.sub-btn').forEach(b => {
    const u = b.getAttribute('data-url');
    if (u === activeUrl) {
      b.style.background = '#00f0ff';
      b.style.color = '#000';
    } else {
      b.style.background = 'rgba(255,255,255,0.08)';
      b.style.color = '#fff';
    }
  });
}

// ==========================================
// 5. Điều hướng Tập & Server
// ==========================================
window.switchEpisode = function(epIdx) {
  if (!currentMovieContext || !currentMovieContext.episodes || !currentMovieContext.episodes[epIdx]) return;
  currentMovieContext.currentEpIdx = epIdx;
  const ep = currentMovieContext.episodes[epIdx];
  currentMovieContext.currentEpName = ep.name || ('Tập ' + (epIdx + 1));
  const url = ep.link_m3u8 || ep.link_embed || '';

  playStream(url, 0);

  document.querySelectorAll('.ep-list button').forEach((b, idx) => {
    if (idx === epIdx) {
      b.style.background = '#00f0ff';
      b.style.color = '#000';
    } else {
      b.style.background = 'rgba(255,255,255,0.08)';
      b.style.color = '#fff';
    }
  });
};

window.switchServer = function(serverIdx, btn, targetEpIdx = 0, resumeTime = 0) {
  if (!currentMovieContext || !currentMovieContext.servers || !currentMovieContext.servers[serverIdx]) return;
  currentMovieContext.currentServerIdx = serverIdx;
  const server = currentMovieContext.servers[serverIdx];
  currentMovieContext.episodes = server.server_data || [];
  const safeEpIdx = (targetEpIdx >= 0 && targetEpIdx < currentMovieContext.episodes.length) ? targetEpIdx : 0;
  currentMovieContext.currentEpIdx = safeEpIdx;

  // Re-render episode list
  const epContainer = document.getElementById('episodeSection');
  if (epContainer && currentMovieContext.episodes.length > 1) {
    epContainer.innerHTML = renderEpisodeButtonsHtml(currentMovieContext.episodes, safeEpIdx);
  } else if (epContainer) {
    epContainer.innerHTML = '';
  }

  const targetEp = currentMovieContext.episodes[safeEpIdx] || {};
  currentMovieContext.currentEpName = targetEp.name || ('Tập ' + (safeEpIdx + 1));
  const sUrl = targetEp.link_m3u8 || targetEp.link_embed || '';
  playStream(sUrl, resumeTime);

  document.querySelectorAll('.server-list button').forEach(b => {
    b.style.background = 'rgba(255,255,255,0.08)';
    b.style.color = '#fff';
  });
  if (btn) {
    btn.style.background = '#00f0ff';
    btn.style.color = '#000';
  }
};

window.playIntlSource = function(embedUrl, btn) {
  clearAutoNext();
  playStream(embedUrl, 0);
  document.querySelectorAll('.server-list button').forEach(b => {
    b.style.background = 'rgba(255,255,255,0.08)';
    b.style.color = '#fff';
  });
  if (btn) {
    btn.style.background = '#00f0ff';
    btn.style.color = '#000';
  }
};

function renderEpisodeButtonsHtml(episodes, activeIdx) {
  return '<div style="margin-top:20px;">' +
    '<h3 style="color:#fff;font-size:16px;margin-bottom:10px;">Danh Sách Tập (' + episodes.length + ' tập):</h3>' +
    '<div class="ep-list" style="display:flex;gap:8px;flex-wrap:wrap;max-height:240px;overflow-y:auto;padding-right:5px;">' +
    episodes.map((ep, i) => {
      const bg = i === activeIdx ? '#00f0ff' : 'rgba(255,255,255,0.08)';
      const col = i === activeIdx ? '#000' : '#fff';
      return '<button type="button" style="padding:8px 14px;background:' + bg + ';color:' + col + ';border:1px solid rgba(255,255,255,0.1);border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;" onclick="switchEpisode(' + i + ')">' + (ep.name || ('Tập ' + (i + 1))) + '</button>';
    }).join('') +
    '</div></div>';
}

// ==========================================
// 6. Smart Filter cho Nguồn Quốc Tế
// ==========================================
function shouldShowIntlSource(movie) {
  if (!movie) return false;
  const tmdbId = movie.tmdb_id || (movie.tmdb && movie.tmdb.id);
  if (!tmdbId) return false;

  const rawCountry = (movie.country || (movie.countries && movie.countries.map(c => c.name).join(' ')) || '').toLowerCase();
  const rawCat = (movie.category || (movie.categories && movie.categories.map(c => c.name).join(' ')) || '').toLowerCase();
  const rawName = ((movie.name || '') + ' ' + (movie.origin_name || '') + ' ' + (movie.slug || '')).toLowerCase();

  // Loại trừ triệt để phim Châu Á / Donghua / Cổ trang
  const asianKeywords = ['trung quốc', 'china', 'hàn quốc', 'korea', 'nhật bản', 'japan', 'thái lan', 'thailand', 'đài loan', 'hong kong', 'việt nam', 'ấn độ', 'india'];
  for (const k of asianKeywords) {
    if (rawCountry.includes(k)) return false;
  }

  const asianGenres = ['hoạt hình', 'anime', 'cổ trang', 'tiên hiệp', 'kiếm hiệp', 'đam mỹ', 'huyền huyễn', 'xuyên không'];
  for (const g of asianGenres) {
    if (rawCat.includes(g)) return false;
  }

  const asianSlugs = ['tien-nghich', 'kiem-lai', 'dau-pha', 'dau-la', 'the-gioi-hoan-my', 'than-lan-chi-vuc', 'thon-phe-tinh-khong'];
  for (const as of asianSlugs) {
    if (rawName.includes(as)) return false;
  }

  // Chỉ cho phép nếu rõ ràng thuộc Âu Mỹ / Hollywood
  const westernKeywords = ['âu mỹ', 'mỹ', 'united states', 'usa', 'anh', 'united kingdom', 'uk', 'pháp', 'france', 'đức', 'germany', 'canada', 'úc', 'australia', 'tây ban nha', 'spain', 'ý', 'italy'];
  for (const w of westernKeywords) {
    if (rawCountry.includes(w)) return true;
  }

  // Nếu không có thông tin quốc gia rõ ràng, an toàn nhất là ẩn để tránh 404 MEDIA NOT FOUND
  return false;
}

// ==========================================
// 7. Phím Tắt Tiện Ích (Desktop Hotkeys)
// ==========================================
function setupGlobalHotkeys() {
  window.addEventListener('keydown', (e) => {
    // Không bắt phím khi đang nhập form
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

    if (!currentArtInstance) return;

    switch (e.key) {
      case ' ':
      case 'k':
      case 'K':
        e.preventDefault();
        currentArtInstance.toggle();
        break;
      case 'ArrowRight':
      case 'l':
      case 'L':
        e.preventDefault();
        currentArtInstance.currentTime = Math.min(currentArtInstance.duration, currentArtInstance.currentTime + 10);
        currentArtInstance.notice.show = `⏩ +10s (${formatTime(currentArtInstance.currentTime)})`;
        break;
      case 'ArrowLeft':
      case 'j':
      case 'J':
        e.preventDefault();
        currentArtInstance.currentTime = Math.max(0, currentArtInstance.currentTime - 10);
        currentArtInstance.notice.show = `⏪ -10s (${formatTime(currentArtInstance.currentTime)})`;
        break;
      case 'ArrowUp':
        e.preventDefault();
        currentArtInstance.volume = Math.min(1, currentArtInstance.volume + 0.1);
        currentArtInstance.notice.show = `🔊 Âm lượng: ${Math.round(currentArtInstance.volume * 100)}%`;
        break;
      case 'ArrowDown':
        e.preventDefault();
        currentArtInstance.volume = Math.max(0, currentArtInstance.volume - 0.1);
        currentArtInstance.notice.show = `🔉 Âm lượng: ${Math.round(currentArtInstance.volume * 100)}%`;
        break;
      case 'f':
      case 'F':
        e.preventDefault();
        currentArtInstance.fullscreen = !currentArtInstance.fullscreen;
        break;
      case 'm':
      case 'M':
        e.preventDefault();
        currentArtInstance.muted = !currentArtInstance.muted;
        currentArtInstance.notice.show = currentArtInstance.muted ? '🔇 Đã tắt tiếng' : '🔊 Đã bật tiếng';
        break;
      case 'n':
      case 'N':
        if (currentMovieContext && currentMovieContext.episodes) {
          const nextIdx = currentMovieContext.currentEpIdx + 1;
          if (nextIdx < currentMovieContext.episodes.length) {
            e.preventDefault();
            switchEpisode(nextIdx);
          }
        }
        break;
      case 'p':
      case 'P':
        if (currentMovieContext && currentMovieContext.episodes) {
          const prevIdx = currentMovieContext.currentEpIdx - 1;
          if (prevIdx >= 0) {
            e.preventDefault();
            switchEpisode(prevIdx);
          }
        }
        break;
      case 'c':
      case 'C':
        e.preventDefault();
        currentArtInstance.subtitle.show = !currentArtInstance.subtitle.show;
        currentArtInstance.notice.show = currentArtInstance.subtitle.show ? '💬 Phụ đề: Bật' : '💬 Phụ đề: Tắt';
        break;
    }
  });
}

// Proxy nén ảnh siêu nhẹ (WebP ~25KB) để load poster tức thì
function fastPoster(url) {
  if (!url || url.startsWith('/')) return '/brand/poster-placeholder.svg';
  return 'https://wsrv.nl/?url=' + encodeURIComponent(url) + '&w=300&q=75&output=webp';
}

let allMovies = null;
let currentPage = 1;
const PAGE_SIZE = 36;
let currentFilterType = 'all'; // 'all', 'movie', 'tv', 'anime', 'theater'
let currentFilterYear = 'all';

async function getCatalog() {
  if (allMovies) return allMovies;
  try {
    const res = await fetch('/data/search_index.json');
    if (res.ok) {
      allMovies = await res.json();
      allMovies.sort((a, b) => (b.y || 0) - (a.y || 0));
      return allMovies;
    }
  } catch (e) {}
  return [];
}

// ==========================================
// 8. Khởi tạo App & Thanh Điều Hướng Drop
// ==========================================
async function initApp() {
  initLiquidHeader();
  setupGlobalHotkeys();
  handleRoute();
}

function initLiquidHeader() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('mouseenter', () => moveDropletToTab(tab));
  });
  const bar = document.getElementById('ios27TabBar');
  if (bar) {
    bar.addEventListener('mouseleave', () => syncTabDropletByPath(window.location.pathname));
  }
}

function moveDropletToTab(tab, instant = false) {
  const droplet = document.getElementById('tabWaterDroplet');
  if (!droplet || !tab) return;
  const rect = tab.getBoundingClientRect();
  const barRect = tab.parentElement.getBoundingClientRect();
  const left = rect.left - barRect.left;
  const width = rect.width;
  if (instant) {
    droplet.style.transition = 'none';
    droplet.style.transform = `translateX(${left}px)`;
    droplet.style.width = `${width}px`;
    droplet.style.opacity = '1';
    droplet.offsetHeight;
    droplet.style.transition = '';
  } else {
    droplet.style.transform = `translateX(${left}px)`;
    droplet.style.width = `${width}px`;
    droplet.style.opacity = '1';
  }
}

function syncTabDropletByPath(path) {
  const tabs = document.querySelectorAll('.tab-btn');
  let matched = null;
  tabs.forEach(t => {
    t.classList.remove('active');
    const href = t.getAttribute('href');
    if (href === '/' && path === '/') matched = t;
    else if (href !== '/' && path.startsWith(href)) matched = t;
  });
  if (matched) {
    matched.classList.add('active');
    moveDropletToTab(matched, true);
  } else {
    const droplet = document.getElementById('tabWaterDroplet');
    if (droplet) droplet.style.opacity = '0';
  }
}

window.syncTabDropletByPath = syncTabDropletByPath;

// ==========================================
// 9. Routing & Điều Hướng
// ==========================================
function handleRoute() {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  currentPage = parseInt(params.get('page') || '1', 10) || 1;
  currentFilterYear = params.get('year') || 'all';

  if (window.syncTabDropletByPath) window.syncTabDropletByPath(path);

  if (path.startsWith('/xem-phim/') || path.startsWith('/phim/')) {
    const slug = path.replace(/^\/(xem-phim|phim)\//, '').replace(/\/$/, '');
    renderWatchPage(slug);
  } else if (path.startsWith('/yeu-thich')) {
    renderFavoritesPage();
  } else if (path.startsWith('/tim-kiem')) {
    renderSearchResults(params.get('q') || '');
  } else if (path.startsWith('/danh-sach/phim-bo') || path.startsWith('/phim-bo')) {
    currentFilterType = 'tv';
    renderCatalogPage('📺 Phim Bộ Chọn Lọc');
  } else if (path.startsWith('/danh-sach/phim-le') || path.startsWith('/phim-le')) {
    currentFilterType = 'movie';
    renderCatalogPage('🎬 Phim Lẻ Chọn Lọc');
  } else if (path.startsWith('/danh-sach/hoat-hinh') || path.startsWith('/anime')) {
    currentFilterType = 'anime';
    renderCatalogPage('🌸 Anime & Hoạt Hình');
  } else if (path.startsWith('/danh-sach/phim-chieu-rap') || path.startsWith('/chieu-rap')) {
    currentFilterType = 'theater';
    renderCatalogPage('🍿 Phim Chiếu Rạp Mới');
  } else {
    currentFilterType = 'all';
    renderCatalogPage('🔥 Kho Phim Sạch 100% (7,071 Phim)');
  }
}

function setupEvents() {
  const searchForm = document.getElementById('searchForm');
  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = document.getElementById('searchInput').value.trim();
      if (q) navigate('/tim-kiem?q=' + encodeURIComponent(q));
    });
  }

  document.body.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;
    const href = link.getAttribute('href');
    if (href && (href.startsWith('/') || href.startsWith(window.location.origin))) {
      const url = new URL(link.href);
      if (url.origin === window.location.origin) {
        if (url.pathname === '/blog' || url.pathname.startsWith('/blog/')) {
          return;
        }
        e.preventDefault();
        navigate(url.pathname + url.search);
      }
    }
  });

  window.addEventListener('popstate', () => {
    handleRoute();
  });
}

function navigate(url) {
  window.history.pushState({}, '', url);
  handleRoute();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.goToPage = function(p) {
  currentPage = p;
  const url = new URL(window.location);
  url.searchParams.set('page', p);
  navigate(url.pathname + url.search);
};

window.applyYearFilter = function(y) {
  currentFilterYear = y;
  currentPage = 1;
  const url = new URL(window.location);
  if (y === 'all') url.searchParams.delete('year');
  else url.searchParams.set('year', y);
  url.searchParams.set('page', 1);
  navigate(url.pathname + url.search);
};

// ==========================================
// 10. Trang Xem Phim (Watch Page)
// ==========================================
async function renderWatchPage(slug) {
  const app = document.getElementById('app') || document.querySelector('main') || document.body;
  app.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:450px;color:#00f0ff;font-size:18px;font-family:sans-serif;">⚡ Đang kết nối máy chủ phát sạch...</div>';

  const h = Array.from(slug).reduce((acc, c) => acc + c.charCodeAt(0), 0) % 100;
  let movie = null;
  try {
    const res = await fetch('/data/b/' + h + '.json');
    if (res.ok) {
      const bucket = await res.json();
      movie = bucket[slug];
    }
  } catch (e) {}

  if (!movie || !movie.episodes || !movie.episodes.length) {
    app.innerHTML = '<div style="max-width:600px;margin:80px auto;text-align:center;color:#ef4444;font-family:sans-serif;">' +
      '<h2 style="font-size:24px;margin-bottom:12px;">Phim này đã bị xóa do toàn bộ nguồn phát đều lỗi</h2>' +
      '<p style="color:#8b94a7;margin-top:10px;line-height:1.6;">Chúng tôi đã loại bỏ phim này để tránh lỗi vòng xoay vô tận.</p>' +
      '<a href="/" style="display:inline-block;margin-top:24px;padding:12px 28px;background:#00f0ff;color:#000;text-decoration:none;font-weight:700;border-radius:8px;">Về Trang Chủ</a>' +
    '</div>';
    return;
  }

  document.title = 'Xem ' + movie.name + ' - h0syh0aπg Cinema';

  // Lấy lịch sử xem trước đó để resume
  const hist = getWatchHistory().find(x => x.slug === slug);
  let resumeEpIdx = 0;
  let resumeSeekTime = 0;
  if (hist && hist.time > 10) {
    resumeEpIdx = hist.epIndex || 0;
    resumeSeekTime = hist.time;
  }

  const servers = movie.episodes || [];
  const activeServer = servers[0] || { server_data: [] };
  const episodes = activeServer.server_data || [];
  if (resumeEpIdx >= episodes.length) resumeEpIdx = 0;
  const initialEp = episodes[resumeEpIdx] || episodes[0] || {};
  const streamUrl = initialEp.link_m3u8 || initialEp.link_embed || '';

  // Lưu context phim hiện tại
  currentMovieContext = {
    slug: slug,
    name: movie.name,
    poster: movie.thumb_url || movie.poster_url || '',
    year: movie.year || 2024,
    type: movie.type || 'movie',
    servers: servers,
    currentServerIdx: 0,
    episodes: episodes,
    currentEpIdx: resumeEpIdx,
    currentEpName: initialEp.name || ('Tập ' + (resumeEpIdx + 1))
  };

  // Nguồn dự phòng Quốc tế qua TMDB ID (chỉ hiện khi thoả mãn Smart Filter)
  const showIntl = shouldShowIntlSource(movie);
  const tmdbId = movie.tmdb_id || (movie.tmdb && movie.tmdb.id);
  const isSeries = movie.type === 'series' || movie.type === 'tv';
  const intlEmbed = (showIntl && tmdbId) ? (isSeries ? ('https://vidlink.pro/tv/' + tmdbId + '/1/1') : ('https://vidlink.pro/movie/' + tmdbId)) : null;

  let serverBtns = '';
  for (let idx = 0; idx < servers.length; idx++) {
    const s = servers[idx];
    const bg = idx === 0 ? '#00f0ff' : 'rgba(255,255,255,0.08)';
    const col = idx === 0 ? '#000' : '#fff';
    serverBtns += `<button type="button" style="padding:10px 18px;background:${bg};color:${col};border:1px solid rgba(255,255,255,0.1);border-radius:8px;cursor:pointer;font-weight:600;font-size:13px;transition:0.2s;" onclick="switchServer(${idx}, this)">▶ ${s.server_name.replace(/[\r\n\t]+/g, ' ').trim()}</button> `;
  }

  if (intlEmbed) {
    serverBtns += `<button type="button" style="padding:10px 18px;background:rgba(255,255,255,0.08);color:#fff;border:1px solid rgba(255,255,255,0.1);border-radius:8px;cursor:pointer;font-weight:600;font-size:13px;transition:0.2s;" onclick="playIntlSource('${intlEmbed}', this)">🌐 Nguồn Quốc Tế (TMDB)</button> `;
  }

  let epHtml = '';
  if (episodes.length > 1) {
    epHtml = `<div id="episodeSection">${renderEpisodeButtonsHtml(episodes, resumeEpIdx)}</div>`;
  } else {
    epHtml = `<div id="episodeSection"></div>`;
  }

  const isFav = isMovieFavorited(slug);
  const safeName = (movie.name || '').replace(/'/g, "\\'");
  const safePoster = (movie.thumb_url || movie.poster_url || '').replace(/'/g, "\\'");

  app.innerHTML = `
    <div style="max-width:1200px;margin:20px auto;padding:0 15px;font-family:sans-serif;">
      <div style="margin-bottom:15px;">
        <a href="/" style="color:#8b94a7;text-decoration:none;">Trang chủ</a> / <span style="color:#fff;">${movie.name}</span>
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin:10px 0 6px 0;">
          <h1 style="color:#fff;font-size:24px;margin:0;">${movie.name} <small style="color:#8b94a7;font-size:16px;">(${movie.year || '2024'})</small></h1>
          <button id="favBtn" type="button" onclick="toggleFavMovie('${slug}', '${safeName}', '${safePoster}', '${movie.year || 2024}', '${movie.type || 'movie'}')" style="padding:7px 14px;background:${isFav ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)'};color:${isFav ? '#ef4444' : '#fff'};border:1px solid ${isFav ? '#ef4444' : 'rgba(255,255,255,0.15)'};border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:6px;transition:0.2s;">
            ${isFav ? '💖 Đã Lưu' : '❤️ Lưu Phim'}
          </button>
        </div>
        <div style="display:flex;gap:8px;">
          <span style="background:#00f0ff;color:#000;font-weight:700;font-size:12px;padding:3px 8px;border-radius:4px;">FHD</span>
          <span style="background:rgba(255,255,255,0.1);color:#fff;font-size:12px;padding:3px 8px;border-radius:4px;">VIETSUB SẠCH 100%</span>
        </div>
      </div>
      <div class="player__box" style="position:relative;width:100%;aspect-ratio:16/9;background:#000;border-radius:12px;overflow:hidden;box-shadow:0 15px 40px rgba(0,0,0,0.9);">
      </div>
      <div style="margin-top:20px;">
        <h3 style="color:#fff;font-size:16px;margin-bottom:10px;">Chọn Máy Chủ Phát:</h3>
        <div class="server-list" style="display:flex;gap:10px;flex-wrap:wrap;">${serverBtns}</div>
      </div>
      ${epHtml}
    </div>
  `;

  playStream(streamUrl, resumeSeekTime);
}

// ==========================================
// 11. Trang Phim Đã Lưu (Favorites Page)
// ==========================================
function renderFavoritesPage() {
  const container = document.getElementById('app') || document.querySelector('main') || document.body;
  if (!container) return;

  document.title = 'Phim Yêu Thích - h0syh0aπg Cinema';
  const favs = getFavorites();

  let contentHtml = '';
  if (favs.length === 0) {
    contentHtml = `
      <div style="text-align:center;padding:80px 20px;color:#8b94a7;">
        <div style="font-size:52px;margin-bottom:16px;">💔</div>
        <h3 style="color:#fff;font-size:20px;margin-bottom:8px;">Bạn chưa lưu phim nào</h3>
        <p style="font-size:14px;max-width:440px;margin:0 auto 24px auto;line-height:1.6;">Khi xem phim, hãy bấm nút <b>"❤️ Lưu Phim"</b> để đưa phim vào danh sách xem sau tiện lợi!</p>
        <a href="/" style="display:inline-block;padding:11px 24px;background:#00f0ff;color:#000;text-decoration:none;font-weight:700;border-radius:8px;">Khám Phá Phim Ngay</a>
      </div>
    `;
  } else {
    contentHtml = `
      <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(180px, 1fr));gap:20px;">
        ${favs.map(m => {
          const thumb = fastPoster(m.poster);
          const typeBadge = (m.type === 'tv' || m.type === 'series') ? 'Phim Bộ' : 'Phim Lẻ';
          return `
            <div style="position:relative;background:#131722;border-radius:10px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 4px 15px rgba(0,0,0,0.5);">
              <a href="/xem-phim/${m.slug}" style="text-decoration:none;display:flex;flex-direction:column;">
                <div style="position:relative;width:100%;padding-top:140%;background:#0b0e14;">
                  <img src="${thumb}" alt="${m.name}" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;" loading="lazy" decoding="async">
                  <span style="position:absolute;top:8px;left:8px;background:rgba(0,0,0,0.75);color:#00f0ff;font-size:10px;font-weight:700;padding:3px 7px;border-radius:4px;border:1px solid rgba(0,240,255,0.3);">${typeBadge}</span>
                </div>
                <div style="padding:10px;">
                  <div style="color:#fff;font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.name}</div>
                  <div style="color:#8b94a7;font-size:12px;margin-top:4px;">${m.year || '2024'} • Vietsub</div>
                </div>
              </a>
              <button type="button" onclick="toggleFavMovie('${m.slug}'); renderFavoritesPage();" title="Bỏ lưu phim" style="position:absolute;top:8px;right:8px;width:28px;height:28px;background:rgba(0,0,0,0.75);border:1px solid rgba(255,255,255,0.2);border-radius:50%;color:#ef4444;font-size:14px;display:flex;align-items:center;justify-content:center;cursor:pointer;">✕</button>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  container.innerHTML = `
    <div style="max-width:1200px;margin:20px auto;padding:0 15px;font-family:sans-serif;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:22px;">
        <h2 style="color:#fff;font-size:22px;margin:0;display:flex;align-items:center;gap:10px;">
          <span>💖 Phim Yêu Thích</span>
          <span style="font-size:13px;color:#8b94a7;font-weight:normal;">(${favs.length} phim)</span>
        </h2>
      </div>
      ${contentHtml}
    </div>
  `;
}

// ==========================================
// 12. Kệ Tiếp Tục Xem Trên Trang Chủ
// ==========================================
function renderResumeShelfHtml() {
  const hist = getWatchHistory();
  if (!hist || !hist.length) return '';

  return `
    <div class="resume-shelf" style="margin-bottom:30px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:16px 18px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <h3 style="color:#00f0ff;font-size:16px;font-weight:700;margin:0;display:flex;align-items:center;gap:8px;">
          <span>⏯️</span> Tiếp Tục Xem
          <span style="font-size:12px;color:#8b94a7;font-weight:normal;">(${hist.length})</span>
        </h3>
        <button type="button" onclick="clearAllHistory()" style="background:transparent;border:none;color:#8b94a7;font-size:12px;cursor:pointer;">Xoá lịch sử</button>
      </div>
      <div style="display:flex;gap:14px;overflow-x:auto;padding-bottom:8px;scrollbar-width:thin;">
        ${hist.map(item => {
          const thumb = fastPoster(item.poster);
          return `
            <div style="position:relative;flex:0 0 150px;background:#131722;border-radius:8px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.4);">
              <a href="/xem-phim/${item.slug}" style="text-decoration:none;display:flex;flex-direction:column;">
                <div style="position:relative;width:100%;height:95px;background:#0b0e14;">
                  <img src="${thumb}" alt="${item.name}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" loading="lazy">
                  <div style="position:absolute;bottom:0;left:0;right:0;height:4px;background:rgba(255,255,255,0.2);">
                    <div style="width:${item.percent}%;height:100%;background:#00f0ff;"></div>
                  </div>
                </div>
                <div style="padding:8px;">
                  <div style="color:#fff;font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.name}</div>
                  <div style="display:flex;justify-content:space-between;color:#8b94a7;font-size:11px;margin-top:3px;">
                    <span>${item.epName || 'Tập 1'}</span>
                    <span style="color:#00f0ff;">${item.percent}%</span>
                  </div>
                </div>
              </a>
              <button type="button" onclick="removeWatchHistory('${item.slug}', event)" title="Xóa khỏi lịch sử" style="position:absolute;top:4px;right:4px;width:22px;height:22px;background:rgba(0,0,0,0.75);border:none;border-radius:50%;color:#fff;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// ==========================================
// 13. Tìm Kiếm Nhanh & Render Catalog
// ==========================================
async function renderSearchResults(q) {
  const container = document.getElementById('app') || document.querySelector('main') || document.body;
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;padding:80px;color:#00f0ff;font-family:sans-serif;">Đang tìm kiếm trong kho 7,071 phim sạch...</div>';

  const catalog = await getCatalog();
  const kw = q.toLowerCase().trim();
  const hits = catalog.filter(m => {
    const n = ((m.n || '') + ' ' + (m.o || '')).toLowerCase();
    return n.includes(kw);
  });

  renderGrid(container, '🔍 Kết quả cho: "' + q + '" (' + hits.length + ' phim)', hits, false);
}

async function renderCatalogPage(title) {
  const container = document.getElementById('app') || document.querySelector('main') || document.body;
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;padding:80px;color:#00f0ff;font-family:sans-serif;">⚡ Đang tải danh sách phim sạch...</div>';

  const catalog = await getCatalog();
  let filtered = catalog;

  if (currentFilterType === 'tv') {
    filtered = filtered.filter(m => m.t === 'tv' || m.t === 'series');
  } else if (currentFilterType === 'movie') {
    filtered = filtered.filter(m => m.t === 'movie');
  } else if (currentFilterType === 'anime') {
    filtered = filtered.filter(m => {
      const n = ((m.n || '') + ' ' + (m.o || '')).toLowerCase();
      return n.includes('conan') || n.includes('doraemon') || n.includes('anime') || n.includes('one piece') || n.includes('naruto') || n.includes('hoạt hình') || n.includes('thám tử') || n.includes('đấu phá');
    });
  } else if (currentFilterType === 'theater') {
    filtered = filtered.filter(m => m.t === 'movie' && (m.y >= 2024));
  }

  if (currentFilterYear !== 'all') {
    const yNum = parseInt(currentFilterYear, 10);
    if (yNum === 2019) {
      filtered = filtered.filter(m => (m.y || 0) <= 2019);
    } else {
      filtered = filtered.filter(m => m.y === yNum);
    }
  }

  renderGrid(container, title, filtered, true);
}

function renderGrid(container, title, fullList, showYearFilter) {
  document.title = title + ' - h0syh0aπg Cinema';

  const totalItems = fullList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = fullList.slice(start, start + PAGE_SIZE);

  // Kệ Tiếp Tục Xem chỉ hiện ở trang chủ khám phá (Trang 1)
  const isHomePage = (currentFilterType === 'all' && currentPage === 1);
  const resumeShelfHtml = isHomePage ? renderResumeShelfHtml() : '';

  let yearSelectHtml = '';
  if (showYearFilter) {
    const years = [
      { v: 'all', l: 'Tất cả năm' },
      { v: '2026', l: '2026' },
      { v: '2025', l: '2025' },
      { v: '2024', l: '2024' },
      { v: '2023', l: '2023' },
      { v: '2022', l: '2022' },
      { v: '2021', l: '2021' },
      { v: '2020', l: '2020' },
      { v: '2019', l: 'Trước 2020' }
    ];
    yearSelectHtml = '<div style="display:flex;align-items:center;gap:8px;">' +
      '<span style="color:#8b94a7;font-size:13px;">Năm:</span>' +
      '<select onchange="applyYearFilter(this.value)" style="background:#131722;color:#fff;border:1px solid rgba(255,255,255,0.15);padding:6px 12px;border-radius:8px;font-size:13px;outline:none;cursor:pointer;">' +
        years.map(y => '<option value="' + y.v + '"' + (currentFilterYear === y.v ? ' selected' : '') + '>' + y.l + '</option>').join('') +
      '</select>' +
    '</div>';
  }

  // Thanh phân trang
  let paginationHtml = '';
  if (totalPages > 1) {
    let btns = [];
    if (currentPage > 1) {
      btns.push('<button onclick="goToPage(' + (currentPage - 1) + ')" style="padding:8px 14px;background:rgba(255,255,255,0.08);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;">« Trước</button>');
    }

    let startP = Math.max(1, currentPage - 2);
    let endP = Math.min(totalPages, currentPage + 2);
    if (startP > 1) {
      btns.push('<button onclick="goToPage(1)" style="padding:8px 14px;background:rgba(255,255,255,0.08);color:#fff;border:none;border-radius:8px;cursor:pointer;">1</button>');
      if (startP > 2) btns.push('<span style="color:#8b94a7;padding:8px 4px;">...</span>');
    }
    for (let p = startP; p <= endP; p++) {
      const act = p === currentPage;
      btns.push('<button onclick="goToPage(' + p + ')" style="padding:8px 14px;background:' + (act ? '#00f0ff' : 'rgba(255,255,255,0.08)') + ';color:' + (act ? '#000' : '#fff') + ';border:none;border-radius:8px;cursor:pointer;font-weight:700;">' + p + '</button>');
    }
    if (endP < totalPages) {
      if (endP < totalPages - 1) btns.push('<span style="color:#8b94a7;padding:8px 4px;">...</span>');
      btns.push('<button onclick="goToPage(' + totalPages + ')" style="padding:8px 14px;background:rgba(255,255,255,0.08);color:#fff;border:none;border-radius:8px;cursor:pointer;">' + totalPages + '</button>');
    }

    if (currentPage < totalPages) {
      btns.push('<button onclick="goToPage(' + (currentPage + 1) + ')" style="padding:8px 14px;background:rgba(255,255,255,0.08);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;">Sau »</button>');
    }

    paginationHtml = '<div style="display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:8px;margin-top:40px;margin-bottom:20px;">' + btns.join('') + '</div>';
  }

  container.innerHTML = '<div style="max-width:1200px;margin:20px auto;padding:0 15px;font-family:sans-serif;">' +
    resumeShelfHtml +
    '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:22px;">' +
      '<div style="display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;">' +
        '<h2 style="color:#fff;font-size:22px;margin:0;">' + title + '</h2>' +
        '<span style="color:#8b94a7;font-size:13px;">Trang ' + currentPage + ' / ' + totalPages + ' (' + totalItems + ' phim)</span>' +
      '</div>' +
      yearSelectHtml +
    '</div>' +
    (pageItems.length ? (
      '<div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(180px, 1fr));gap:20px;">' +
        pageItems.map(m => {
          const slug = m.slug || m.s;
          const name = m.name || m.n;
          const rawThumb = m.thumb_url || m.poster_url || m.p || '';
          const thumb = fastPoster(rawThumb);
          const year = m.year || m.y || 'FHD';
          const typeBadge = (m.t === 'tv' || m.t === 'series') ? 'Phim Bộ' : 'Phim Lẻ';
          return '<a href="/xem-phim/' + slug + '" style="text-decoration:none;background:#131722;border-radius:10px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 4px 15px rgba(0,0,0,0.5);transition:transform 0.2s;" onmouseover="this.style.transform=\'scale(1.03)\'" onmouseout="this.style.transform=\'none\'">' +
            '<div style="position:relative;width:100%;padding-top:140%;background:#0b0e14;">' +
              '<img src="' + thumb + '" alt="' + name + '" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;" loading="lazy" decoding="async" onerror="this.onerror=null;this.src=\'' + rawThumb + '\'">' +
              '<span style="position:absolute;top:8px;left:8px;background:rgba(0,0,0,0.75);color:#00f0ff;font-size:10px;font-weight:700;padding:3px 7px;border-radius:4px;border:1px solid rgba(0,240,255,0.3);">' + typeBadge + '</span>' +
            '</div>' +
            '<div style="padding:10px;">' +
              '<div style="color:#fff;font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + name + '</div>' +
              '<div style="color:#8b94a7;font-size:12px;margin-top:4px;">' + year + ' • Vietsub</div>' +
            '</div>' +
          '</a>';
        }).join('') +
      '</div>'
    ) : '<div style="text-align:center;padding:60px;color:#8b94a7;">Không tìm thấy phim phù hợp với bộ lọc.</div>') +
    paginationHtml +
  '</div>';
}

document.addEventListener('DOMContentLoaded', () => {
  setupEvents();
  initApp();
});
