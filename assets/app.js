/**
 * h0syh0aπg Cinema - Clean & Ultra-Fast Player Engine
 * Kết nối trực tiếp 7,036 phim sạch 100% không link chết
 */

window.switchServer = function(url, btn) {
  const iframe = document.querySelector('.player__box iframe');
  if (iframe && url) {
    iframe.src = url;
    document.querySelectorAll('.server-list button').forEach(b => {
      b.style.background = 'rgba(255,255,255,0.08)';
      b.style.color = '#fff';
    });
    if (btn) {
      btn.style.background = '#00f0ff';
      btn.style.color = '#000';
    }
  }
};

window.switchEpisode = function(url, btn) {
  const iframe = document.querySelector('.player__box iframe');
  if (iframe && url) {
    iframe.src = url;
    document.querySelectorAll('.ep-list button').forEach(b => {
      b.style.background = 'rgba(255,255,255,0.08)';
      b.style.color = '#fff';
    });
    if (btn) {
      btn.style.background = '#00f0ff';
      btn.style.color = '#000';
    }
  }
};

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

document.addEventListener('DOMContentLoaded', initApp);

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

async function initApp() {
  initLiquidHeader();
  handleRoute();
  window.addEventListener('popstate', handleRoute);
  setupEvents();
}

// Khôi phục hiệu ứng kéo/bấm giọt nước iOS27 & nút 3 chấm Morph Island
function initLiquidHeader() {
  const tabBar = document.getElementById('ios27TabBar');
  const droplet = document.getElementById('tabWaterDroplet');
  const tabs = tabBar ? Array.from(tabBar.querySelectorAll('.tab-btn')) : [];

  function moveDropletToTab(tab, instant = false) {
    if (!tabBar || !droplet || !tab) return;
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const left = tab.offsetLeft;
    const width = tab.offsetWidth;
    if (instant) droplet.style.transition = 'none';
    droplet.style.width = width + 'px';
    droplet.style.transform = 'translateX(' + left + 'px)';
    if (instant) {
      void droplet.offsetWidth;
      droplet.style.transition = '';
    }
  }

  window.syncTabDropletByPath = function(path) {
    if (!tabs.length) return;
    let target = tabs[0];
    if (path.startsWith('/danh-sach/phim-bo') || path.startsWith('/phim-bo')) target = tabs.find(t => t.dataset.cat === 'series') || target;
    else if (path.startsWith('/danh-sach/phim-le') || path.startsWith('/phim-le')) target = tabs.find(t => t.dataset.cat === 'single') || target;
    else if (path.startsWith('/danh-sach/phim-chieu-rap') || path.startsWith('/chieu-rap')) target = tabs.find(t => t.dataset.cat === 'cinema') || target;
    else if (path.startsWith('/danh-sach/hoat-hinh') || path.startsWith('/anime')) target = tabs.find(t => t.dataset.cat === 'anime') || target;
    else if (path.startsWith('/blog')) target = tabs.find(t => t.dataset.cat === 'blog') || target;
    moveDropletToTab(target);
  };

  if (tabBar && droplet && tabs.length) {
    let isDragging = false;
    let dragStartX = 0;
    let hasMoved = false;

    const getTabAtX = (clientX) => {
      const rect = tabBar.getBoundingClientRect();
      const x = clientX - rect.left;
      let closest = tabs[0];
      let minDist = Infinity;
      for (const t of tabs) {
        const center = t.offsetLeft + t.offsetWidth / 2;
        const d = Math.abs(x - center);
        if (d < minDist) {
          minDist = d;
          closest = t;
        }
      }
      return closest;
    };

    const onPointerDown = (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      isDragging = true;
      hasMoved = false;
      dragStartX = e.clientX;
      tabBar.classList.add('dragging');
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      if (Math.abs(e.clientX - dragStartX) > 4) hasMoved = true;
      const rect = tabBar.getBoundingClientRect();
      const hoveredTab = getTabAtX(e.clientX);
      const maxLeft = tabBar.clientWidth - hoveredTab.offsetWidth - 6;
      const rawLeft = e.clientX - rect.left - hoveredTab.offsetWidth / 2;
      const clampedLeft = Math.max(6, Math.min(maxLeft, rawLeft));

      droplet.style.transition = 'width 0.15s ease';
      droplet.style.width = hoveredTab.offsetWidth + 'px';
      droplet.style.transform = 'translateX(' + clampedLeft + 'px) scale(1.06, 0.94)';

      tabs.forEach(t => t.classList.toggle('active', t === hoveredTab));
    };

    const onPointerUp = (e) => {
      if (!isDragging) return;
      isDragging = false;
      tabBar.classList.remove('dragging');
      droplet.style.transition = '';

      const targetTab = getTabAtX(e.clientX);
      moveDropletToTab(targetTab);
      if (hasMoved && targetTab) {
        const href = targetTab.getAttribute('href');
        if (href) navigate(href);
      }
    };

    tabBar.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('resize', () => {
      const active = tabBar.querySelector('.tab-btn.active') || tabs[0];
      moveDropletToTab(active, true);
    });

    // Khởi tạo vị trí ban đầu
    setTimeout(() => window.syncTabDropletByPath(window.location.pathname), 60);
  }

  // Nút 3 chấm Morph Island
  const morphIsland = document.getElementById('originMorphIsland');
  const morphTrigger = document.getElementById('morphDotsTrigger');
  const morphClose = document.getElementById('morphCloseBtn');
  if (morphIsland && morphTrigger) {
    morphTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      morphIsland.classList.toggle('expanded');
    });
    if (morphClose) {
      morphClose.addEventListener('click', (e) => {
        e.stopPropagation();
        morphIsland.classList.remove('expanded');
      });
    }
    document.addEventListener('click', (e) => {
      if (!morphIsland.contains(e.target)) {
        morphIsland.classList.remove('expanded');
      }
    });
  }
}

