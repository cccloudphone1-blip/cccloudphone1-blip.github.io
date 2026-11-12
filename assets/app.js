/**
 * h0syh0aπg Cinema - Clean & Ultra-Fast Player Engine
 * Kết nối trực tiếp 31,822 phim sạch 100% không link chết
 */

const $ = id => document.getElementById(id) || document.querySelector(id);
let searchIndex = null;

// Khởi chạy khi DOM sẵn sàng
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
  } else {
    renderHomePage();
  }
}

function setupEvents() {
  // Bắt form tìm kiếm
  const searchInput = $('input[type="search"], .search-input, input[name="q"], #search');
  if (searchInput) {
    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const q = searchInput.value.trim();
        if (q) navigate(`/tim-kiem?q=${encodeURIComponent(q)}`);
      }
    });
  }

  // Intercept navigation link SPA
  document.body.addEventListener('click', e => {
    const a = e.target.closest('a');
    if (a && a.href && a.host === window.location.host && !a.target && !e.ctrlKey && !e.metaKey) {
      const url = new URL(a.href);
      if (url.pathname.startsWith('/xem-phim/') || url.pathname.startsWith('/phim/') || url.pathname.startsWith('/tim-kiem') || url.pathname === '/') {
        e.preventDefault();
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

// 1. Trang Xem Phim (Watch Page)
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
    app.innerHTML = '<div style="max-width:600px;margin:80px auto;text-align:center;color:#ef4444;font-family:sans-serif;"><h2>Phim này đã bị xóa do toàn bộ nguồn phát đều lỗi</h2><p style="color:#8b94a7;margin-top:10px;">Chúng tôi đã loại bỏ phim này để tránh lỗi vòng xoay vô tận.</p><a href="/" style="display:inline-block;margin-top:20px;padding:10px 20px;background:#00f0ff;color:#000;text-decoration:none;font-weight:700;border-radius:8px;">Về Trang Chủ</a></div>';
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
    serverBtns += '<button type="button" style="padding:10px 18px;background:' + bg + ';color:' + col + ';border:1px solid rgba(255,255,255,0.1);border-radius:8px;cursor:pointer;font-weight:600;font-size:13px;" onclick="switchServer(\'' + sUrl + '\', this)">▶ ' + s.server_name + '</button> ';
  }

  app.innerHTML = '<div style="max-width:1200px;margin:20px auto;padding:0 15px;font-family:sans-serif;">' +
    '<div style="margin-bottom:15px;">' +
      '<a href="/" style="color:#8b94a7;text-decoration:none;">Trang chủ</a> / <span style="color:#fff;">' + movie.name + '</span>' +
      '<h1 style="color:#fff;font-size:24px;margin:10px 0 5px 0;">' + movie.name + ' <small style="color:#8b94a7;font-size:16px;">(' + (movie.year || '2001') + ')</small></h1>' +
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

window.switchServerwindow.switchServer = function(url, btn) {
  const iframe = document.querySelector('.player__box iframe');
  if (iframe && url) {
    iframe.src = url;
    document.querySelectorAll('.server-list button').forEach(b => {
      b.style.background = 'rgba(255,255,255,0.1)';
      b.style.color = '#fff';
    });
    btn.style.background = '#00f0ff';
    btn.style.color = '#000';
  }
};

// 2. Tìm kiếm nhanh trên 31,822 phim
async function renderSearchResults(q) {
  const container = $('.grid, .movie-grid, #app') || $('main');
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

  document.title = `Tìm kiếm: ${q} - h0syh0aπg Cinema`;
  container.innerHTML = `
    <div style="padding:20px 0;">
      <h2 style="color:#fff;margin-bottom:20px;">Kết quả tìm kiếm cho: "<span style="color:#00f0ff;">${q}</span>" (${hits.length} phim)</h2>
      <div class="grid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(180px, 1fr));gap:20px;">
        ${hits.map(m => `
          <a href="/xem-phim/${m.s}" class="card" style="text-decoration:none;background:#131722;border-radius:10px;overflow:hidden;display:flex;flex-direction:column;transition:transform 0.2s;">
            <div style="position:relative;width:100%;padding-top:140%;background:#000;">
              <img src="${m.p}" alt="${m.n}" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;" loading="lazy" onerror="this.src='/brand/poster-placeholder.svg'">
            </div>
            <div style="padding:10px;">
              <div style="color:#fff;font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.n}</div>
              <div style="color:#8b94a7;font-size:12px;margin-top:4px;">${m.y || 'FHD'}</div>
            </div>
          </a>
        `).join('')}
      </div>
    </div>
  `;
}

// 3. Trang chủ
async function renderHomePage() {
  // Trang chủ mặc định hiển thị danh sách hot
  const container = $('.grid, .movie-grid, #hotMovies');
  if (!container) return;
  try {
    const res = await fetch('/data/hot.json');
    if (res.ok) {
      const list = await res.json();
      container.innerHTML = list.slice(0, 24).map(m => `
        <a href="/xem-phim/${m.s}" class="card" style="text-decoration:none;background:#131722;border-radius:10px;overflow:hidden;display:flex;flex-direction:column;">
          <div style="position:relative;width:100%;padding-top:140%;background:#000;">
            <img src="${m.p}" alt="${m.n}" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;" loading="lazy">
          </div>
          <div style="padding:10px;">
            <div style="color:#fff;font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.n}</div>
            <div style="color:#8b94a7;font-size:12px;margin-top:4px;">${m.y || 'FHD'}</div>
          </div>
        </a>
      `).join('');
    }
  } catch (e) {}
}
