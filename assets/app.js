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
  const app = $('main, #app, .main, .container') || document.body;
  const playerBox = $('section.player, #playerBox, .player__box');
  
  if (playerBox) {
    playerBox.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:500px;background:#000;color:#66fcf1;font-size:16px;">Đang chuẩn bị luồng phát sạch...</div>';
  }

  // Lấy dữ liệu phim từ partitioned bucket
  const h = Array.from(slug).reduce((acc, c) => acc + c.charCodeAt(0), 0) % 100;
  let movie = null;
  try {
    const res = await fetch(`/data/b/${h}.json`);
    if (res.ok) {
      const bucket = await res.json();
      movie = bucket[slug];
    }
  } catch (e) {}

  if (!movie) {
    if (playerBox) playerBox.innerHTML = '<div style="padding:40px;color:#ef4444;text-align:center;">Phim này đã bị xóa do toàn bộ nguồn phát đều lỗi.</div>';
    return;
  }

  document.title = `Xem ${movie.name} - h0syh0aπg Cinema`;

  // Render iframe và danh sách server
  const servers = movie.episodes || [];
  const firstServer = servers[0] || {};
  const firstEp = (firstServer.server_data && firstServer.server_data[0]) || {};
  const streamUrl = firstEp.link_embed || firstEp.link_m3u8 || '';

  if (playerBox) {
    playerBox.innerHTML = `
      <div class="player__box" style="position:relative;width:100%;padding-top:56.25%;background:#000;border-radius:12px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.8);">
        <iframe src="${streamUrl}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;" allowfullscreen allow="autoplay; fullscreen; encrypted-media; picture-in-picture"></iframe>
      </div>
      <div class="server-list" style="display:flex;gap:10px;margin-top:15px;flex-wrap:wrap;">
        ${servers.map((s, idx) => `
          <button type="button" class="btn ${idx === 0 ? 'active' : ''}" style="padding:8px 16px;background:${idx === 0 ? '#00f0ff' : 'rgba(255,255,255,0.1)'};color:${idx === 0 ? '#000' : '#fff'};border:none;border-radius:8px;cursor:pointer;font-weight:600;" onclick="switchServer('${(s.server_data[0] && s.server_data[0].link_embed) || ''}', this)">
            ${s.server_name}
          </button>
        `).join('')}
      </div>
    `;
  }
}

window.switchServer = function(url, btn) {
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