function handleRoute() {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  currentPage = parseInt(params.get('page') || '1', 10) || 1;
  currentFilterYear = params.get('year') || 'all';

  if (window.syncTabDropletByPath) window.syncTabDropletByPath(path);

  if (path.startsWith('/xem-phim/') || path.startsWith('/phim/')) {
    const slug = path.replace(/^\/(xem-phim|phim)\//, '').replace(/\/$/, '');
    renderWatchPage(slug);
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
    renderCatalogPage('🔥 Kho Phim Sạch 100% (7,036 Phim)');
  }
}

function setupEvents() {
  const searchForm = document.getElementById('searchForm');
  const searchInput = document.getElementById('searchInput') || document.querySelector('input[type="search"], .search-input, input[name="q"]');
  if (searchForm && searchInput) {
    searchForm.addEventListener('submit', e => {
      e.preventDefault();
      const q = searchInput.value.trim();
      if (q) navigate('/tim-kiem?q=' + encodeURIComponent(q));
    });
  } else if (searchInput) {
    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const q = searchInput.value.trim();
        if (q) navigate('/tim-kiem?q=' + encodeURIComponent(q));
      }
    });
  }

  document.body.addEventListener('click', e => {
    const a = e.target.closest('a');
    if (a && a.href && a.host === window.location.host && !a.target && !e.ctrlKey && !e.metaKey) {
      const url = new URL(a.href);
      if (
        url.pathname.startsWith('/xem-phim/') ||
        url.pathname.startsWith('/phim/') ||
        url.pathname.startsWith('/tim-kiem') ||
        url.pathname.startsWith('/danh-sach/') ||
        url.pathname.startsWith('/phim-') ||
        url.pathname.startsWith('/anime') ||
        url.pathname.startsWith('/chieu-rap') ||
        url.pathname === '/'
      ) {
        e.preventDefault();
        const morph = document.getElementById('originMorphIsland');
        if (morph) morph.classList.remove('expanded');
        navigate(url.pathname + url.search);
      }
    }
  });
}

function navigate(url) {
  window.history.pushState({}, '', url);
  handleRoute();
  window.scrollTo(0, 0);
}

window.applyYearFilter = function(yearVal) {
  const url = new URL(window.location.href);
  if (yearVal && yearVal !== 'all') {
    url.searchParams.set('year', yearVal);
  } else {
    url.searchParams.delete('year');
  }
  url.searchParams.delete('page');
  navigate(url.pathname + url.search);
};

window.goToPage = function(page) {
  const url = new URL(window.location.href);
  url.searchParams.set('page', page);
  navigate(url.pathname + url.search);
};

