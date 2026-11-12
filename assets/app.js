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

let searchIndex = null;

document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
  handleRoute();
  window.addEventListener('popstate', handleRoute);
  setupEvents();
}

function handleRoute() {
  const path = window.location.pathname;
  if (path.startsWith('/xem-phim/')) {
    const slug = path.replace('/xem-phim/', '').replace(/\/$/, '');
    renderWatchPage(slug);
  } else if (path.startsWith('/phim/')) {
    const slug = path.replace('/phim/', '').replace(/\/$/, '');
    renderWatchPage(slug);
  } else if (path.startsWith('/tim-kiem')) {
    const params = new URLSearchParams(window.location.search);
    renderSearchResults(params.get('q') || '');
  } else if (path.startsWith('/phim-bo')) {
    renderCategoryPage('phim_bo.json', '📺 Phim Bộ Chọn Lọc');
  } else if (path.startsWith('/phim-le')) {
    renderCategoryPage('phim_le.json', '🎬 Phim Lẻ Chọn Lọc');
  } else {
    renderHomePage();
  }
}

function setupEvents() {
  const searchInput = document.querySelector('input[type="search"], .search-input, input[name="q"], #search, #searchInput');
  if (searchInput) {
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
      if (url.pathname.startsWith('/xem-phim/') || url.pathname.startsWith('/phim/') || url.pathname.startsWith('/tim-kiem') || url.pathname.startsWith('/phim-') || url.pathname === '/') {
        e.preventDefault();
        navigate(url.pathname + url.search);
      }
    }
  });

  // Gắn event cho menu navigation
  document.querySelectorAll('nav a, header a, .nav-item, .category-tab').forEach(el => {
    const text = el.textContent.trim().toLowerCase();
    if (text.includes('khám phá') || text.includes('trang chủ')) el.onclick = (e) => { e.preventDefault(); navigate('/'); };
    else if (text.includes('phim bộ')) el.onclick = (e) => { e.preventDefault(); navigate('/phim-bo'); };
    else if (text.includes('phim lẻ')) el.onclick = (e) => { e.preventDefault(); navigate('/phim-le'); };
  });
}

function navigate(url) {
  window.history.pushState({}, '', url);
  handleRoute();
  window.scrollTo(0, 0);
}

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
  '</div>';
}

// 2. Tìm kiếm nhanh
async function renderSearchResults(q) {
  const container = document.getElementById('app') || document.querySelector('main') || document.body;
  if (!container) return;

  if (!searchIndex) {
    try {
      const res = await fetch('/data/search_index.json');
      if (res.ok) searchIndex = await res.json();
    } catch (e) {}
  }

  if (!searchIndex) return;

  const kw = q.toLowerCase().trim();
  const hits = searchIndex.filter(m => (m.n && m.n.toLowerCase().includes(kw)) || (m.o && m.o.toLowerCase().includes(kw)) || (m.s && m.s.includes(kw))).slice(0, 48);

  document.title = 'Tìm kiếm: ' + q + ' - h0syh0aπg Cinema';
  container.innerHTML = '<div style="max-width:1200px;margin:20px auto;padding:0 15px;font-family:sans-serif;">' +
    '<h2 style="color:#fff;margin-bottom:20px;">Kết quả tìm kiếm cho: "<span style="color:#00f0ff;">' + q + '</span>" (' + hits.length + ' phim)</h2>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(180px, 1fr));gap:20px;">' +
      hits.map(m => '<a href="/xem-phim/' + m.s + '" style="text-decoration:none;background:#131722;border-radius:10px;overflow:hidden;display:flex;flex-direction:column;transition:transform 0.2s;" onmouseover="this.style.transform=\'scale(1.03)\'" onmouseout="this.style.transform=\'none\'">' +
        '<div style="position:relative;width:100%;padding-top:140%;background:#0b0e14;">' +
          '<img src="' + (m.p || '/brand/poster-placeholder.svg') + '" alt="' + m.n + '" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;" loading="lazy" onerror="this.src=\'/brand/poster-placeholder.svg\'">' +
        '</div>' +
        '<div style="padding:10px;">' +
          '<div style="color:#fff;font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + m.n + '</div>' +
          '<div style="color:#8b94a7;font-size:12px;margin-top:4px;">' + (m.y || 'FHD') + '</div>' +
        '</div>' +
      '</a>').join('') +
    '</div>' +
  '</div>';
}

// 3. Render Danh mục (Phim Bộ / Phim Lẻ)
async function renderCategoryPage(jsonFile, title) {
  const container = document.getElementById('app') || document.querySelector('main') || document.body;
  if (!container) return;
  try {
    const res = await fetch('/data/' + jsonFile);
    if (res.ok) {
      const list = await res.json();
      renderGrid(container, title, list);
    }
  } catch (e) {}
}

// 4. Trang chủ
async function renderHomePage() {
  const container = document.getElementById('app') || document.querySelector('main') || document.body;
  if (!container) return;
  try {
    const res = await fetch('/data/hot.json');
    if (res.ok) {
      const list = await res.json();
      renderGrid(container, '🔥 Phim Đang Thịnh Hành', list);
    }
  } catch (e) {}
}

function renderGrid(container, title, list) {
  document.title = title + ' - h0syh0aπg Cinema';
  container.innerHTML = '<div style="max-width:1200px;margin:20px auto;padding:0 15px;font-family:sans-serif;">' +
    '<h2 style="color:#fff;margin-bottom:20px;font-size:22px;display:flex;align-items:center;gap:8px;">' + title + '</h2>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(180px, 1fr));gap:20px;">' +
      list.map(m => {
        const slug = m.slug || m.s;
        const name = m.name || m.n;
        const thumb = m.thumb_url || m.poster_url || m.p || '/brand/poster-placeholder.svg';
        const year = m.year || m.y || 'FHD';
        return '<a href="/xem-phim/' + slug + '" style="text-decoration:none;background:#131722;border-radius:10px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 4px 15px rgba(0,0,0,0.5);transition:transform 0.2s;" onmouseover="this.style.transform=\'scale(1.03)\'" onmouseout="this.style.transform=\'none\'">' +
          '<div style="position:relative;width:100%;padding-top:140%;background:#0b0e14;">' +
            '<img src="' + thumb + '" alt="' + name + '" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;" loading="lazy" onerror="this.src=\'/brand/poster-placeholder.svg\'">' +
          '</div>' +
          '<div style="padding:10px;">' +
            '<div style="color:#fff;font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + name + '</div>' +
            '<div style="color:#8b94a7;font-size:12px;margin-top:4px;">' + year + ' • Vietsub</div>' +
          '</div>' +
        '</a>';
      }).join('') +
    '</div>' +
  '</div>';
}