// 1. Trang Xem Phim
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

  const servers = movie.episodes;
  const firstServer = servers[0];
  const firstEp = firstServer.server_data[0];
  const streamUrl = firstEp.link_embed || firstEp.link_m3u8 || '';

  let serverBtns = '';
  for (let idx = 0; idx < servers.length; idx++) {
    const s = servers[idx];
    const sUrl = (s.server_data[0] && (s.server_data[0].link_embed || s.server_data[0].link_m3u8)) || '';
    const bg = idx === 0 ? '#00f0ff' : 'rgba(255,255,255,0.08)';
    const col = idx === 0 ? '#000' : '#fff';
    serverBtns += '<button type="button" style="padding:10px 18px;background:' + bg + ';color:' + col + ';border:1px solid rgba(255,255,255,0.1);border-radius:8px;cursor:pointer;font-weight:600;font-size:13px;transition:0.2s;" onclick="switchServer(\'' + sUrl + '\', this)">▶ ' + s.server_name.replace(/[\r\n\t]+/g, ' ').trim() + '</button> ';
  }

  let epHtml = '';
  if (firstServer.server_data && firstServer.server_data.length > 1) {
    epHtml = '<div style="margin-top:20px;">' +
      '<h3 style="color:#fff;font-size:16px;margin-bottom:10px;">Danh Sách Tập (' + firstServer.server_data.length + ' tập):</h3>' +
      '<div class="ep-list" style="display:flex;gap:8px;flex-wrap:wrap;max-height:240px;overflow-y:auto;padding-right:5px;">' +
      firstServer.server_data.map((ep, i) => {
        const u = ep.link_embed || ep.link_m3u8 || '';
        const bg = i === 0 ? '#00f0ff' : 'rgba(255,255,255,0.08)';
        const col = i === 0 ? '#000' : '#fff';
        return '<button type="button" style="padding:8px 14px;background:' + bg + ';color:' + col + ';border:1px solid rgba(255,255,255,0.1);border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;" onclick="switchEpisode(\'' + u + '\', this)">' + (ep.name || ('Tập ' + (i + 1))) + '</button>';
      }).join('') +
      '</div></div>';
  }

  app.innerHTML = '<div style="max-width:1200px;margin:20px auto;padding:0 15px;font-family:sans-serif;">' +
    '<div style="margin-bottom:15px;">' +
      '<a href="/" style="color:#8b94a7;text-decoration:none;">Trang chủ</a> / <span style="color:#fff;">' + movie.name + '</span>' +
      '<h1 style="color:#fff;font-size:24px;margin:10px 0 5px 0;">' + movie.name + ' <small style="color:#8b94a7;font-size:16px;">(' + (movie.year || '2024') + ')</small></h1>' +
      '<div style="display:flex;gap:8px;">' +
        '<span style="background:#00f0ff;color:#000;font-weight:700;font-size:12px;padding:3px 8px;border-radius:4px;">FHD</span>' +
        '<span style="background:rgba(255,255,255,0.1);color:#fff;font-size:12px;padding:3px 8px;border-radius:4px;">VIETSUB SẠCH 100%</span>' +
      '</div>' +
    '</div>' +
    '<div class="player__box" style="position:relative;width:100%;padding-top:56.25%;background:#000;border-radius:12px;overflow:hidden;box-shadow:0 15px 40px rgba(0,0,0,0.9);">' +
      '<iframe src="' + streamUrl + '" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;" allowfullscreen allow="autoplay; fullscreen; encrypted-media; picture-in-picture"></iframe>' +
    '</div>' +
    '<div style="margin-top:20px;">' +
      '<h3 style="color:#fff;font-size:16px;margin-bottom:10px;">Chọn Máy Chủ Phát:</h3>' +
      '<div class="server-list" style="display:flex;gap:10px;flex-wrap:wrap;">' + serverBtns + '</div>' +
    '</div>' +
    epHtml +
  '</div>';
}

// 2. Tìm kiếm nhanh
async function renderSearchResults(q) {
  const container = document.getElementById('app') || document.querySelector('main') || document.body;
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;padding:80px;color:#00f0ff;font-family:sans-serif;">Đang tìm kiếm trong kho 7,036 phim sạch...</div>';

  const catalog = await getCatalog();
  const kw = q.toLowerCase().trim();
  const hits = catalog.filter(m =>
    (m.n && m.n.toLowerCase().includes(kw)) ||
    (m.o && m.o.toLowerCase().includes(kw)) ||
    (m.s && m.s.includes(kw))
  );

  renderGrid(container, '🔍 Kết quả cho: "' + q + '" (' + hits.length + ' phim)', hits, false);
}

// 3. Trang Danh Mục + Phân Trang + Bộ Lọc Năm (Không lặp nút loại phim với Header)
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

  // Chỉ giữ duy nhất dropdown Năm gọn gàng (không trùng nút loại phim với Header)
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
