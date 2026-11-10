/* Nguồn: Supabase public catalog của khophim.org
   movies / movie_episodes, REST + Publishable key (anon). */
import {
  adminPage, ADMIN_PAGES, localMovies, findLocalMovie, localReviews, addReview,
  seoOverrides, bannerState, saveLocalMovie, deleteLocalMovie, allReviews, setSeoOverride,
  movieComments, addComment, deleteComment,
  followedMovies, isFollowed, toggleFollow, updateFollowEp,
  episodeNotifs, pushEpisodeNotif, markNotifsSeen, unseenNotifCount,
  playerReports, addPlayerReport,
} from './admin.js';

const SB = 'https://ceoxbhsdodllziyxmbqr.supabase.co';
const KEY = 'sb_publishable_Juh45t-R83dfgJI0O4_PQw_iYYoU-yh';
const TTL = 10 * 60 * 1000;
const PER = 24;

const FIELDS = [
  'id', 'slug', 'name', 'origin_name', 'thumb_url', 'poster_url', 'year', 'quality', 'lang',
  'episode_current', 'episode_total', 'current_episode', 'total_episodes', 'type', 'status', 'time',
  'category', 'country', 'content', 'view', 'trailer_url', 'backdrop_url', 'hero_backdrop_url',
  'hero_poster_url', 'tmdb_vote_average', 'published_at', 'updated_at', 'actor', 'director',
  'next_episode_at', 'next_episode_name', 'schedule_type', 'imdb_id', 'showtimes', 'notify', 'vote_average',
].join(',');

const CARD_FIELDS = 'id,slug,name,origin_name,thumb_url,poster_url,year,quality,lang,episode_current,type,tmdb_vote_average,published_at,view';

const BASE = { is_published: 'eq.true', superseded_by_movie_id: 'is.null' };
const NEWEST = 'published_at.desc.nullslast';

const TYPES = {
  'phim-bo': 'in.(series,phim-bo)',
  'phim-le': 'in.(single,phim-le)',
  'hoat-hinh': 'in.(hoathinh,animation)',
  'tv-shows': 'in.(tvshows,tv-shows)',
};

const GENRES = {
  'hanh-dong': 'Hành Động', 'tinh-cam': 'Tình Cảm', 'hai-huoc': 'Hài Hước', 'hai': 'Hài',
  'co-trang': 'Cổ Trang', 'tam-ly': 'Tâm Lý', 'kinh-di': 'Kinh Dị', 'vien-tuong': 'Viễn Tưởng',
  'phieu-luu': 'Phiêu Lưu', 'chien-tranh': 'Chiến Tranh', 'hinh-su': 'Hình Sự', 'gia-dinh': 'Gia Đình',
  'lich-su': 'Lịch Sử', 'bi-an': 'Bí Ẩn', 'vo-thuat': 'Võ Thuật', 'than-thoai': 'Thần Thoại',
  'hoc-duong': 'Học Đường', 'am-nhac': 'Âm Nhạc', 'kinh-dien': 'Kinh Điển', 'tai-lieu': 'Tài Liệu',
  'the-thao': 'Thể Thao', 'khoa-hoc': 'Khoa Học', 'chinh-kich': 'Chính Kịch', 'lang-man': 'Lãng Mạn',
  'toi-pham': 'Tội Phạm', 'gia-tuong': 'Giả Tưởng', 'khoa-hoc-vien-tuong': 'Khoa Học Viễn Tưởng',
  'hoat-hinh': 'Hoạt Hình', 'dam-my': 'Đam Mỹ', 'bl': 'BL / Đam Mỹ', 'gl': 'GL / Bách Hợp',
  'bach-hop': 'Bách Hợp', 'phim-hai': 'Phim Hài', 'phim-nhac': 'Phim Nhạc',
};

const COUNTRIES = {
  'viet-nam': 'Việt Nam', 'han-quoc': 'Hàn Quốc', 'trung-quoc': 'Trung Quốc', 'au-my': 'Âu Mỹ',
  'nhat-ban': 'Nhật Bản', 'thai-lan': 'Thái Lan', 'anh': 'Anh', 'hong-kong': 'Hồng Kông',
  'phap': 'Pháp', 'canada': 'Canada', 'duc': 'Đức', 'an-do': 'Ấn Độ', 'y': 'Ý',
  'tay-ban-nha': 'Tây Ban Nha', 'nga': 'Nga', 'uc': 'Úc', 'dai-loan': 'Đài Loan',
  'ba-lan': 'Ba Lan', 'brazil': 'Brazil', 'mexico': 'Mexico', 'indonesia': 'Indonesia',
  'malaysia': 'Malaysia', 'philippines': 'Philippines', 'tho-nhi-ky': 'Thổ Nhĩ Kỳ',
  'thuy-dien': 'Thụy Điển', 'na-uy': 'Na Uy', 'dan-mach': 'Đan Mạch', 'ha-lan': 'Hà Lan',
  'bo-dao-nha': 'Bồ Đào Nha', 'chau-phi': 'Châu Phi', 'quoc-gia-khac': 'Quốc Gia Khác',
};

/* Trang SEO phẳng của site gốc → query tương ứng */
const LANDINGS = {
  'phim-moi-nhat': { t: 'Phim mới nhất', q: {} },
  'phim-moi': { t: 'Phim mới', q: {} },
  'phim-moi-cap-nhat': { t: 'Phim mới cập nhật', q: {} },
  'kho-phim': { t: 'Toàn bộ kho phim', q: {} },
  'kho-phim-online': { t: 'Kho phim online', q: {} },
  'xem-phim': { t: 'Xem phim online', q: {} },
  'xem-phim-online': { t: 'Xem phim online', q: {} },
  'xem-phim-mien-phi': { t: 'Xem phim miễn phí', q: {} },
  'xem-phim-hd': { t: 'Xem phim HD', q: {} },
  'web-xem-phim': { t: 'Web xem phim', q: {} },
  'xem-phim-vietsub': { t: 'Xem phim Vietsub', q: { lang: 'ilike.*vietsub*' } },
  'phim-vietsub': { t: 'Phim Vietsub', q: { lang: 'ilike.*vietsub*' } },
  'xem-phim-moi': { t: 'Xem phim mới', q: {} },
  'phim-thuyet-minh': { t: 'Phim thuyết minh', q: { lang: 'ilike.*thuyết minh*' } },
  'xem-phim-thuyet-minh': { t: 'Xem phim thuyết minh', q: { lang: 'ilike.*thuyết minh*' } },
  'phim-long-tieng': { t: 'Phim lồng tiếng', q: { lang: 'ilike.*lồng tiếng*' } },
  'xem-phim-long-tieng': { t: 'Xem phim lồng tiếng', q: { lang: 'ilike.*lồng tiếng*' } },
  'phim-4k': { t: 'Phim 4K', q: { quality: 'ilike.*4K*' } },
  'phim-full-hd': { t: 'Phim Full HD', q: { quality: 'ilike.*HD*' } },
  'phim-hoan-tat': { t: 'Phim hoàn tất', q: { episode_current: 'ilike.*hoàn tất*' } },
  'phim-dang-chieu': { t: 'Phim đang chiếu', q: { order: NEWEST } },
  'phim-trailer': { t: 'Phim trailer', q: { episode_current: 'ilike.*trailer*' } },
  'phim-hay': { t: 'Phim hay', q: { order: 'tmdb_vote_average.desc.nullslast' } },
  'phim-hot-2026': { t: 'Phim hot 2026', q: { year: 'eq.2026', order: 'tmdb_vote_average.desc.nullslast' } },
  'phim-2026': { t: 'Phim 2026', q: { year: 'eq.2026' } },
  'phim-2025': { t: 'Phim 2025', q: { year: 'eq.2025' } },
  'phim-2024': { t: 'Phim 2024', q: { year: 'eq.2024' } },
  'phim-bo': { t: 'Phim bộ', q: { type: TYPES['phim-bo'] } },
  'xem-phim-bo': { t: 'Xem phim bộ', q: { type: TYPES['phim-bo'] } },
  'phim-le': { t: 'Phim lẻ', q: { type: TYPES['phim-le'] } },
  'xem-phim-le': { t: 'Xem phim lẻ', q: { type: TYPES['phim-le'] } },
  'phim-chieu-rap': { t: 'Phim chiếu rạp', q: { type: TYPES['phim-le'] } },
  'xem-phim-chieu-rap': { t: 'Phim chiếu rạp', q: { type: TYPES['phim-le'] } },
  'hoat-hinh': { t: 'Phim hoạt hình', q: { type: TYPES['hoat-hinh'] } },
  'anime': { t: 'Anime Vietsub', q: { type: TYPES['hoat-hinh'], lang: 'ilike.*vietsub*' } },
  'xem-anime-vietsub': { t: 'Anime Vietsub', q: { type: TYPES['hoat-hinh'] } },
  'tv-shows': { t: 'TV Shows', q: { type: TYPES['tv-shows'] } },
  'phim-sap-chieu': { t: 'Phim sắp chiếu', q: { schedule_type: 'eq.upcoming', order: 'next_episode_at.asc.nullslast' } },
  'phim-ma': { t: 'Phim ma', q: { category: 'cs.[{"slug":"kinh-di"}]' } },
  'phim-hai': { t: 'Phim hài', q: { category: 'cs.[{"slug":"hai-huoc"}]' } },
  'vu-tru-dam-my': { t: 'Vũ trụ đam mỹ', q: { category: 'cs.[{"slug":"dam-my"}]' } },
  'my-nam': { t: 'Phim Mỹ', q: { country: 'cs.[{"slug":"au-my"}]' } },
};
for (const [slug, name] of Object.entries(COUNTRIES)) {
  LANDINGS['phim-' + slug] = { t: 'Phim ' + name, q: { country: `cs.[{"slug":"${slug}"}]` }, noindex: false };
  LANDINGS['xem-phim-' + slug] = { t: 'Xem phim ' + name, q: { country: `cs.[{"slug":"${slug}"}]` }, noindex: false };
}
LANDINGS['phim-my'] = { t: 'Phim Mỹ', q: { country: 'cs.[{"slug":"au-my"}]' } };
LANDINGS['phim-han-quoc'] = { t: 'Phim Hàn Quốc', q: { country: 'cs.[{"slug":"han-quoc"}]' } };
LANDINGS['phim-trung-quoc'] = { t: 'Phim Trung Quốc', q: { country: 'cs.[{"slug":"trung-quoc"}]' } };
LANDINGS['phim-au-my'] = { t: 'Phim Âu Mỹ', q: { country: 'cs.[{"slug":"au-my"}]' } };
LANDINGS['phim-viet-nam'] = { t: 'Phim Việt Nam', q: { country: 'cs.[{"slug":"viet-nam"}]' } };

/* ---------------- helpers ---------------- */
const app = document.getElementById('app');
const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const plain = (h = '') => String(h).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const cleanName = s => String(s || '').replace(/\s+/g, ' ').trim();
const term = q => String(q || '').replace(/[*,()]/g, ' ').trim();
const num = n => Number(n).toLocaleString('vi-VN');

/* ---------------- SEO head ---------------- */
const SITE = () => location.origin;
const SITE_NAME = 'KhoPhim';

function upsertMeta(attr, key, content) {
  if (content === undefined) return;
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.setAttribute('content', String(content));
}
function upsertLink(rel, href) {
  let el = document.querySelector(`link[rel="${rel}"]`);
  if (!el) { el = document.createElement('link'); el.setAttribute('rel', rel); document.head.appendChild(el); }
  el.setAttribute('href', href);
}
function setHead({ title, description, path, image, type = 'website', jsonld, robots = 'index, follow, max-image-preview:large' }) {
  const ov = seoOverrides()[path || location.pathname];
  if (ov) {
    if (ov.title) title = ov.title;
    if (ov.description) description = ov.description;
  }
  document.title = title || SITE_NAME;
  const url = SITE() + (path || location.pathname + location.search);
  upsertMeta('name', 'description', description || '');
  upsertMeta('name', 'robots', robots);
  upsertLink('canonical', url);
  upsertMeta('property', 'og:type', type);
  upsertMeta('property', 'og:site_name', SITE_NAME);
  upsertMeta('property', 'og:title', title || SITE_NAME);
  upsertMeta('property', 'og:description', description || '');
  upsertMeta('property', 'og:url', url);
  upsertMeta('property', 'og:locale', 'vi_VN');
  if (image) upsertMeta('property', 'og:image', image);
  upsertMeta('name', 'twitter:card', 'summary_large_image');
  upsertMeta('name', 'twitter:title', title || SITE_NAME);
  upsertMeta('name', 'twitter:description', description || '');
  if (image) upsertMeta('name', 'twitter:image', image);

  document.getElementById('kp-jsonld')?.remove();
  if (jsonld) {
    const tag = document.createElement('script');
    tag.type = 'application/ld+json';
    tag.id = 'kp-jsonld';
    tag.textContent = JSON.stringify(jsonld);
    document.head.appendChild(tag);
  }
}
const breadcrumbLD = items => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: SITE() + it.path })),
});

/* ---------------- fallback: phimapi khi Supabase lỗi ---------------- */
const PHIMAPI = 'https://phimapi.com';
const phimImg = u => (!u ? '' : /^https?:/i.test(u) ? u : 'https://phimimg.com/' + String(u).replace(/^\/+/, ''));

function mapPhimapiItem(m) {
  return {
    slug: m.slug,
    name: m.name,
    origin_name: m.origin_name,
    year: m.year,
    poster_url: phimImg(m.poster_url),
    thumb_url: phimImg(m.thumb_url),
    quality: m.quality,
    lang: m.lang,
    episode_current: m.episode_current,
    type: m.type,
    tmdb_vote_average: m.tmdb?.vote_average || m.imdb?.vote_average || 0,
    category: m.category || [],
    country: m.country || [],
    _fallback: true,
  };
}

async function fallbackMovies(params, page) {
  const p = new URLSearchParams({ page: String(page || 1) });
  const cat = /"slug":"([a-z0-9-]+)"/.exec(params.category || '');
  const ctry = /"slug":"([a-z0-9-]+)"/.exec(params.country || '');
  const kw = /ilike\.\*([^*]+)\*/.exec(params.or || '');
  let url;
  if (kw) url = `${PHIMAPI}/v1/api/tim-kiem?keyword=${encodeURIComponent(kw[1])}&${p}`;
  else if (cat) url = `${PHIMAPI}/v1/api/the-loai/${cat[1]}?${p}`;
  else if (ctry) url = `${PHIMAPI}/v1/api/quoc-gia/${ctry[1]}?${p}`;
  else if (/series/.test(params.type || '')) url = `${PHIMAPI}/v1/api/danh-sach/phim-bo?${p}`;
  else if (/single/.test(params.type || '')) url = `${PHIMAPI}/v1/api/danh-sach/phim-le?${p}`;
  else if (/hoathinh|animation/.test(params.type || '')) url = `${PHIMAPI}/v1/api/danh-sach/hoat-hinh?${p}`;
  else url = `${PHIMAPI}/v1/api/danh-sach/phim-moi-cap-nhat?${p}`;

  const r = await fetch(url, { headers: { accept: 'application/json' } });
  if (!r.ok) return null;
  const j = await r.json();
  const items = j?.data?.items || [];
  const pg = j?.data?.params?.pagination || {};
  return {
    rows: items.map(mapPhimapiItem),
    page: pg.currentPage || 1,
    per: 24,
    total: pg.totalItems || items.length,
    totalPages: pg.totalPages || 1,
    fallback: true,
  };
}

const mem = new Map();
async function api(path, params = {}, { page = 1, per = PER, paged = false } = {}) {
  const ck = `sb4:${path}:${JSON.stringify(params)}:${paged ? page + '/' + per : 'x'}`;
  if (mem.has(ck)) return mem.get(ck);
  try {
    const raw = localStorage.getItem(ck);
    if (raw) {
      const o = JSON.parse(raw);
      if (Date.now() - o.t < TTL) { mem.set(ck, o.v); return o.v; }
    }
  } catch {}

  const url = new URL(SB + '/rest/v1/' + path);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const headers = { apikey: KEY, Authorization: 'Bearer ' + KEY, accept: 'application/json' };
  if (paged) {
    headers['Range'] = `${(page - 1) * per}-${page * per - 1}`;
    headers['Prefer'] = 'count=exact';
  }
  let res;
  try {
    res = await fetch(url, { headers });
  } catch (e) {
    const fb = path === 'movies' ? await fallbackMovies(params, page).catch(() => null) : null;
    if (fb) { mem.set(ck, fb); return fb; }
    throw e;
  }
  if (!res.ok) {
    const fb = path === 'movies' && res.status >= 500 ? await fallbackMovies(params, page).catch(() => null) : null;
    if (fb) { mem.set(ck, fb); return fb; }
    throw new Error('HTTP ' + res.status + ' ' + path);
  }
  const rows = await res.json();
  const total = Number((res.headers.get('content-range') || '').split('/')[1]) || rows.length;
  const out = { rows, page, per, total, totalPages: Math.max(1, Math.ceil(total / per)) };

  mem.set(ck, out);
  try { localStorage.setItem(ck, JSON.stringify({ t: Date.now(), v: out })); } catch {}
  return out;
}

function go(url, replace = false) {
  if (url === location.pathname + location.search) return;
  history[replace ? 'replaceState' : 'pushState'](null, '', url);
  route();
}

/* ---------------- storage: yêu thích + lịch sử ---------------- */
const LS_FAV = 'kp_favorites_v1';
const LS_HIST = 'kp_history_v1';
const readLS = (k, def) => { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch { return def; } };
const writeLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

const favs = () => readLS(LS_FAV, []);
const isFav = slug => favs().some(x => x.slug === slug);
function toggleFav(m) {
  const list = favs();
  const i = list.findIndex(x => x.slug === m.slug);
  if (i >= 0) list.splice(i, 1);
  else list.unshift({ slug: m.slug, name: m.name, poster: m.poster_url || m.thumb_url || '', year: m.year, episode_current: m.episode_current, at: Date.now() });
  writeLS(LS_FAV, list.slice(0, 200));
  return i < 0;
}

const histList = () => readLS(LS_HIST, []);
function recordHistory(m, epIndex, epName, sv, svName) {
  const list = histList().filter(x => x.slug !== m.slug);
  list.unshift({
    slug: m.slug, name: m.name, poster: m.poster_url || m.thumb_url || '', year: m.year,
    epIndex, epName, sv, svName, total: m.total_episodes || null, at: Date.now(),
  });
  writeLS(LS_HIST, list.slice(0, 100));
}

/* ---------------- cards ---------------- */
const rating = m => Number(m.tmdb_vote_average || 0) || 0;
const bgUrl = m => m.hero_backdrop_url || m.backdrop_url || m.thumb_url || m.poster_url || '';

function card(m) {
  const rate = rating(m);
  return `<a class="card" href="/phim/${esc(m.slug)}">
    <div class="card__img">
      <img src="${esc(m.poster_url || m.thumb_url || '')}" alt="${esc(m.name)}" loading="lazy" onerror="this.classList.add('ph')">
      ${rate ? `<span class="card__rate">★ ${rate.toFixed(1)}</span>` : ''}
      ${m.quality ? `<span class="card__q">${esc(m.quality)}</span>` : ''}
      ${m.episode_current ? `<span class="card__ep">${esc(m.episode_current)}</span>` : ''}
      <span class="card__play" title="Xem ngay"><span>▶</span></span>
    </div>
    <div class="card__name">${esc(m.name)}</div>
    <div class="card__sub">${esc(m.origin_name || '')}${m.year ? ' · ' + m.year : ''}</div>
  </a>`;
}
const gridHtml = rows => `<div class="grid">${rows.map(card).join('')}</div>`;
const rowHtml = rows => `<div class="row">${rows.map(card).join('')}</div>`;

function pager(page, total, hrefFor) {
  if (!total || total < 2) return '';
  const nums = new Set([1, total, page - 1, page, page + 1, page - 2, page + 2]);
  const list = [...nums].filter(n => n >= 1 && n <= total).sort((a, b) => a - b);
  let out = `<div class="pager">`;
  if (page > 1) out += `<a href="${hrefFor(page - 1)}">‹ Trước</a>`;
  let prev = 0;
  for (const n of list) {
    if (n - prev > 1) out += `<span class="dots">…</span>`;
    out += n === page ? `<span class="on">${n}</span>` : `<a href="${hrefFor(n)}">${n}</a>`;
    prev = n;
  }
  if (page < total) out += `<a href="${hrefFor(page + 1)}">Sau ›</a>`;
  return out + `</div>`;
}

const loading = (msg = 'Đang tải...') => `<div class="boot"><div class="boot__spin"></div><p>${esc(msg)}</p></div>`;
const emptyBox = (msg, extra = '') => `<div class="empty">${esc(msg)}${extra}</div>`;
const crumbs = parts => `<nav class="crumbs">${parts.map((p, i) => (i ? '<span>/</span>' : '') + (p.href ? `<a href="${p.href}">${esc(p.text)}</a>` : `<b>${esc(p.text)}</b>`)).join('')}</nav>`;

/* ---------------- trailer modal ---------------- */
function trailerEmbed(url) {
  const u = String(url || '').trim();
  if (!u) return '';
  let id = '';
  let m = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/.exec(u);
  if (m) id = m[1];
  if (id) return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
  m = /vimeo\.com\/(\d+)/.exec(u);
  if (m) return `https://player.vimeo.com/video/${m[1]}?autoplay=1`;
  return '';
}

function openTrailer(url) {
  const src = trailerEmbed(url);
  if (!src) { window.open(url, '_blank', 'noopener'); return; }
  let box = document.getElementById('trailerModal');
  if (!box) {
    box = document.createElement('div');
    box.id = 'trailerModal';
    box.className = 'modal';
    document.body.appendChild(box);
  }
  box.innerHTML = `<div class="modal__bg" data-close></div>
    <div class="modal__frame">
      <button class="modal__x" type="button" data-close aria-label="Đóng">×</button>
      <div class="modal__box"><iframe src="${esc(src)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>
    </div>`;
  box.hidden = false;
  document.body.style.overflow = 'hidden';
  const close = () => {
    box.hidden = true;
    box.innerHTML = '';
    document.body.style.overflow = '';
  };
  box.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', close));
  box._close = close;
}

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const box = document.getElementById('trailerModal');
  if (box && !box.hidden && box._close) box._close();
});

/* ---------------- hero ---------------- */
function heroSlide(m, i) {
  const cats = (m.category || []).slice(0, 3).map(c => esc(c.name)).join(' · ');
  const rate = rating(m) || 9.4;
  const bgImg = m.hero_backdrop_url || m.backdrop_url || m.thumb_url || m.poster_url || '';
  return `<div class="cinematic-hero hero__inner" data-slide="${i}" ${i ? 'hidden' : ''}>
    <img class="hero-backdrop-img" src="${esc(bgImg)}" alt="${esc(m.name)}" onerror="this.src='https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1600&q=80'">
    <div class="hero-vignette-overlay"></div>
    <div class="hero-content">
      <div class="hero-badges-row">
        <span class="hero-badge badge-hot">🔥 ${i === 0 ? 'BOM TẤN CHIẾU RẠP' : 'NỔI BẬT HÔM NAY'}</span>
        <span class="hero-badge badge-quality">${esc(m.quality || 'FHD')}</span>
        <span class="hero-badge badge-imdb">★ ${rate.toFixed(1)} IMDb</span>
        <span class="hero-badge badge-sound">${esc(m.lang || 'VIETSUB')}</span>
      </div>
      <h1 class="hero-title">
        ${esc(m.name)}
        ${m.origin_name ? `<span class="sub-title">${esc(m.origin_name)}${m.year ? ` • ${m.year}` : ''}</span>` : ''}
      </h1>
      <p class="hero-synopsis">
        ${esc(plain(m.content || '')).slice(0, 260) || 'Khám phá bộ phim hấp dẫn với chất lượng âm thanh và hình ảnh sắc nét trên h0syh0aπg Cinema.'}
      </p>
      <div class="hero-actions">
        <a class="hero-watch-btn" href="/xem-phim/${esc(m.slug)}">
          <span class="play-icon-circle">▶</span>
          <span>Xem Phim Ngay</span>
        </a>
        <a class="hero-secondary-btn" href="/phim/${esc(m.slug)}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <span>Thông Tin Phim</span>
        </a>
      </div>
    </div>
  </div>`;
}
function initHero() {
  const hero = document.getElementById('hero');
  if (!hero) return;
  const slides = [...hero.querySelectorAll('[data-slide]')];
  const imgs = [...hero.querySelectorAll('.hero__bg img')];
  const dots = [...hero.querySelectorAll('.hero__nav button')];
  if (!slides.length) return;
  let idx = 0, timer;
  const show = n => {
    idx = (n + slides.length) % slides.length;
    slides.forEach((s, i) => { s.hidden = i !== idx; });
    imgs.forEach((s, i) => s.classList.toggle('on', i === idx));
    dots.forEach((d, i) => d.classList.toggle('on', i === idx));
  };
  const play = () => { clearInterval(timer); timer = setInterval(() => show(idx + 1), 7000); };
  dots.forEach((d, i) => d.addEventListener('click', () => { show(i); play(); }));
  show(0); play();
}

const newest = (page = 1) => api('movies', { ...BASE, select: CARD_FIELDS, order: NEWEST }, { page, paged: true });

/* ---------------- home ---------------- */
async function renderHome() {
  setHead({
    title: 'KhoPhim – Tìm phim theo tên, thể loại và quốc gia',
    description: 'Khám phá phim theo tên tiếng Việt, tên gốc, thể loại, quốc gia, năm phát hành và trạng thái tập trên KhoPhim.',
    path: '/',
  });
  app.innerHTML = `<div class="hero" id="hero">
      <div class="hero__bg"></div>
      <div class="boot" style="position:relative;z-index:2;min-height:62vh"><div class="boot__spin"></div><p>Đang mở rạp phim...</p></div>
      <div class="hero__nav"></div>
    </div>
    <section class="section" id="sec-cw"></section>
    <section class="section" id="sec-country"></section>
    <section class="section" id="sec-top"></section>
    <section class="section" id="sec-moi"></section>
    <section class="section" id="sec-bo"></section>
    <section class="section" id="sec-le"></section>
    <section class="section" id="sec-hh"></section>
    <section class="section" id="sec-vn"></section>
    <section class="section" id="sec-chieu"></section>
    <section class="section" id="sec-trailer"></section>
    <section class="section" id="sec-queer"></section>`;

  const [latest, bo, le, hh, vn, rap, top, trailer, queer] = await Promise.allSettled([
    api('movies', { ...BASE, select: FIELDS, order: NEWEST }, { page: 1, paged: true }),
    api('movies', { ...BASE, select: CARD_FIELDS, type: TYPES['phim-bo'], order: NEWEST, limit: 14 }),
    api('movies', { ...BASE, select: CARD_FIELDS, type: TYPES['phim-le'], order: NEWEST, limit: 14 }),
    api('movies', { ...BASE, select: CARD_FIELDS, type: TYPES['hoat-hinh'], order: NEWEST, limit: 14 }),
    api('movies', { ...BASE, select: CARD_FIELDS, country: 'cs.[{"slug":"viet-nam"}]', order: NEWEST, limit: 14 }),
    api('movies', { ...BASE, select: CARD_FIELDS, order: 'tmdb_popularity.desc.nullslast', limit: 14 }),
    api('movies', { ...BASE, select: CARD_FIELDS, order: 'tmdb_vote_average.desc.nullslast', limit: 10 }),
    api('movies', { ...BASE, select: CARD_FIELDS, trailer_url: 'neq.', order: NEWEST, limit: 14 }),
    api('movies', { ...BASE, select: CARD_FIELDS, category: 'cs.[{"slug":"dam-my"}]', order: NEWEST, limit: 14 }),
  ]);
  const rows = r => (r.status === 'fulfilled' ? r.value.rows || [] : []);

  const hero = document.getElementById('hero');
  const doctorXFeatured = {
    name: 'Bác Sĩ X',
    origin_name: 'Doctor X: Mafia in White',
    slug: 'bac-si-x',
    year: 2026,
    quality: 'FHD',
    lang: 'Vietsub VSMOV',
    rate: 9.8,
    episode_current: 'Trọn Bộ 10 Tập',
    content: 'Daimon Michiko – nữ bác sĩ ngoại khoa tự do thiên tài với tuyên ngôn bất hủ "Tôi không bao giờ thất bại!". Đối đầu viện trưởng mới và các âm mưu đen tối trong giới y khoa cấp cao.',
    poster_url: 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=800&q=80',
    hero_backdrop_url: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1600&q=80',
    thumb_url: 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=800&q=80',
    category: [{ name: 'Y Khoa' }, { name: 'Chính Kịch' }, { name: 'Chiếu Rạp' }]
  };
  const pool = [doctorXFeatured, ...rows(latest).slice(0, 5)];
  if (hero && pool.length) {
    hero.querySelector('.hero__bg').innerHTML = pool.map(m => `<img src="${esc(bgUrl(m))}" alt="" onerror="this.style.display='none'">`).join('');
    hero.querySelector('.boot')?.remove();
    hero.insertAdjacentHTML('beforeend', pool.map(heroSlide).join(''));
    hero.querySelector('.hero__nav').innerHTML = pool.map((_, i) => `<button aria-label="Slide ${i + 1}"${i ? '' : ' class="on"'}></button>`).join('');
    initHero();
  } else if (hero) {
    hero.innerHTML = emptyBox('Không tải được dữ liệu phim.');
  }

  const section = (id, title, list, href) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (!list.length) { el.remove(); return; }
    el.innerHTML = `<div class="section__head"><h2>${esc(title)}</h2><a href="${href}">Xem tất cả →</a></div>${rowHtml(list)}`;
  };
  section('sec-moi', 'Phim mới cập nhật', rows(latest), '/danh-sach/phim-moi-cap-nhat');
  section('sec-bo', 'Phim bộ mới', rows(bo), '/danh-sach/phim-bo');
  section('sec-le', 'Phim lẻ mới', rows(le), '/danh-sach/phim-le');
  section('sec-hh', 'Hoạt hình', rows(hh), '/danh-sach/hoat-hinh');
  section('sec-vn', 'Phim Việt Nam', rows(vn), '/quoc-gia/viet-nam');
  section('sec-chieu', 'Phim chiếu rạp', rows(rap), '/danh-sach/phim-chieu-rap');
  section('sec-trailer', 'Phim có trailer', rows(trailer), '/phim-trailer');
  section('sec-queer', 'Vũ trụ đam mỹ', rows(queer), '/vu-tru-dam-my');

  /* Top 10 */
  const topList = rows(top);
  const topEl = document.getElementById('sec-top');
  if (topEl) {
    if (!topList.length) topEl.remove();
    else topEl.innerHTML = `<div class="section__head"><h2>Top 10 đánh giá cao</h2><a href="/phim-hay">Xem tất cả →</a></div>
      <div class="row">${topList.map((m, i) => `<div class="ranked"><span class="rank">${i + 1}</span>${card(m)}</div>`).join('')}</div>`;
  }

  /* Xem tiếp (localStorage) */
  const cw = histList().slice(0, 10);
  const cwEl = document.getElementById('sec-cw');
  if (cwEl) {
    if (!cw.length) cwEl.remove();
    else cwEl.innerHTML = `<div class="section__head"><h2>Xem tiếp</h2><a href="/lich-su">Lịch sử →</a></div>
      <div class="row">${cw.map(h => `<a class="card" style="flex:0 0 176px" href="/xem-phim/${esc(h.slug)}?sv=${h.sv || 0}&ep=${h.epIndex || 0}">
        <div class="card__img"><img src="${esc(h.poster)}" alt="${esc(h.name)}" loading="lazy" onerror="this.classList.add('ph')">
          <span class="card__ep">${esc(h.epName || '')}</span><span class="card__play"><span>▶</span></span></div>
        <div class="card__name">${esc(h.name)}</div>
        <div class="card__sub">${esc(h.svName || '')}${h.year ? ' · ' + h.year : ''}</div></a>`).join('')}</div>`;
  }

  /* Tabs quốc gia */
  const TABS = [['viet-nam', 'Việt Nam'], ['han-quoc', 'Hàn Quốc'], ['trung-quoc', 'Trung Quốc'], ['au-my', 'Âu Mỹ']];
  const cEl = document.getElementById('sec-country');
  if (cEl) {
    cEl.innerHTML = `<div class="section__head"><h2>Phim theo quốc gia</h2><a href="/quoc-gia/viet-nam">Xem tất cả →</a></div>
      <div class="tabs">${TABS.map(([s, n], i) => `<button type="button" data-slug="${s}"${i ? '' : ' class="on"'}>${n}</button>`).join('')}</div>
      <div class="row" id="countryRow">${rowHtml(rows(vn))}</div>`;
    cEl.querySelectorAll('.tabs button').forEach(btn => btn.addEventListener('click', async () => {
      cEl.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b === btn));
      const row = document.getElementById('countryRow');
      row.innerHTML = `<div class="boot" style="min-height:120px"><div class="boot__spin"></div><p>Đang tải...</p></div>`;
      try {
        const { rows: list } = await api('movies', { ...BASE, select: CARD_FIELDS, country: `cs.[{"slug":"${btn.dataset.slug}"}]`, order: NEWEST, limit: 14 });
        row.innerHTML = list.length ? list.map(card).join('') : emptyBox('Không có phim.');
        const link = cEl.querySelector('.section__head a');
        if (link) link.setAttribute('href', '/quoc-gia/' + btn.dataset.slug);
      } catch {
        row.innerHTML = emptyBox('Lỗi tải dữ liệu.');
      }
    }));
  }

  const topItems = rows(latest).slice(0, 24);
  setHead({
    title: 'KhoPhim – Tìm phim theo tên, thể loại và quốc gia',
    description: 'Khám phá phim theo tên tiếng Việt, tên gốc, thể loại, quốc gia, năm phát hành và trạng thái tập trên KhoPhim.',
    path: '/',
    image: topItems[0] ? bgUrl(topItems[0]) : '',
    jsonld: [
      { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE_NAME, url: SITE() + '/', inLanguage: 'vi-VN', potentialAction: { '@type': 'SearchAction', target: SITE() + '/tim-kiem?q={search_term_string}', 'query-input': 'required name=search_term_string' } },
      {
        '@context': 'https://schema.org', '@type': 'ItemList', name: 'Phim mới cập nhật', numberOfItems: topItems.length,
        itemListElement: topItems.map((m, i) => ({ '@type': 'ListItem', position: i + 1, name: m.name, url: SITE() + '/phim/' + m.slug })),
      },
    ],
  });
  window.scrollTo(0, 0);
}

/* ---------------- collection (list/landing/genre/country) ---------------- */
const FILTERS = [
  ['phim-moi-cap-nhat', 'Mới cập nhật'],
  ['phim-bo', 'Phim bộ'],
  ['phim-le', 'Phim lẻ'],
  ['hoat-hinh', 'Hoạt hình'],
  ['phim-chieu-rap', 'Chiếu rạp'],
];

/* nạp thêm phim vào lưới hiện tại (không đổi trang) */
function bindLoadMore({ params, pageNum, totalPages }) {
  const btn = document.getElementById('loadMore');
  if (!btn) return;
  let page = pageNum;
  let busy = false;
  const run = async () => {
    if (busy) return;
    busy = true;
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Đang tải...';
    try {
      const next = page + 1;
      const res = await api('movies', { ...BASE, select: CARD_FIELDS, order: NEWEST, ...params }, { page: next, paged: true });
      const box = document.querySelector('#gridBox .grid');
      if (box && res.rows.length) box.insertAdjacentHTML('beforeend', res.rows.map(card).join(''));
      page = next;
      if (page >= totalPages) btn.remove();
      else {
        btn.disabled = false;
        btn.textContent = label;
        /* nếu nút vẫn nằm trong tầm nhìn thì nạp tiếp cho tới khi đầy màn hình */
        if (btn.getBoundingClientRect().top < window.innerHeight + 500) setTimeout(run, 200);
      }
    } catch {
      btn.disabled = false;
      btn.textContent = 'Lỗi, thử lại';
    } finally {
      busy = false;
    }
  };
  btn.addEventListener('click', run);
  /* tự nạp khi cuộn gần tới nút */
  const onScroll = () => {
    if (!document.body.contains(btn)) { removeEventListener('scroll', onScroll); return; }
    if (btn.disabled) return;
    if (btn.getBoundingClientRect().top < window.innerHeight + 500) run();
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

async function renderCollection(opts) {
  const { title, params, base, page = 1, crumbsParts, active, pagerFor, canonPath } = opts;
  const pageNum = Math.max(1, parseInt(page) || 1);
  app.innerHTML = `<div class="pagehead"><h1>Đang tải...</h1></div>${loading()}`;
  try {
    const res = await api('movies', { ...BASE, select: CARD_FIELDS, order: NEWEST, ...params }, { page: pageNum, paged: true });
    const path = canonPath ? canonPath(pageNum) : `${base}${pageNum > 1 ? '?page=' + pageNum : ''}`;
    const plainTitle = plain(title);
    setHead({
      title: `${plainTitle}${pageNum > 1 ? ' - trang ' + pageNum : ''} | ${SITE_NAME}`,
      description: `${plainTitle}: ${num(res.total)} phim Vietsub, thuyết minh chất lượng cao, cập nhật liên tục trên KhoPhim.`,
      path,
      image: res.rows[0] ? bgUrl(res.rows[0]) : '',
      jsonld: [
        breadcrumbLD([{ name: SITE_NAME, path: '/' }, { name: plainTitle, path: base }]),
        {
          '@context': 'https://schema.org', '@type': 'ItemList', name: plainTitle, numberOfItems: res.rows.length,
          itemListElement: res.rows.map((m, i) => ({ '@type': 'ListItem', position: i + 1, name: m.name, url: SITE() + '/phim/' + m.slug })),
        },
      ],
    });
    const hrefFor = pagerFor || (p => `${base}${base.includes('?') ? '&' : '?'}page=${p}`);
    app.innerHTML = `
      <div class="pagehead">
        ${crumbsParts ? crumbs(crumbsParts) : ''}
        <h1>${esc(title)}</h1>
        <p>${res.total ? `${num(res.total)} phim · trang ${pageNum}/${res.totalPages}` : 'Chưa có dữ liệu'}</p>
        <div class="filters">
          ${FILTERS.map(([s, n]) => `<a href="/danh-sach/${s}"${active === s ? ' class="on"' : ''}>${n}</a>`).join('')}
          <a href="/loc-phim${active === 'loc-phim' ? ' class="on"' : ''}">Lọc nâng cao</a>
        </div>
      </div>
      <section class="section" id="gridBox">${res.rows.length ? gridHtml(res.rows) : emptyBox('Không có phim nào.')}</section>
      ${pageNum < res.totalPages ? `<div class="btnrow" style="justify-content:center;margin:16px 0"><button class="btn btn--primary" type="button" id="loadMore">Tải thêm phim</button></div>` : ''}
      ${pager(pageNum, res.totalPages, hrefFor)}`;
    bindLoadMore({ params, pageNum, totalPages: res.totalPages });
  } catch (e) {
    app.innerHTML = `<div class="pagehead"><h1>Lỗi tải dữ liệu</h1><p>${esc(e.message)}</p></div>`;
  }
  window.scrollTo(0, 0);
}

function renderList(kind, slug, page) {
  const title = kind === 'the-loai' ? (GENRES[slug] || slug)
    : kind === 'quoc-gia' ? (COUNTRIES[slug] || slug)
    : (LANDINGS[slug]?.t || slug);
  const params = kind === 'the-loai' ? { category: `cs.[{"slug":"${slug}"}]` }
    : kind === 'quoc-gia' ? { country: `cs.[{"slug":"${slug}"}]` }
    : (LANDINGS[slug]?.q || {});
  return renderCollection({
    title,
    params,
    base: `/${kind}/${slug}`,
    page,
    active: kind === 'danh-sach' ? slug : undefined,
    crumbsParts: [{ text: 'Trang chủ', href: '/' }, { text: title }],
  });
}

/* ---------------- movie data ---------------- */
async function loadMovie(slug) {
  const ck = 'mv:' + slug;
  if (mem.has(ck)) return mem.get(ck);
  const localOnly = localMovies().some(m => m.slug === slug);
  if (localOnly) {
    const l = findLocalMovie(slug);
    if (l) { mem.set(ck, l); return l; }
  }
  const { rows } = await api('movies', { select: FIELDS, slug: 'eq.' + slug, is_published: 'eq.true', limit: 1 });
  const movie = rows[0];
  const localHit = () => {
    const l = findLocalMovie(slug);
    if (l) { mem.set(ck, l); return l; }
    return null;
  };


  if (!movie) {
    const l = localHit();
    if (l) return l;
    throw new Error('not found');
  }
  const { rows: eps } = await api('movie_episodes', {
    select: 'episode_number,episode_name,server_name,link_embed,link_m3u8,audio_type,thumbnail_url,subtitle_url,duration',
    movie_id: 'eq.' + movie.id,
    order: 'episode_number.asc',
    limit: 1000,
  });

  const servers = new Map();
  for (const e of eps) {
    const name = cleanName(e.server_name) || 'Vietsub';
    if (!servers.has(name)) servers.set(name, { name, audio: e.audio_type || '', eps: [] });
    const embed = e.link_embed || '';
    const m3u8 = e.link_m3u8 || '';
    const link = embed || m3u8;
    if (!link) continue;
    const s = servers.get(name);
    s.eps.push({
      num: Number(e.episode_number) || s.eps.length + 1,
      name: cleanName(e.episode_name) || 'Tập ' + (e.episode_number || s.eps.length + 1),
      link, embed, m3u8,
      thumb: e.thumbnail_url || '',
      dur: e.duration || '',
      sub: e.subtitle_url || '',
    });
  }
  const list = [...servers.values()]
    .filter(s => s.eps.length)
    .map(s => ({ ...s, eps: s.eps.sort((a, b) => a.num - b.num) }))
    .sort((a, b) => b.eps.length - a.eps.length);

  /* nguồn phát bổ sung: bảng streams (có health/priority/playback_score) */
  try {
    const { rows: streams } = await api('streams', {
      select: 'episode_slug,server_name,source,provider_key,embed_url,stream_url,priority,playback_score,audio_type,health_status',
      movie_id: 'eq.' + movie.id,
      is_active: 'eq.true',
      order: 'priority.desc',
      limit: 1000,
    });
    const known = new Set(list.map(s => s.name.toLowerCase()));
    const extra = new Map();
    for (const st of streams) {
      const name = cleanName(st.server_name) || cleanName(st.provider_key) || 'Stream';
      if (known.has(name.toLowerCase())) continue;
      const link = st.embed_url || st.stream_url || '';
      if (!link) continue;
      if (st.health_status && /dead|fail|down/i.test(String(st.health_status))) continue;
      if (!extra.has(name)) extra.set(name, { name, audio: st.audio_type || '', eps: [] });
      const num = Number(String(st.episode_slug || '').replace(/\D+/g, '')) || extra.get(name).eps.length + 1;
      extra.get(name).eps.push({ num, name: 'Tập ' + num, link });
    }
    for (const s of extra.values()) {
      if (s.eps.length) list.push({ ...s, eps: s.eps.sort((a, b) => a.num - b.num) });
    }
  } catch {}

  list.sort((a, b) => {
    const aDead = (a.eps[0] && isDead(a.eps[0].embed || a.eps[0].m3u8 || a.eps[0].link)) ? 1 : 0;
    const bDead = (b.eps[0] && isDead(b.eps[0].embed || b.eps[0].m3u8 || b.eps[0].link)) ? 1 : 0;
    if (aDead !== bDead) return aDead - bDead;
    const isVsmovA = /vsmov/i.test(a.name) || (a.eps[0] && /vsmov/i.test(a.eps[0].embed || a.eps[0].link || ''));
    const isVsmovB = /vsmov/i.test(b.name) || (b.eps[0] && /vsmov/i.test(b.eps[0].embed || b.eps[0].link || ''));
    const scoreA = (isVsmovA ? 60 : 0) + (/vietsub/i.test(a.name) ? 15 : 0) + (/thuyết minh/i.test(a.audio + a.name) ? 5 : 0);
    const scoreB = (isVsmovB ? 60 : 0) + (/vietsub/i.test(b.name) ? 15 : 0) + (/thuyết minh/i.test(b.audio + b.name) ? 5 : 0);
    return scoreB - scoreA || b.eps.length - a.eps.length;
  });

  const out = { movie, servers: list };
  mem.set(ck, out);
  return out;
}

function typeLabel(t) {
  const s = String(t || '');
  if (s.includes('single') || s.includes('phim-le')) return { text: 'Phim lẻ', href: '/phim-le' };
  if (s.includes('hoathinh') || s.includes('animation')) return { text: 'Hoạt hình', href: '/hoat-hinh' };
  if (s.includes('tvshow')) return { text: 'TV Shows', href: '/tv-shows' };
  return { text: 'Phim bộ', href: '/phim-bo' };
}

function metaChips(m) {
  const rate = rating(m);
  const cats = (m.category || []).map(c => `<a class="chip" href="/the-loai/${esc(c.slug)}">${esc(c.name)}</a>`).join('');
  const countries = (m.country || []).map(c => `<a class="chip" href="/quoc-gia/${esc(c.slug)}">${esc(c.name)}</a>`).join('');
  const imdb = m.imdb_id && /^tt\d+/.test(String(m.imdb_id))
    ? `<a class="chip chip--imdb" href="https://www.imdb.com/title/${esc(m.imdb_id)}/" target="_blank" rel="noopener">IMDb ↗</a>` : '';
  return `${m.quality ? `<span class="chip chip--cyan">${esc(m.quality)}</span>` : ''}
    ${m.lang ? `<span class="chip">${esc(m.lang)}</span>` : ''}
    ${m.time ? `<span class="chip">${esc(m.time)}</span>` : ''}
    ${m.episode_current ? `<span class="chip chip--red">${esc(m.episode_current)}</span>` : ''}
    ${rate ? `<span class="chip">★ ${rate.toFixed(1)}</span>` : ''}
    ${m.view ? `<span class="chip">${num(m.view)} lượt xem</span>` : ''}
    ${/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(String(m.showtimes || '')) ? `<span class="chip">Chiếu rạp ${esc(String(m.showtimes))}</span>` : ''}
    ${imdb}
    ${m.year ? `<a class="chip" href="/phim-${m.year}">${m.year}</a>` : ''}
    ${cats}${countries}`;
}

async function relatedSection(m) {
  const cat = m.category?.[0]?.slug;
  if (!cat) return [];
  const { rows } = await api('movies', {
    ...BASE, select: CARD_FIELDS, category: `cs.[{"slug":"${cat}"}]`,
    slug: 'neq.' + m.slug, order: NEWEST, limit: 14,
  });
  return rows;
}

function favButton(m) {
  const on = isFav(m.slug);
  return `<button class="btn btn--ghost favBtn${on ? ' on' : ''}" type="button" data-slug="${esc(m.slug)}" data-name="${esc(m.name)}" data-poster="${esc(m.poster_url || m.thumb_url || '')}" data-year="${esc(m.year || '')}" data-ep="${esc(m.episode_current || '')}">${on ? '♥ Đã yêu thích' : '♡ Yêu thích'}</button>`;
}

function followButton(m) {
  const on = isFollowed(m.slug);
  return `<button class="btn btn--ghost followBtn${on ? ' on' : ''}" type="button" data-slug="${esc(m.slug)}" data-name="${esc(m.name)}" data-poster="${esc(m.poster_url || m.thumb_url || '')}" data-year="${esc(m.year || '')}" data-ep="${esc(m.episode_current || '')}">${on ? '◉ Đang theo dõi' : '◎ Theo dõi'}</button>`;
}

function bindFollow(btn, m) {
  btn.addEventListener('click', () => {
    const added = toggleFollow(m);
    btn.classList.toggle('on', added);
    btn.textContent = added ? '◉ Đang theo dõi' : '◎ Theo dõi';
    renderNotifStrip();
  });
}

function bindFav(btn, m) {
  btn.addEventListener('click', () => {
    const added = toggleFav(m);
    btn.classList.toggle('on', added);
    btn.textContent = added ? '♥ Đã yêu thích' : '♡ Yêu thích';
  });
}

/* ---------------- detail ---------------- */
async function renderDetail(slug) {
  app.innerHTML = loading('Đang tải phim...');
  let data;
  try {
    data = await loadMovie(slug);
  } catch {
    document.title = 'Không tìm thấy phim – KhoPhim';
    app.innerHTML = `<div class="pagehead">${crumbs([{ text: 'Trang chủ', href: '/' }, { text: 'Không tìm thấy' }])}<h1>Không tìm thấy phim</h1><p>${esc(slug)}</p><a class="btn btn--ghost" href="/">Về trang chủ</a></div>`;
    return;
  }
  const { movie: m, servers } = data;
  const totalEp = servers.reduce((a, s) => a + s.eps.length, 0);
  const tl = typeLabel(m.type);
  const summary = plain(m.content || '').slice(0, 157);
  const isSeries = totalEp > 1;
  setHead({
    title: `${m.name} (${m.year || ''}) - Thông Tin Phim | ${SITE_NAME}`,
    description: `Thông tin ${m.name} (${m.year || ''}). ${summary}`,
    path: '/phim/' + m.slug,
    image: m.poster_url || m.thumb_url || '',
    type: 'video.movie',
    jsonld: [
      {
        '@context': 'https://schema.org',
        '@type': isSeries ? 'TVSeries' : 'Movie',
        '@id': SITE() + '/phim/' + m.slug + '#movie',
        name: m.name,
        alternateName: m.origin_name || undefined,
        url: SITE() + '/phim/' + m.slug,
        image: m.poster_url || m.thumb_url || undefined,
        description: summary || undefined,
        genre: (m.category || []).map(c => c.name),
        countryOfOrigin: (m.country || []).map(c => ({ '@type': 'Country', name: c.name })),
        actor: (m.actor || []).slice(0, 12).map(a => ({ '@type': 'Person', name: a })),
        director: (m.director || []).map(a => ({ '@type': 'Person', name: a })),
        datePublished: m.year || undefined,
        numberOfEpisodes: totalEp || undefined,
        aggregateRating: rating(m) ? { '@type': 'AggregateRating', ratingValue: rating(m), bestRating: 10, ratingCount: Math.max(1, Math.round(rating(m) * 12)) } : undefined,
      },
      breadcrumbLD([{ name: SITE_NAME, path: '/' }, { name: tl.text, path: tl.href }, { name: m.name, path: '/phim/' + m.slug }]),
    ],
  });

  app.innerHTML = `
  <div class="detail">
    <div class="detail__bg"><img src="${esc(bgUrl(m))}" alt="" onerror="this.style.display='none'"></div>
    <div class="detail__inner">
      <div class="detail__poster">
        <img src="${esc(m.poster_url || m.thumb_url || '')}" alt="${esc(m.name)}" onerror="this.style.visibility='hidden'">
        ${totalEp ? `<a class="btn btn--primary" href="/xem-phim/${esc(m.slug)}">▶ Xem phim</a>` : ''}
        <div class="detail__acts">${favButton(m)}${followButton(m)}</div>
      </div>
      <div class="detail__body">
        ${crumbs([{ text: 'Trang chủ', href: '/' }, { text: tl.text, href: tl.href }, { text: m.name }])}
        <h1>${esc(m.name)}</h1>
        <div class="detail__origin">${esc(m.origin_name || '')}${m.year ? ` (${m.year})` : ''}</div>
        <div class="metaline">${metaChips(m)}</div>
        <div class="detail__desc clamped" id="desc">${m.content ? (m.content.trim().startsWith('<') ? m.content : `<p>${esc(m.content)}</p>`) : '<p>Chưa có mô tả.</p>'}</div>
        <button class="more" id="moreBtn" type="button">Xem thêm</button>
        ${m.notify ? `<div class="notice-inline">🔔 ${esc(String(m.notify).slice(0, 200))}</div>` : ''}
        <div class="btnrow">
          ${m.trailer_url ? `<button class="btn btn--ghost" type="button" id="trailerBtn" data-url="${esc(m.trailer_url)}">▶ Trailer</button>` : ''}
          ${totalEp ? `<a class="btn btn--ghost" href="/xem-phim/${esc(m.slug)}">Xem tập mới nhất</a>` : ''}
          <button class="btn btn--ghost" type="button" id="shareBtn" data-url="${esc(SITE() + '/phim/' + m.slug)}" data-title="${esc(m.name)}">Chia sẻ</button>
          <a class="btn btn--ghost" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SITE() + '/phim/' + m.slug)}" target="_blank" rel="noopener">Facebook</a>
        </div>
        ${(m.actor || []).length ? `<div class="actors"><b>Diễn viên:</b> ${m.actor.slice(0, 12).map(a => `<a href="/dien-vien?name=${encodeURIComponent(a)}">${esc(a)}</a>`).join(', ')}</div>` : ''}
        ${(m.director || []).length ? `<div class="actors"><b>Đạo diễn:</b> ${m.director.map(a => `<a href="/dien-vien?name=${encodeURIComponent(a)}">${esc(a)}</a>`).join(', ')}</div>` : ''}
      </div>
    </div>
  </div>

  <section class="player" id="playerBox"><div class="player__box"></div></section>

  <section class="eps">
    <div class="section__head"><h2>Danh sách tập</h2><span class="chip">${totalEp} tập</span></div>
    <div class="eps__server" id="epsServer"></div>
    <div class="eps__grid" id="epsGrid"></div>
  </section>

  <section class="section" id="related"></section>
  <section class="section" id="story"></section>
  <section class="section" id="comments"></section>
  <section class="section" id="reviews"></section>`;

  document.getElementById('moreBtn')?.addEventListener('click', e => {
    const d = document.getElementById('desc');
    const on = d.classList.toggle('clamped');
    e.target.textContent = on ? 'Xem thêm' : 'Thu gọn';
  });
  const fb = document.querySelector('.favBtn');
  if (fb) bindFav(fb, m);
  const fol = document.querySelector('.followBtn');
  if (fol) bindFollow(fol, m);

  document.getElementById('trailerBtn')?.addEventListener('click', e => openTrailer(e.currentTarget.dataset.url));
  document.getElementById('shareBtn')?.addEventListener('click', async e => {
    const btn = e.currentTarget;
    const url = btn.dataset.url;
    try {
      if (navigator.share) { await navigator.share({ title: btn.dataset.title, url }); return; }
      await navigator.clipboard.writeText(url);
      btn.textContent = 'Đã copy link';
      setTimeout(() => { btn.textContent = 'Chia sẻ'; }, 1600);
    } catch {
      window.prompt('Copy link phim:', url);
    }
  });

  renderReviews(m);
  renderComments(m);
  loadStory(m);
  mountEpisodes(m, servers, { sv: 0, ep: 0, watchPage: false });
  relatedSection(m).then(rows => {
    const el = document.getElementById('related');
    if (!el || !rows.length) return;
    el.innerHTML = `<div class="section__head"><h2>Phim cùng thể loại</h2><a href="/the-loai/${esc(m.category?.[0]?.slug || '')}">Xem tất cả →</a></div>${rowHtml(rows)}`;
  }).catch(() => {});
  window.scrollTo(0, 0);
}

/* ---------------- watch page ---------------- */
async function renderWatch(slug, params) {
  app.innerHTML = loading('Đang mở phim...');
  let data;
  try {
    data = await loadMovie(slug);
  } catch {
    document.title = 'Không tìm thấy phim – KhoPhim';
    app.innerHTML = `<div class="pagehead"><h1>Không tìm thấy phim</h1><a class="btn btn--ghost" href="/">Về trang chủ</a></div>`;
    return;
  }
  const { movie: m, servers } = data;
  setHead({
    title: `Xem ${m.name} (${m.year || ''}) Vietsub | ${SITE_NAME}`,
    description: `Xem phim ${m.name} ${m.origin_name ? '(' + m.origin_name + ') ' : ''}${m.year || ''} Vietsub chất lượng cao, ${servers.reduce((a, s) => a + s.eps.length, 0)} tập trên KhoPhim.`,
    path: `/xem-phim/${m.slug}`,
    image: m.poster_url || m.thumb_url || '',
    type: 'video.movie',
    jsonld: breadcrumbLD([{ name: SITE_NAME, path: '/' }, { name: m.name, path: '/phim/' + m.slug }, { name: 'Xem phim', path: '/xem-phim/' + m.slug }]),
  });
  const totalEp = servers.reduce((a, s) => a + s.eps.length, 0);

  app.innerHTML = `
  <div class="watch">
    <div class="watch__head">
      ${crumbs([{ text: 'Trang chủ', href: '/' }, { text: m.name, href: '/phim/' + m.slug }, { text: 'Xem phim' }])}
      <h1>${esc(m.name)} <small>${esc(m.origin_name || '')}${m.year ? ' · ' + m.year : ''}</small></h1>
      <div class="metaline">${metaChips(m)}</div>
    </div>
    <section class="player" id="playerBox"><div class="player__box"></div></section>
    <div class="watch__bar">
      <button class="btn btn--ghost" id="prevEp" type="button">‹ Tập trước</button>
      <span id="epNow" class="chip chip--red"></span>
      <button class="btn btn--ghost" id="nextEp" type="button">Tập sau ›</button>
      <div class="watch__bar__right">
        ${favButton(m)}
        ${followButton(m)}
        <a class="btn btn--ghost" href="/phim/${esc(m.slug)}">Thông tin phim</a>
      </div>
    </div>
    <section class="eps">
      <div class="section__head"><h2>Danh sách tập</h2><span class="chip">${totalEp} tập</span></div>
      <div class="eps__server" id="epsServer"></div>
      <div class="eps__grid" id="epsGrid"></div>
    </section>
    <section class="section" id="related"></section>
  </div>`;

  const fb = document.querySelector('.favBtn');
  if (fb) bindFav(fb, m);
  const folW = document.querySelector('.followBtn');
  if (folW) bindFollow(folW, m);

  const sv = Math.min(Math.max(parseInt(params.get('sv')) || 0, 0), Math.max(0, servers.length - 1));
  const ep = Math.min(Math.max(parseInt(params.get('ep')) || 0, 0), Math.max(0, (servers[sv]?.eps.length || 1) - 1));
  mountEpisodes(m, servers, { sv, ep, watchPage: true });

  relatedSection(m).then(rows => {
    const el = document.getElementById('related');
    if (!el || !rows.length) return;
    el.innerHTML = `<div class="section__head"><h2>Phim cùng thể loại</h2><a href="/the-loai/${esc(m.category?.[0]?.slug || '')}">Xem tất cả →</a></div>${rowHtml(rows)}`;
  }).catch(() => {});
  window.scrollTo(0, 0);
}

/* ---------------- episodes + player ---------------- */
/* ---------------- player (iframe + native HLS) ---------------- */
/* nguồn bị chặn theo vùng: lưu localStorage, tự học khi phát lỗi */
const DEAD_KEY = 'kp_dead_hosts';
/* nguồn trả 404/CORS khi IP ngoài VN hoặc CDN chết — a.kvp726.com trả 404 hàng loạt */
const DEAD_SEED = ['a.kvp726.com', 'kkphimplayer7.com', 'v7.kkphimplayer7.com'];
/* nguồn chặn nhúng iframe (X-Frame-Options / 403) */
const NOFRAME = ['streamc.xyz', 'dailymotion.com', 'short.icu'];
const DEAD_TTL = 6 * 3600 * 1000;
const RETRY_TTL = 3 * 60 * 1000;
let retryOverride = { slug: '', until: 0 };

const hostOf = u => { try { return new URL(u).host.replace(/^www\./, ''); } catch { return ''; } };
const innerUrl = u => { try { const q = new URL(u).searchParams.get('url'); return q || u; } catch { return u; } };
let deadCache = null;
const readDead = () => {
  if (deadCache) return deadCache;
  try { deadCache = JSON.parse(localStorage.getItem(DEAD_KEY)) || {}; } catch { deadCache = {}; }
  return deadCache;
};
const writeDead = o => { deadCache = o; try { localStorage.setItem(DEAD_KEY, JSON.stringify(o)); } catch {} };
const matches = (h, list) => list.some(s => h === s || h.endsWith('.' + s));
function isDead(u) {
  const h = hostOf(innerUrl(u || ''));
  if (!h) return false;
  const d = readDead();
  if (matches(h, DEAD_SEED) || matches(h, NOFRAME)) return true;
  const t = d[h];
  return typeof t === 'number' && Date.now() - t < DEAD_TTL;
}
const markDead = u => { const h = hostOf(innerUrl(u || '')); if (!h || matches(h, NOFRAME)) return; const d = readDead(); d[h] = Date.now(); writeDead(d); };
const markAlive = u => { const h = hostOf(innerUrl(u || '')); if (!h) return; const d = readDead(); if (h in d) { delete d[h]; writeDead(d); } };
function deadHostList() {
  const set = new Set([...DEAD_SEED, ...NOFRAME]);
  for (const [h, t] of Object.entries(readDead())) {
    if (h.startsWith('#') || typeof t !== 'number') continue;
    if (Date.now() - t < DEAD_TTL) set.add(h);
  }
  return [...set];
}
function retryDead(slug) {
  retryOverride = { slug: slug || '', until: Date.now() + RETRY_TTL };
  const d = readDead();
  const now = Date.now();
  for (const h of Object.keys(d)) if (typeof d[h] === 'number' && now - d[h] >= DEAD_TTL) delete d[h];
  writeDead(d);
}

/* thanh điều khiển riêng: tốc độ / phụ đề / PiP — chỉ tác dụng với luồng HLS */
function mountPlayerCtl(video, item) {
  const host = document.getElementById('playerBox');
  if (!host) return;
  host.querySelector('.pctl')?.remove();
  const bar = document.createElement('div');
  bar.className = 'pctl';
  bar.innerHTML = `
    <label>Tốc độ
      <select data-ctl="speed">${[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(v => `<option value="${v}"${v === 1 ? ' selected' : ''}>${v}×</option>`).join('')}</select>
    </label>
    ${item && item.sub ? `<label>Phụ đề
      <select data-ctl="sub"><option value="off">Tắt</option><option value="on">Vietsub</option></select>
    </label>` : ''}
    ${video ? `<label>Chất lượng
      <select data-ctl="quality"><option value="-1" selected>Auto</option></select>
    </label>` : ''}
    <button type="button" data-ctl="pip">Ảnh trong ảnh</button>
    ${video ? '' : '<small class="pctl__hint">Nguồn nhúng — tốc độ/phụ đề do player bên kia quản lý</small>'}`;
  host.appendChild(bar);
  if (!video) return;

  const speed = bar.querySelector('[data-ctl="speed"]');
  speed.addEventListener('change', () => {
    try { video.playbackRate = Number(speed.value); } catch {}
  });

  const quality = bar.querySelector('[data-ctl="quality"]');
  if (quality) quality.addEventListener('change', () => {
    try { const h = video._hls; if (h) h.nextLevel = Number(quality.value); } catch {}
  });

  const pip = bar.querySelector('[data-ctl="pip"]');
  if (!document.pictureInPictureEnabled) pip.remove();
  else pip.addEventListener('click', async () => {
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await video.requestPictureInPicture();
    } catch {}
  });

  const sub = bar.querySelector('[data-ctl="sub"]');
  if (sub) sub.addEventListener('change', () => {
    const t = video.textTracks && video.textTracks[0];
    if (t) t.mode = sub.value === 'on' ? 'showing' : 'hidden';
  });
}

let hlsPromise;
function loadHls() {
  if (window.Hls) return Promise.resolve(window.Hls);
  hlsPromise = hlsPromise || new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.min.js';
    s.onload = () => res(window.Hls);
    s.onerror = rej;
    document.head.appendChild(s);
  });
  return hlsPromise;
}
async function attachHls(video, src, onFail, onOk) {
  const fallback = () => { try { if (onFail) onFail(); } catch {} };
  const ok = () => { try { if (onOk) onOk(); } catch {} };
  video.addEventListener('loadedmetadata', ok, { once: true });
  try {
    const Hls = await loadHls();
    if (Hls && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: false });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, (_e, _data) => {
        ok();
        try {
          const sel = document.querySelector('.pctl [data-ctl="quality"]');
          if (sel && hls.levels && hls.levels.length > 1) {
            const seen = new Set();
            const opts = hls.levels.map((lv, i) => ({ i, h: lv.height || 0 })).filter(x => x.h && !seen.has(x.h) && seen.add(x.h)).sort((a, b) => b.h - a.h);
            if (opts.length > 1) sel.innerHTML = '<option value="-1" selected>Auto</option>' + opts.map(o => `<option value="${o.i}">${o.h}p</option>`).join('');
          }
        } catch {}
      });
      hls.on(Hls.Events.ERROR, (_e, data) => { if (data.fatal) fallback(); });
      video._hls = hls;
      return;
    }
  } catch {}
  video.src = src;
  video.addEventListener('error', fallback, { once: true });
}

function mountEpisodes(movie, servers, state) {
  const serverBox = document.getElementById('epsServer');
  const playerBox = document.querySelector('#playerBox .player__box');
  if (!servers.length) {
    if (playerBox) playerBox.innerHTML = `<div class="player__err">Phim chưa có nguồn xem. Quay lại sau nhé.</div>`;
    if (serverBox) serverBox.innerHTML = '';
    const grid0 = document.getElementById('epsGrid');
    if (grid0) grid0.innerHTML = emptyBox('Chưa có tập nào.');
    return;
  }

  const cur = { sv: state.sv, ep: state.ep };

  const srcOf = e => (e && (e.embed || e.m3u8 || e.link)) || '';
  const retrying = () => retryOverride.slug === movie.slug && Date.now() < retryOverride.until;
  const isPlayable = e => !!e && !!srcOf(e) && (retrying() || !isDead(srcOf(e)));

  /* tìm nguồn phát được đầu tiên từ (sv, ep) đi tới; sang server khác giữ đúng số tập */
  const seek = (sv, ep) => {
    const wantNum = servers[sv]?.eps?.[ep]?.num;
    let s = sv, e = ep, prev = sv;
    while (s < servers.length) {
      if (s !== prev) {
        const j = wantNum != null ? servers[s].eps.findIndex(x => x.num === wantNum) : -1;
        e = j >= 0 ? j : 0;
        prev = s;
      }
      const list = servers[s].eps;
      if (e >= list.length) { s++; e = 0; continue; }
      if (isPlayable(list[e])) return { s, e };
      e++;
    }
    return null;
  };
  const seekBack = (sv, ep) => {
    const wantNum = servers[sv]?.eps?.[ep]?.num;
    let s = sv, e = ep, prev = sv;
    while (s >= 0) {
      if (s !== prev) {
        const j = wantNum != null ? servers[s].eps.findIndex(x => x.num === wantNum) : -1;
        e = j >= 0 ? j : servers[s].eps.length - 1;
        prev = s;
      }
      if (e < 0) { s--; e = s >= 0 ? servers[s].eps.length - 1 : -1; continue; }
      if (isPlayable(servers[s].eps[e])) return { s, e };
      e--;
    }
    return null;
  };

  const notice = (html) => {
    let el = document.getElementById('playerNotice');
    if (!el) {
      el = document.createElement('div');
      el.id = 'playerNotice';
      el.className = 'player__notice';
      playerBox.parentElement.appendChild(el);
    }
    el.innerHTML = html;
    el.hidden = !html;
  };

  const showDead = (src, extra = '') => {
    const hosts = deadHostList();
    playerBox.innerHTML = `<div class="player__err">Nguồn <b>${esc(hostOf(innerUrl(src)) || 'không rõ')}</b> không phát được${extra ? ' — ' + esc(extra) : ''}.<br>
      <div class="btnrow" style="justify-content:center">
        <button type="button" class="btn btn--primary" id="tryNext">Thử nguồn khác</button>
        <button type="button" class="btn btn--ghost" id="reportSrc">Báo nguồn lỗi</button>
      </div></div>`;
    document.getElementById('tryNext')?.addEventListener('click', () => {
      const np = seek(cur.sv, cur.ep + 1) || seek(cur.sv + 1, 0);
      if (!np) { notice(`Tất cả nguồn đều lỗi: ${esc(hosts.join(', '))}`); return; }
      cur.sv = np.s; cur.ep = np.e; sync(); render();
    });
    document.getElementById('reportSrc')?.addEventListener('click', () => {
      const s = servers[cur.sv], e = s && s.eps[cur.ep];
      addPlayerReport({
        slug: movie.slug, name: movie.name,
        server: s ? s.name : '', ep: e ? e.name : '',
        host: hostOf(innerUrl(src)), note: extra || '',
      });
      notice('Đã ghi nhận báo lỗi nguồn <b>' + esc(hostOf(innerUrl(src))) + '</b>. Cảm ơn bạn.');
    });
    notice(`Nguồn bị chặn ở khu vực/kết nối này: ${esc(hosts.join(', ') || 'không rõ')} <button type="button" id="retrySrc" class="linkbtn">Thử lại tất cả</button><br><small>Đang bật VPN/WARP (1.1.1.1) hoặc proxy? Tắt đi rồi bấm thử lại — CDN phim chặn IP datacenter.</small>`);
    document.getElementById('retrySrc')?.addEventListener('click', () => { retryDead(movie.slug); render(); });
  };

  /* nhảy sang nguồn kế tiếp khi nguồn hiện tại chết */
  const hop = (fromSv, fromEp, msg) => {
    const np = seek(fromSv, fromEp + 1) || (seekBack(fromSv, fromEp - 1));
    if (np && (np.s !== fromSv || np.e !== fromEp)) {
      cur.sv = np.s; cur.ep = np.e; sync(); render(); notice(msg);
      return true;
    }
    return false;
  };

  const render = () => {
    const server = servers[cur.sv];
    const item = server.eps[cur.ep];
    const src = srcOf(item);

    if (!item) {
      playerBox.innerHTML = `<div class="player__err">Tập này chưa có nguồn phát.</div>`;
    } else if (isDead(src) && !retrying()) {
      markDead(src);
      if (!hop(cur.sv, cur.ep, `Nguồn <b>${esc(hostOf(innerUrl(src)))}</b> không phát được — đã chuyển nguồn khác.`)) {
        showDead(src, 'không còn nguồn thay thế');
      }
    } else if (item.m3u8) {
      playerBox.innerHTML = `<video class="player__video" controls playsinline preload="metadata"></video>`;
      const vid = playerBox.querySelector('video');
      if (item.sub) {
        const tr = document.createElement('track');
        tr.kind = 'subtitles';
        tr.label = 'Vietsub';
        tr.srclang = 'vi';
        tr.src = item.sub;
        vid.appendChild(tr);
      }
      mountPlayerCtl(vid, item);
      attachHls(vid, item.m3u8, () => {
        markDead(item.m3u8);
        if (hop(cur.sv, cur.ep, `Nguồn <b>${esc(hostOf(item.m3u8))}</b> không phản hồi — đã tự động chuyển sang server phát tốt hơn.`)) {
          return;
        }
        const wrap = 'https://player.phimapi.com/player/?url=' + encodeURIComponent(item.m3u8);
        playerBox.innerHTML = `<iframe src="${esc(wrap)}" allowfullscreen allow="autoplay; fullscreen; encrypted-media; picture-in-picture" referrerpolicy="no-referrer"></iframe>`;
        mountPlayerCtl(null, item);
        notice('Không phát trực tiếp được — đang dùng player nhúng dự phòng.');
      }, () => markAlive(item.m3u8));
    } else {
      playerBox.innerHTML = `<iframe src="${esc(src)}" allowfullscreen allow="autoplay; fullscreen; encrypted-media; picture-in-picture" referrerpolicy="no-referrer"></iframe>`;
      mountPlayerCtl(null, item);
      markAlive(src);
      notice('');
    }

    if (serverBox) {
      const deadBySv = servers.map(s => {
        const live = s.eps.filter(isPlayable).length;
        return live === 0;
      });
      serverBox.innerHTML = servers.map((s, i) => `<button type="button" data-sv="${i}"${i === cur.sv ? ' class="on"' : ''}${deadBySv[i] ? ' title="Nguồn này bị chặn ở khu vực của bạn"' : ''}>${esc(s.name)} <small>(${s.eps.length})</small>${deadBySv[i] ? ' <em class="warn">⚠</em>' : ''}</button>`).join('');
      serverBox.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
        cur.sv = +b.dataset.sv;
        cur.ep = 0;
        const p = seek(cur.sv, 0);
        if (p) cur.sv = p.s, cur.ep = p.e;
        sync();
        render();
      }));
    }

    const grid = document.getElementById('epsGrid');
    if (grid) {
      grid.innerHTML = server.eps.map((e, i) => `<a href="/xem-phim/${esc(movie.slug)}?sv=${cur.sv}&ep=${i}" data-ep="${i}"${e.thumb ? ` data-thumb="${esc(e.thumb)}"` : ''} class="${i === cur.ep ? 'on' : ''}${isPlayable(e) ? '' : ' dead'}">${esc(e.name)}</a>`).join('');
      grid.querySelectorAll('a').forEach(a => a.addEventListener('click', ev => {
        ev.preventDefault();
        ev.stopPropagation();
        cur.ep = +a.dataset.ep;
        sync();
        render();
      }));
      const act = grid.querySelector('a.on');
      if (act) grid.scrollTop = Math.max(0, act.offsetTop - grid.clientHeight / 2 + act.clientHeight / 2);

      /* preview thumbnail tập khi rê chuột */
      if (grid.querySelector('a[data-thumb]')) {
        let pv = playerBox.parentElement.querySelector('.epPreview');
        if (!pv) {
          pv = document.createElement('div');
          pv.className = 'epPreview';
          pv.hidden = true;
          playerBox.parentElement.appendChild(pv);
        }
        grid.querySelectorAll('a[data-thumb]').forEach(a => {
          a.addEventListener('mouseenter', () => {
            pv.innerHTML = `<img src="${esc(a.dataset.thumb)}" alt="" onerror="this.parentElement.hidden=true">`;
            pv.hidden = false;
          });
          a.addEventListener('mouseleave', () => { pv.hidden = true; });
        });
      }
    }

    const now = document.getElementById('epNow');
    if (now) now.textContent = `${server.name} · ${item ? item.name : '—'}`;

    const prev = document.getElementById('prevEp');
    const next = document.getElementById('nextEp');
    if (prev) prev.disabled = cur.ep <= 0 && cur.sv <= 0;
    if (next) next.disabled = cur.ep >= server.eps.length - 1 && cur.sv >= servers.length - 1;

    if (item) recordHistory(movie, cur.ep, item.name, cur.sv, server.name);
  };

  const sync = () => {
    const base = state.watchPage ? `/xem-phim/${movie.slug}` : `/phim/${movie.slug}`;
    history.replaceState(null, '', `${base}?sv=${cur.sv}&ep=${cur.ep}`);
  };

  document.getElementById('prevEp')?.addEventListener('click', () => {
    const p = seekBack(cur.sv, cur.ep - 1);
    if (p) { cur.sv = p.s; cur.ep = p.e; }
    sync(); render();
  });
  document.getElementById('nextEp')?.addEventListener('click', () => {
    const p = seek(cur.sv, cur.ep + 1);
    if (p) { cur.sv = p.s; cur.ep = p.e; }
    sync(); render();
  });

  const p0 = seek(cur.sv, cur.ep);
  if (p0) {
    cur.sv = p0.s;
    cur.ep = p0.e;
    if (p0.s !== state.sv || p0.e !== state.ep) sync();
  }
  render();
}

/* ---------------- search + filter ---------------- */
function searchForm(values = {}) {
  const opt = (map, val, ph) => `<option value="">${ph}</option>` + Object.entries(map).map(([s, n]) => `<option value="${s}"${val === s ? ' selected' : ''}>${esc(n)}</option>`).join('');
  return `<form class="filterform" id="filterForm">
    <input type="search" name="q" value="${esc(values.q || '')}" placeholder="Tên phim...">
    <select name="type">${[['phim-bo', 'Phim bộ'], ['phim-le', 'Phim lẻ'], ['hoat-hinh', 'Hoạt hình']].reduce((a, [v, n], i) => a + `<option value="${v}"${values.type === v ? ' selected' : ''}>${n}</option>`, '<option value="">Loại phim</option>')}</select>
    <select name="cat">${opt(GENRES, values.cat, 'Thể loại')}</select>
    <select name="country">${opt(COUNTRIES, values.country, 'Quốc gia')}</select>
    <select name="year">${['', 2026, 2025, 2024, 2023, 2022, 2021, 2020].map(y => `<option value="${y}"${String(values.year || '') === String(y) ? ' selected' : ''}>${y || 'Năm'}</option>`).join('')}</select>
    <select name="sort">${[['watch', 'Xem nhiều'], ['new', 'Mới nhất'], ['rating', 'Điểm cao'], ['name', 'Tên A-Z']].map(([v, n]) => `<option value="${v}"${values.sort === v ? ' selected' : ''}>${n}</option>`).join('')}</select>
    <button class="btn btn--primary" type="submit">Tìm</button>
  </form>`;
}

function buildParams(v) {
  const p = {};
  if (v.type) p.type = TYPES[v.type] || v.type;
  if (v.cat) p.category = `cs.[{"slug":"${v.cat}"}]`;
  if (v.country) p.country = `cs.[{"slug":"${v.country}"}]`;
  if (v.year) p.year = 'eq.' + v.year;
  p.order = v.sort === 'watch' ? 'view.desc.nullslast' : v.sort === 'rating' ? 'tmdb_vote_average.desc.nullslast' : v.sort === 'name' ? 'name.asc' : NEWEST;
  const t = term(v.q);
  if (t) p.or = `(name.ilike.*${t}*,origin_name.ilike.*${t}*)`;
  return p;
}

async function renderSearch(params) {
  const q = params.get('q') || '';
  const page = Math.max(1, parseInt(params.get('page')) || 1);
  const eq = { q, type: params.get('type') || '', cat: params.get('cat') || '', country: params.get('country') || '', year: params.get('year') || '', sort: params.get('sort') || '' };
  document.title = '';
  setHead({ title: `${q ? 'Tìm kiếm: ' + q : 'Tìm kiếm phim'} | ${SITE_NAME}`, description: `Kết quả tìm kiếm phim ${q} trên KhoPhim.`, path: '/tim-kiem' + (q ? '?q=' + encodeURIComponent(q) : ''), robots: 'noindex, follow' });
  app.innerHTML = `<div class="pagehead"><h1>${q ? 'Tìm kiếm: ' + esc(q) : 'Tìm kiếm phim'}</h1>${searchForm(eq)}<div id="sres"></div></div>`;
  bindFilterForm('/tim-kiem');

  if (!q && !eq.type && !eq.cat && !eq.country && !eq.year) {
    document.getElementById('sres').innerHTML = `<section class="section">${emptyBox('Nhập tên phim hoặc chọn bộ lọc để bắt đầu.')}</section>`;
    return;
  }
  const box = document.getElementById('sres');
  box.innerHTML = loading('Đang tìm...');
  try {
    const res = await api('movies', { ...BASE, select: CARD_FIELDS, ...buildParams(eq) }, { page, paged: true });
    const qs = new URLSearchParams(Object.entries(eq).filter(([, v]) => v)).toString();
    const low = term(q).toLowerCase();
    const localHits = localMovies()
      .filter(m => !low || [m.name, m.origin_name].filter(Boolean).some(x => String(x).toLowerCase().includes(low)))
      .map(m => ({ ...m, _local: true }));
    const allRows = [...localHits, ...res.rows];
    box.innerHTML = `<p class="count">${res.total ? `${num(res.total + localHits.length)} kết quả · trang ${page}/${res.totalPages}` : 'Không có kết quả'}</p>
      <section class="section">${allRows.length ? gridHtml(allRows) : emptyBox('Không tìm thấy phim phù hợp.')}</section>
      ${pager(page, res.totalPages, p => `/tim-kiem?${qs}${qs ? '&' : ''}page=${p}`)}`;
  } catch (e) {
    box.innerHTML = emptyBox('Lỗi: ' + e.message);
  }
  window.scrollTo(0, 0);
}

async function renderFilter(params) {
  const eq = { q: params.get('q') || '', type: params.get('type') || '', cat: params.get('cat') || '', country: params.get('country') || '', year: params.get('year') || '', sort: params.get('sort') || 'new' };
  const page = Math.max(1, parseInt(params.get('page')) || 1);
  setHead({ title: `Lọc phim | ${SITE_NAME}`, description: 'Lọc phim theo loại, thể loại, quốc gia, năm phát hành và điểm đánh giá.', path: '/loc-phim', robots: 'noindex, follow' });
  app.innerHTML = `<div class="pagehead">${crumbs([{ text: 'Trang chủ', href: '/' }, { text: 'Lọc phim' }])}<h1>Lọc phim</h1>${searchForm(eq)}<div id="sres"></div></div>`;
  bindFilterForm('/loc-phim');
  const box = document.getElementById('sres');
  box.innerHTML = loading('Đang lọc...');
  try {
    const res = await api('movies', { ...BASE, select: CARD_FIELDS, ...buildParams(eq) }, { page, paged: true });
    const qs = new URLSearchParams(Object.entries(eq).filter(([, v]) => v)).toString();
    box.innerHTML = `<p class="count">${res.total ? `${num(res.total)} phim · trang ${page}/${res.totalPages}` : 'Không có kết quả'}</p>
      <section class="section">${res.rows.length ? gridHtml(res.rows) : emptyBox('Không có phim phù hợp bộ lọc.')}</section>
      ${pager(page, res.totalPages, p => `/loc-phim?${qs}${qs ? '&' : ''}page=${p}`)}`;
  } catch (e) {
    box.innerHTML = emptyBox('Lỗi: ' + e.message);
  }
  window.scrollTo(0, 0);
}

function bindFilterForm(action) {
  document.getElementById('filterForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const qs = new URLSearchParams();
    fd.forEach((v, k) => { if (String(v).trim()) qs.set(k, String(v).trim()); });
    go(`${action}?${qs.toString()}`);
  });
}

/* ---------------- actors ---------------- */
async function renderActors(params) {
  const name = params.get('name') || '';
  setHead({ title: `${name ? 'Diễn viên ' + name : 'Diễn viên'} | ${SITE_NAME}`, description: name ? `Các phim có diễn viên ${name}.` : 'Danh sách diễn viên xuất hiện nhiều trong kho phim.', path: '/dien-vien' + (name ? '?name=' + encodeURIComponent(name) : '') });
  app.innerHTML = `<div class="pagehead">
      ${crumbs([{ text: 'Trang chủ', href: '/' }, { text: 'Diễn viên' }])}
      <h1>${name ? 'Diễn viên: ' + esc(name) : 'Diễn viên'}</h1>
      <form class="filterform" id="actorForm"><input type="search" name="name" value="${esc(name)}" placeholder="Tên diễn viên..."><button class="btn btn--primary" type="submit">Tìm</button></form>
    </div><div id="ares"></div>`;
  document.getElementById('actorForm').addEventListener('submit', e => {
    e.preventDefault();
    const v = e.target.name.value.trim();
    go(v ? `/dien-vien?name=${encodeURIComponent(v)}` : '/dien-vien');
  });

  const box = document.getElementById('ares');
  box.innerHTML = loading();
  try {
    if (name) {
      const arrLit = '{' + '"' + String(name).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"' + '}';
      const res = await api('movies', { ...BASE, select: CARD_FIELDS, actor: 'cs.' + arrLit, order: NEWEST, limit: 60 });
      box.innerHTML = `<p class="count">${num(res.rows.length)} phim</p><section class="section">${res.rows.length ? gridHtml(res.rows) : emptyBox('Không tìm thấy phim của diễn viên này.')}</section>`;
    } else {
      const { rows } = await api('movies', { ...BASE, select: 'actor', order: NEWEST, limit: 300 });
      const count = new Map();
      rows.forEach(r => (r.actor || []).forEach(a => count.set(a, (count.get(a) || 0) + 1)));
      const top = [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 60);
      box.innerHTML = `<section class="section"><div class="section__head"><h2>Diễn viên xuất hiện nhiều</h2></div>
        <div class="tagcloud">${top.map(([n, c]) => `<a href="/dien-vien?name=${encodeURIComponent(n)}">${esc(n)} <small>${c}</small></a>`).join('')}</div></section>`;
    }
  } catch (e) {
    box.innerHTML = emptyBox('Lỗi: ' + e.message);
  }
  window.scrollTo(0, 0);
}

/* ---------------- favorites + history ---------------- */
function renderFavorites() {
  setHead({ title: `Phim yêu thích | ${SITE_NAME}`, description: 'Danh sách phim bạn đã lưu trên KhoPhim.', path: '/yeu-thich', robots: 'noindex, follow' });
  const list = favs();
  app.innerHTML = `<div class="pagehead">${crumbs([{ text: 'Trang chủ', href: '/' }, { text: 'Yêu thích' }])}
      <h1>Phim yêu thích</h1><p>${list.length} phim</p></div>
    <section class="section" id="favWrap">${list.length ? `<div class="grid">${list.map(m => `<a class="card" href="/phim/${esc(m.slug)}">
        <div class="card__img"><img src="${esc(m.poster)}" alt="${esc(m.name)}" loading="lazy" onerror="this.classList.add('ph')">
        <span class="card__ep">${esc(m.episode_current || '')}</span><span class="card__play"><span>▶</span></span></div>
        <div class="card__name">${esc(m.name)}</div><div class="card__sub">${esc(m.year || '')}</div></a>`).join('')}</div>` : emptyBox('Chưa có phim yêu thích. Bấm ♡ ở trang phim để lưu.')}</section>`;
  window.scrollTo(0, 0);
}

function renderHistory() {
  setHead({ title: `Lịch sử xem | ${SITE_NAME}`, description: 'Phim bạn đã xem gần đây trên KhoPhim.', path: '/lich-su', robots: 'noindex, nofollow' });
  const list = histList();
  app.innerHTML = `<div class="pagehead">${crumbs([{ text: 'Trang chủ', href: '/' }, { text: 'Lịch sử' }])}
      <h1>Lịch sử xem</h1><p>${list.length} phim</p></div>
    <section class="section">${list.length ? `<div class="hist">${list.map(h => `<a class="hist__row" href="/xem-phim/${esc(h.slug)}?sv=${h.sv || 0}&ep=${h.epIndex || 0}">
        <img src="${esc(h.poster)}" alt="" loading="lazy" onerror="this.classList.add('ph')">
        <div><b>${esc(h.name)}</b><small>${esc(h.svName || '')} · ${esc(h.epName || '')}${h.year ? ' · ' + h.year : ''}</small></div>
        <span class="chip chip--red">Xem tiếp</span></a>`).join('')}</div>` : emptyBox('Chưa có lịch sử xem.')}</section>`;
  window.scrollTo(0, 0);
}

/* ---------------- static pages ---------------- */
const STATIC = {
  about: { t: 'Giới thiệu', html: `<p>KhoPhim là bản clone giao diện dựng bằng HTML/CSS/JS thuần, đọc dữ liệu công khai (bảng <code>movies</code>, <code>movie_episodes</code>) từ Supabase của khophim.org.</p><p>Không có máy chủ riêng, không lưu dữ liệu người dùng ngoài localStorage của trình duyệt (yêu thích, lịch sử xem).</p>` },
  policy: { t: 'Chính sách', html: `<p>Trang chỉ hiển thị metadata phim và liên kết phát từ nguồn công khai. Toàn bộ nội dung video thuộc về chủ sở hữu tương ứng.</p><p>Dữ liệu cá nhân: không thu thập. Yêu thích và lịch sử xem lưu cục bộ trong trình duyệt, xoá bằng cách xoá dữ liệu trang.</p>` },
  'yeu-cau-phim': { t: 'Yêu cầu phim', html: `<p>Tính năng gửi yêu cầu phim cần backend. Bản clone này lưu yêu cầu vào localStorage và hiển thị lại cho bạn.</p><form class="filterform" id="reqForm"><input type="text" name="q" placeholder="Tên phim bạn muốn thêm..."><button class="btn btn--primary" type="submit">Gửi</button></form><div id="reqList" class="tagcloud" style="margin-top:16px"></div>` },
  sitemap: { t: 'Sơ đồ trang', html: '' },
  'tai-khoan': { t: 'Tài khoản', html: `<p>Bản clone chạy không backend nên không có đăng nhập. Yêu thích, lịch sử xem và yêu cầu phim lưu trong localStorage của trình duyệt.</p><p>Muốn đồng bộ tài khoản cần Supabase Auth + bảng <code>user_sync_items</code> (bản gốc dùng Google OAuth).</p><div class="tagcloud" style="margin-top:14px"><a href="/yeu-thich">Phim yêu thích</a><a href="/lich-su">Lịch sử xem</a><a href="/yeu-cau-phim">Yêu cầu phim</a></div>` },
  'lich-cua-toi': { t: 'Lịch của tôi', html: `<p>Lịch phát sóng lấy từ phim có <code>next_episode_at</code>.</p><div id="schedList"></div>` },
};

function renderStatic(slug) {
  const page = STATIC[slug];
  setHead({ title: `${page.t} | ${SITE_NAME}`, description: `${page.t} – KhoPhim.`, path: '/' + slug });
  app.innerHTML = `<div class="pagehead">${crumbs([{ text: 'Trang chủ', href: '/' }, { text: page.t }])}<h1>${esc(page.t)}</h1></div>
    <section class="section"><div class="prose">${page.html}</div><div id="staticExtra"></div></section>`;

  if (slug === 'sitemap') {
    const block = (title, map, prefix) => `<div class="section__head"><h2>${title}</h2></div><div class="tagcloud">${Object.entries(map).map(([s, n]) => `<a href="/${prefix}/${s}">${esc(n)}</a>`).join('')}</div>`;
    document.querySelector('.prose').innerHTML = `${block('Thể loại', GENRES, 'the-loai')}${block('Quốc gia', COUNTRIES, 'quoc-gia')}
      <div class="section__head"><h2>Trang</h2></div><div class="tagcloud">${['/phim-moi-nhat', '/phim-bo', '/phim-le', '/hoat-hinh', '/anime', '/phim-chieu-rap', '/phim-thuyet-minh', '/phim-4k', '/phim-hoan-tat', '/phim-sap-chieu', '/dien-vien', '/yeu-thich', '/lich-su', '/loc-phim', '/tim-kiem', '/about', '/policy'].map(h => `<a href="${h}">${h}</a>`).join('')}</div>`;
  }

  if (slug === 'yeu-cau-phim') {
    const render = () => {
      const list = readLS('kp_requests', []);
      document.getElementById('reqList').innerHTML = list.map(x => `<span>${esc(x)}</span>`).join('');
    };
    document.getElementById('reqForm').addEventListener('submit', e => {
      e.preventDefault();
      const v = e.target.q.value.trim();
      if (!v) return;
      const list = readLS('kp_requests', []);
      list.unshift(v);
      writeLS('kp_requests', list.slice(0, 50));
      e.target.q.value = '';
      render();
    });
    render();
  }

  if (slug === 'lich-cua-toi') {
    api('movies', { ...BASE, select: CARD_FIELDS + ',next_episode_at,next_episode_name,schedule_note', next_episode_at: 'not.is.null', order: 'next_episode_at.asc.nullslast', limit: 30 })
      .then(({ rows }) => {
        document.getElementById('schedList').innerHTML = rows.length
          ? `<div class="hist">${rows.map(m => `<a class="hist__row" href="/phim/${esc(m.slug)}">
              <img src="${esc(m.poster_url || m.thumb_url || '')}" alt="" loading="lazy">
              <div><b>${esc(m.name)}</b><small>${esc(m.next_episode_name || '')} · ${new Date(m.next_episode_at).toLocaleString('vi-VN')}</small></div>
              <span class="chip">${esc(m.episode_current || '')}</span></a>`).join('')}</div>`
          : emptyBox('Chưa có lịch phát sóng.');
      })
      .catch(() => { document.getElementById('schedList').innerHTML = emptyBox('Không tải được lịch.'); });
  }
  window.scrollTo(0, 0);
}

/* ---------------- extra pages ---------------- */
async function renderSynopsis(slug) {
  app.innerHTML = loading();
  try {
    const { movie: m } = await loadMovie(slug);
    const tl = typeLabel(m.type);
    setHead({
      title: `Nội dung phim ${m.name} (${m.year || ''}) | ${SITE_NAME}`,
      description: plain(m.content || '').slice(0, 157),
      path: '/noi-dung-phim/' + m.slug,
      image: m.poster_url || '',
      jsonld: breadcrumbLD([{ name: SITE_NAME, path: '/' }, { name: m.name, path: '/phim/' + m.slug }, { name: 'Nội dung phim', path: '/noi-dung-phim/' + m.slug }]),
    });
    app.innerHTML = `<div class="pagehead">
      ${crumbs([{ text: 'Trang chủ', href: '/' }, { text: m.name, href: '/phim/' + m.slug }, { text: 'Nội dung phim' }])}
      <h1>Nội dung phim ${esc(m.name)}</h1>
      <p>${esc(m.origin_name || '')} · ${esc(m.year || '')} · ${esc(tl.text)}</p>
    </div>
    <section class="section">
      <div class="prose">${m.content ? (m.content.trim().startsWith('<') ? m.content : `<p>${esc(m.content)}</p>`) : '<p>Chưa có nội dung.</p>'}</div>
      ${(m.actor || []).length ? `<div class="actors" style="margin-top:18px"><b>Diễn viên:</b> ${m.actor.map(a => `<a href="/dien-vien?name=${encodeURIComponent(a)}">${esc(a)}</a>`).join(', ')}</div>` : ''}
      <div class="btnrow"><a class="btn btn--primary" href="/phim/${esc(m.slug)}">Xem phim</a><a class="btn btn--ghost" href="/xem-phim/${esc(m.slug)}">Xem ngay</a></div>
    </section>`;
  } catch {
    app.innerHTML = `<div class="pagehead"><h1>Không tìm thấy phim</h1></div>`;
  }
  window.scrollTo(0, 0);
}

async function renderDownload(slug) {
  app.innerHTML = loading();
  try {
    const { movie: m, servers } = await loadMovie(slug);
    setHead({ title: `Tải phim ${m.name} | ${SITE_NAME}`, description: `Link tải và nguồn phát phim ${m.name} (${m.year || ''}).`, path: '/download-phim/' + m.slug, robots: 'noindex, follow' });
    const rows = servers.map(s => `<div class="hist__row" style="align-items:flex-start">
        <div style="flex:1 1 auto"><b>${esc(s.name)}</b><small>${s.eps.length} tập · ${esc(s.audio || '')}</small></div>
        <a class="btn btn--ghost" href="/xem-phim/${esc(m.slug)}">Xem</a>
      </div>`).join('');
    app.innerHTML = `<div class="pagehead">${crumbs([{ text: 'Trang chủ', href: '/' }, { text: m.name, href: '/phim/' + m.slug }, { text: 'Tải phim' }])}
        <h1>Tải phim ${esc(m.name)}</h1><p>Nguồn phát công khai, sao chép liên kết m3u8 để tải bằng công cụ của bạn.</p></div>
      <section class="section"><div class="hist">${rows || emptyBox('Chưa có nguồn.')}</div></section>`;
  } catch {
    app.innerHTML = `<div class="pagehead"><h1>Không tìm thấy phim</h1></div>`;
  }
  window.scrollTo(0, 0);
}

const actorCacheKey = 'kp_actor_index_v1';
async function actorNameFromSlug(slug) {
  const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  let index = readLS(actorCacheKey, null);
  if (!index) {
    const { rows } = await api('movies', { ...BASE, select: 'actor', order: NEWEST, limit: 300 });
    const map = {};
    rows.forEach(r => (r.actor || []).forEach(a => { map[norm(a)] = a; }));
    index = map;
    writeLS(actorCacheKey, index);
  }
  return index[slug] || slug.replace(/-/g, ' ');
}

async function renderActorSlug(slug) {
  const name = await actorNameFromSlug(slug);
  const params = new URLSearchParams({ name });
  app.innerHTML = loading();
  await renderActors(params);
}

/* ---------------- blog thật (bảng movie_reviews) ---------------- */
const RV_FIELDS = 'slug,movie_name,origin_name,content,word_count,updated_at';

async function fetchReview(slug) {
  const { rows } = await api('movie_reviews', { select: RV_FIELDS, slug: 'eq.' + slug, limit: 1 });
  return rows[0] || null;
}

function chunkParagraphs(text, per = 4) {
  const src = String(text || '').replace(/\s+/g, ' ').trim();
  if (!src) return [];
  const sentences = src.match(/[^.!?]+[.!?]+/g) || [src];
  const out = [];
  for (let i = 0; i < sentences.length; i += per) out.push(sentences.slice(i, i + per).join(' ').trim());
  return out;
}

async function loadStory(m) {
  const el = document.getElementById('story');
  if (!el) return;
  try {
    const r = await fetchReview(m.slug);
    if (!r) { el.remove(); return; }
    el.innerHTML = `<div class="section__head"><h2>Giới thiệu phim</h2><a href="/blog/${esc(r.slug)}">Đọc riêng →</a></div>
      <article class="prose">${chunkParagraphs(r.content).map(p => `<p>${esc(p)}</p>`).join('')}</article>`;
  } catch { el.remove(); }
}

async function renderBlog(slug) {
  const page = Math.max(1, parseInt(new URLSearchParams(location.search).get('page')) || 1);

  if (slug) {
    app.innerHTML = loading('Đang tải bài viết...');
    try {
      const r = await fetchReview(slug);
      if (!r) throw new Error('not found');
      const summary = plain(r.content || '').slice(0, 157);
      setHead({
        title: `${r.movie_name} – Giới thiệu & đánh giá | ${SITE_NAME}`,
        description: summary,
        path: '/blog/' + slug,
        jsonld: [
          {
            '@context': 'https://schema.org', '@type': 'Article',
            headline: `${r.movie_name} – giới thiệu phim`,
            description: summary,
            url: SITE() + '/blog/' + slug,
            dateModified: r.updated_at,
            wordCount: r.word_count || undefined,
            author: { '@type': 'Organization', name: SITE_NAME },
            publisher: { '@type': 'Organization', name: SITE_NAME },
          },
          breadcrumbLD([{ name: SITE_NAME, path: '/' }, { name: 'Blog', path: '/blog' }, { name: r.movie_name, path: '/blog/' + slug }]),
        ],
      });
      app.innerHTML = `<div class="pagehead">${crumbs([{ text: 'Trang chủ', href: '/' }, { text: 'Blog', href: '/blog' }, { text: r.movie_name }])}
          <h1>${esc(r.movie_name)}</h1>
          <p class="count">${esc(r.origin_name || '')} · ${num(r.word_count || 0)} từ · cập nhật ${new Date(r.updated_at).toLocaleDateString('vi-VN')}</p>
          <div class="btnrow"><a class="btn btn--primary" href="/phim/${esc(slug)}">Xem phim</a><a class="btn btn--ghost" href="/blog">Bài khác</a></div>
        </div>
        <section class="section"><article class="prose">${chunkParagraphs(r.content).map(p => `<p>${esc(p)}</p>`).join('')}</article></section>`;
    } catch {
      setHead({ title: `Không tìm thấy bài viết | ${SITE_NAME}`, description: '', path: '/blog/' + slug, robots: 'noindex, follow' });
      app.innerHTML = `<div class="pagehead">${crumbs([{ text: 'Trang chủ', href: '/' }, { text: 'Blog', href: '/blog' }, { text: 'Không tìm thấy' }])}
        <h1>Không tìm thấy bài viết</h1><a class="btn btn--ghost" href="/blog">Về blog</a></div>`;
      window.scrollTo(0, 0);
      return false;
    }
    window.scrollTo(0, 0);
    return;
  }

  setHead({
    title: `Blog phim – giới thiệu, đánh giá | ${SITE_NAME}`,
    description: 'Bài giới thiệu và đánh giá phim trên KhoPhim, cập nhật từ kho nội dung.',
    path: '/blog',
  });
  app.innerHTML = `<div class="pagehead">${crumbs([{ text: 'Trang chủ', href: '/' }, { text: 'Blog' }])}
      <h1>Blog phim</h1><p>Giới thiệu và đánh giá từng phim.</p></div>
    <section class="section" id="blogList">${loading()}</section>`;

  try {
    const res = await api('movie_reviews', { select: RV_FIELDS, order: 'updated_at.desc' }, { page, per: 20, paged: true });
    const rows = res.rows;
    if (!rows.length) throw new Error('empty');
    document.getElementById('blogList').innerHTML = `
      <p class="count">${num(res.total)} bài viết · trang ${page}/${res.totalPages}</p>
      <div class="bloggrid">${rows.map(r => `<a class="blogcard" href="/blog/${esc(r.slug)}">
        <span class="blogcard__tag">Giới thiệu phim</span>
        <b>${esc(r.movie_name)}</b>
        <small>${esc(r.origin_name || '')}</small>
        <p>${esc(plain(r.content || '').slice(0, 150))}...</p>
        <em>${num(r.word_count || 0)} từ</em>
      </a>`).join('')}</div>
      ${pager(page, res.totalPages, p => `/blog${p > 1 ? '?page=' + p : ''}`)}`;
  } catch {
    document.getElementById('blogList').innerHTML = emptyBox('Không tải được bài viết.');
  }
  window.scrollTo(0, 0);
}

/* ---------------- bình luận (local) ---------------- */
function renderComments(m) {
  const el = document.getElementById('comments');
  if (!el) return;
  const list = movieComments(m.slug);
  el.innerHTML = `<div class="section__head"><h2>Bình luận (${list.length})</h2><span class="chip">lưu trên máy bạn</span></div>
    <div class="reviews">
      <form class="filterform" id="commentForm">
        <input name="name" placeholder="Tên bạn" maxlength="40">
        <input name="text" placeholder="Viết bình luận..." maxlength="500" style="min-width:280px" required>
        <button class="btn btn--primary" type="submit">Gửi</button>
      </form>
      <div class="hist" id="commentList">
        ${list.length ? list.map(c => `<div class="hist__row">
            <div><b>${esc(c.name)}</b><small>${esc(c.text)} · ${new Date(c.at).toLocaleString('vi-VN')}</small></div>
            <button class="btn btn--ghost" type="button" data-cid="${esc(c.id)}">Xoá</button>
          </div>`).join('') : emptyBox('Chưa có bình luận.')}
      </div>
    </div>`;
  document.getElementById('commentForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target;
    const text = f.text.value.trim();
    if (!text) return;
    addComment(m.slug, { name: f.name.value.trim(), text });
    renderComments(m);
  });
  el.querySelectorAll('[data-cid]').forEach(b => b.addEventListener('click', () => {
    deleteComment(m.slug, b.dataset.cid);
    renderComments(m);
  }));
}

/* ---------------- thông báo tập mới cho phim đang theo dõi ---------------- */
function renderNotifStrip() {
  const host = document.getElementById('kp-notif');
  if (!host) return;
  const n = unseenNotifCount();
  if (!n) { host.hidden = true; host.innerHTML = ''; return; }
  host.hidden = false;
  host.innerHTML = `<div class="strip__in"><a href="/theo-doi">🔔 ${n} phim bạn theo dõi vừa có tập mới</a>
    <button type="button" aria-label="Đánh dấu đã xem">×</button></div>`;
  host.querySelector('button').addEventListener('click', () => { markNotifsSeen(); renderNotifStrip(); });
}

async function checkFollowedEpisodes() {
  const list = followedMovies();
  if (!list.length) return;
  const slugs = list.slice(0, 60).map(f => f.slug);
  try {
    const { rows } = await api('movies', {
      select: 'slug,name,episode_current', is_published: 'eq.true', slug: `in.(${slugs.join(',')})`,
    });
    for (const m of rows) {
      const f = list.find(x => x.slug === m.slug);
      if (!f) continue;
      const now = m.episode_current || '';
      if (f.ep && now && now !== f.ep) {
        pushEpisodeNotif({ slug: m.slug, name: m.name, ep: now });
        updateFollowEp(m.slug, now);
      } else if (!f.ep && now) updateFollowEp(m.slug, now);
    }
  } catch {}
  renderNotifStrip();
}

/* ---------------- trang theo dõi ---------------- */
function renderFollowPage() {
  setHead({
    title: `Phim đang theo dõi | ${SITE_NAME}`,
    description: 'Danh sách phim bạn theo dõi và thông báo tập mới.',
    path: '/theo-doi',
    robots: 'noindex, follow',
  });
  const list = followedMovies();
  const notifs = episodeNotifs();
  app.innerHTML = `<div class="pagehead">${crumbs([{ text: 'Trang chủ', href: '/' }, { text: 'Theo dõi' }])}
      <h1>Phim đang theo dõi</h1>
      <p class="count">${list.length} phim · ${notifs.length} thông báo</p>
      ${notifs.length ? `<div class="btnrow"><button class="btn btn--ghost" type="button" id="markSeen">Đánh dấu đã xem tất cả</button></div>` : ''}
    </div>
    <section class="section">
      ${list.length ? `<div class="grid">${list.map(f => `<a class="card" href="/xem-phim/${esc(f.slug)}">
        <div class="card__img"><img src="${esc(f.poster)}" alt="${esc(f.name)}" loading="lazy" onerror="this.classList.add('ph')">
          <span class="card__ep">${esc(f.ep || '')}</span></div>
        <div class="card__name">${esc(f.name)}</div>
        <div class="card__sub">${esc(f.year || '')}</div></a>`).join('')}</div>` : emptyBox('Chưa theo dõi phim nào. Bấm "Theo dõi" ở trang phim.')}
    </section>
    <section class="section">
      <div class="section__head"><h2>Thông báo tập mới</h2></div>
      ${notifs.length ? `<div class="hist">${notifs.map(n => `<a class="hist__row" href="/phim/${esc(n.slug)}">
        <div><b>${esc(n.name)}</b><small>${esc(n.ep)} · ${new Date(n.at).toLocaleString('vi-VN')}${n.seen ? '' : ' · mới'}</small></div>
        <span class="chip chip--red">Mở</span></a>`).join('')}</div>` : emptyBox('Chưa có thông báo.')}
    </section>`;
  document.getElementById('markSeen')?.addEventListener('click', () => { markNotifsSeen(); renderFollowPage(); });
  renderNotifStrip();
  window.scrollTo(0, 0);
}

/* ---------------- reviews (local) ---------------- */
function renderReviews(m) {
  const el = document.getElementById('reviews');
  if (!el) return;
  const list = localReviews(m.slug);
  const avg = list.length ? (list.reduce((a, r) => a + Number(r.rating || 0), 0) / list.length).toFixed(1) : '0.0';
  el.innerHTML = `<div class="section__head"><h2>Đánh giá (${list.length})</h2><span class="chip">★ ${avg}/5</span></div>
    <div class="reviews">
      <form class="filterform" id="reviewForm">
        <input name="name" placeholder="Tên bạn" maxlength="40">
        <select name="rating">${[5, 4, 3, 2, 1].map(n => `<option value="${n}">${n} ★</option>`).join('')}</select>
        <input name="text" placeholder="Cảm nghĩ về phim..." style="min-width:260px">
        <button class="btn btn--primary" type="submit">Gửi</button>
      </form>
      <div class="hist" id="reviewList">
        ${list.length ? list.map(r => `<div class="hist__row">
            <div><b>${esc(r.name || 'Khách')} · ${'★'.repeat(Number(r.rating) || 0)}</b><small>${esc(r.text || '')} · ${new Date(r.at).toLocaleString('vi-VN')}</small></div>
          </div>`).join('') : emptyBox('Chưa có đánh giá. Lưu cục bộ trong trình duyệt.')}
      </div>
    </div>`;
  document.getElementById('reviewForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target;
    if (!f.text.value.trim()) return;
    addReview(m.slug, { name: f.name.value.trim(), rating: Number(f.rating.value), text: f.text.value.trim() });
    renderReviews(m);
  });
}

/* ---------------- admin (delegated to admin.js) ---------------- */
const adminCtx = section => adminPage({
  app, section, esc, setHead, api, num, loading, emptyBox, crumbs, SITE_NAME,
  TYPES, BASE, CARD_FIELDS, NEWEST,
});

/* ---------------- banner nội bộ ---------------- */
function renderBanner() {
  const host = document.getElementById('kp-banner');
  if (!host) return;
  const b = bannerState();
  const dismissed = sessionStorage.getItem('kp_banner_dismissed') === JSON.stringify(b);
  if (!b.active || !b.text || dismissed) { host.hidden = true; return; }
  host.hidden = false;
  host.innerHTML = `<div class="strip__in">${b.link ? `<a href="${esc(b.link)}">${esc(b.text)}</a>` : `<span>${esc(b.text)}</span>`}<button type="button" aria-label="Đóng">×</button></div>`;
  host.querySelector('button').addEventListener('click', () => {
    sessionStorage.setItem('kp_banner_dismissed', JSON.stringify(b));
    host.hidden = true;
  });
}

/* ---------------- router ---------------- */
function route() {
  renderBanner();
  renderNotifStrip();
  const params = new URLSearchParams(location.search);
  const seg = location.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const [a, b] = seg;

  document.querySelectorAll('.menu a').forEach(el => {
    el.classList.toggle('on', el.getAttribute('href') === location.pathname);
  });
  document.getElementById('menu')?.classList.remove('open');

  if (!seg.length || a === 'index.html') return renderHome();
  if (a === 'phim' && b === 'trang' && seg[2]) return renderCollection({ title: 'Toàn bộ kho phim', params: {}, base: '/phim', page: seg[2], crumbsParts: [{ text: 'Trang chủ', href: '/' }, { text: 'Kho phim' }] });
  if (a === 'phim' && b) return renderDetail(b);
  if (a === 'phim') return renderCollection({ title: 'Toàn bộ kho phim', params: {}, base: '/phim', page: params.get('page'), crumbsParts: [{ text: 'Trang chủ', href: '/' }, { text: 'Kho phim' }] });
  if (a === 'xem-phim' && b) return renderWatch(b, params);
  if (a === 'xem' && b) return go('/xem-phim/' + b + location.search, true);
  if (a === 'review-phim' && b) return renderBlog(b).then(ok => { if (ok === false) go('/phim/' + b, true); });
  if (a === 'noi-dung-phim' && b) return renderSynopsis(b);
  if (a === 'download-phim' && b) return renderDownload(b);
  if (a === 'danh-sach' && b) return renderList('danh-sach', b, params.get('page'));
  if (a === 'the-loai' && b) return renderList('the-loai', b, params.get('page'));
  if (a === 'quoc-gia' && b) return renderList('quoc-gia', b, params.get('page'));
  if (a === 'kho-phim' && b === 'trang' && seg[2]) return renderCollection({ title: 'Toàn bộ kho phim', params: {}, base: '/kho-phim/trang', page: seg[2], crumbsParts: [{ text: 'Trang chủ', href: '/' }, { text: 'Kho phim' }], pagerFor: p => `/kho-phim/trang/${p}`, canonPath: p => `/kho-phim/trang/${p}` });
  if (a === 'tim-kiem') return renderSearch(params);
  if (a === 'search') return renderSearch(params);
  if (a === 'loc-phim' || a === 'filter') return renderFilter(params);
  if (a === 'dien-vien' && b) return renderActorSlug(b);
  if (a === 'dien-vien') return renderActors(params);
  if (a === 'yeu-thich') return renderFavorites();
  if (a === 'theo-doi' || a === 'thong-bao') return renderFollowPage();
  if (a === 'lich-su') return renderHistory();
  if (a === 'blog') return renderBlog(b);
  if (a === 'admin') return adminCtx(b || 'overview');
  if (a === 'xem-phim') return renderHome();
  if (STATIC[a] && !b) return renderStatic(a);
  if (!b && LANDINGS[a]) {
    const landing = LANDINGS[a];
    return renderCollection({
      title: landing.t,
      params: landing.q,
      base: '/' + a,
      page: params.get('page'),
      crumbsParts: [{ text: 'Trang chủ', href: '/' }, { text: landing.t }],
    });
  }
  document.title = 'Không tìm thấy trang – KhoPhim';
  app.innerHTML = `<div class="pagehead"><h1>404</h1><p>Không tìm thấy trang <code>${esc(location.pathname)}</code>.</p><a class="btn btn--ghost" href="/">Về trang chủ</a></div>`;
}

/* ---------------- header ---------------- */
function buildMenus() {
  const fill = (kind, map) => {
    const box = document.querySelector(`[data-drop="${kind}"] .drop`);
    if (!box) return;
    box.innerHTML = Object.entries(map).map(([slug, name]) => `<a href="/${kind}/${esc(slug)}">${esc(name)}</a>`).join('');
  };
  fill('the-loai', GENRES);
  fill('quoc-gia', COUNTRIES);
}

function bindHeader() {
  document.querySelectorAll('.menu__drop').forEach(drop => {
    drop.querySelector('button').addEventListener('click', e => {
      e.stopPropagation();
      const open = drop.classList.contains('open');
      document.querySelectorAll('.menu__drop').forEach(d => d.classList.remove('open'));
      drop.classList.toggle('open', !open);
    });
  });
  document.addEventListener('click', e => {
    document.querySelectorAll('.menu__drop').forEach(d => d.classList.remove('open'));
    const a = e.target.closest('a');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    if (/^(https?:|#|mailto:)/i.test(href)) return;
    e.preventDefault();
    go(href);
  });

  document.getElementById('burger')?.addEventListener('click', () => document.getElementById('menu').classList.toggle('open'));

  const form = document.getElementById('searchForm');
  const input = document.getElementById('searchInput');
  const sug = document.getElementById('suggest');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    sug.hidden = true;
    go(`/tim-kiem?q=${encodeURIComponent(q)}`);
  });

  let tId;
  input.addEventListener('input', () => {
    clearTimeout(tId);
    const q = input.value.trim();
    if (q.length < 2) { sug.hidden = true; return; }
    tId = setTimeout(async () => {
      try {
        const t = term(q);
        const { rows } = await api('movies', {
          ...BASE, select: 'slug,name,origin_name,year,poster_url,thumb_url',
          or: `(name.ilike.*${t}*,origin_name.ilike.*${t}*)`, order: NEWEST, limit: 6,
        });
        if (!rows.length) { sug.hidden = true; return; }
        sug.innerHTML = rows.map(m => `<a href="/phim/${esc(m.slug)}">
          <img src="${esc(m.poster_url || m.thumb_url || '')}" alt="" loading="lazy">
          <span><b>${esc(m.name)}</b><small>${esc(m.origin_name || '')}${m.year ? ' · ' + m.year : ''}</small></span></a>`).join('');
        sug.hidden = false;
      } catch {}
    }, 320);
  });
  input.addEventListener('blur', () => setTimeout(() => { sug.hidden = true; }, 180));
  document.addEventListener('click', e => { if (!form.contains(e.target)) sug.hidden = true; });

  /* "/" để focus ô tìm kiếm */
  document.addEventListener('keydown', e => {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t && (/^(input|textarea|select)$/i.test(t.tagName) || t.isContentEditable)) return;
    e.preventDefault();
    input.focus();
    input.select();
  });

  const nav = document.getElementById('nav');
  addEventListener('scroll', () => nav.classList.toggle('is-solid', scrollY > 12), { passive: true });
}

bindHeader();
buildMenus();
addEventListener('popstate', () => { route(); setTimeout(initCinemaUI, 80); });
route();
setTimeout(initCinemaUI, 150);

/* kiểm tra tập mới của phim đang theo dõi (một lần mỗi phiên) */
if (followedMovies().length) setTimeout(() => { checkFollowedEpisodes(); }, 1200);

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}




/* ==========================================================================
   CINEMA UI CONTROLLER - h0syh0aπg Cinema
   ========================================================================== */
function initCinemaUI() {
  // 1. TABBAR DANH MỤC PHIM (CLICK HOẶC KÉO RÊ CHUYỂN TAB)
  const tabBar = document.getElementById('ios27TabBar');
  const droplet = document.getElementById('tabWaterDroplet');
  if (tabBar && droplet && !tabBar._bound) {
    tabBar._bound = true;
    const tabs = [...tabBar.querySelectorAll('.tab-btn')];

    function updateDroplet(activeTab) {
      if (!activeTab) return;
      const tRect = activeTab.getBoundingClientRect();
      const bRect = tabBar.getBoundingClientRect();
      const left = tRect.left - bRect.left;
      droplet.style.transform = `translate3d(${left}px, 0, 0)`;
      droplet.style.width = `${tRect.width}px`;
    }

    // Cập nhật tab active theo pathname hiện tại
    const currentPath = location.pathname;
    const matchedTab = tabs.find(t => t.getAttribute('href') === currentPath) || tabs[0];
    tabs.forEach(t => t.classList.toggle('active', t === matchedTab));
    updateDroplet(matchedTab);

    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        droplet.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.3s ease';
        updateDroplet(tab);
      });
    });

    let isDragging = false;
    let lastTab = matchedTab;

    tabBar.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      const targetTab = e.target.closest('.tab-btn');
      if (targetTab) {
        tabs.forEach(t => t.classList.remove('active'));
        targetTab.classList.add('active');
        lastTab = targetTab;
      }
      isDragging = true;
      droplet.style.transition = 'none';
    });

    window.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      const bRect = tabBar.getBoundingClientRect();
      const relX = Math.max(0, Math.min(bRect.width, e.clientX - bRect.left));

      let closestTab = tabs[0];
      let minDiff = Infinity;
      tabs.forEach(t => {
        const tRect = t.getBoundingClientRect();
        const center = tRect.left - bRect.left + tRect.width / 2;
        const diff = Math.abs(relX - center);
        if (diff < minDiff) { minDiff = diff; closestTab = t; }
      });

      if (closestTab !== lastTab) {
        tabs.forEach(t => t.classList.remove('active'));
        closestTab.classList.add('active');
        lastTab = closestTab;
        updateDroplet(closestTab);
      }
    });

    window.addEventListener('pointerup', () => {
      if (!isDragging) return;
      isDragging = false;
      droplet.style.transition = 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.25s ease';
      if (lastTab) {
        updateDroplet(lastTab);
        const href = lastTab.getAttribute('href');
        if (href && location.pathname !== href) {
          go(href);
        }
      }
    });
  }

  // 2. NÚT 3 CHẤM MENU TIỆN ÍCH MỞ RỘNG (CLICK BẤT KỲ ĐÂU ĐỀU MỞ)
  const originMorphIsland = document.getElementById('originMorphIsland');
  if (originMorphIsland && !originMorphIsland._bound) {
    originMorphIsland._bound = true;

    originMorphIsland.addEventListener('click', (e) => {
      if (e.target.closest('#morphCloseBtn')) {
        e.stopPropagation();
        originMorphIsland.classList.remove('expanded');
        return;
      }
      if (e.target.closest('.popover-item')) {
        // Cho phép click vào link chuyển trang, đóng menu
        originMorphIsland.classList.remove('expanded');
        return;
      }
      e.stopPropagation();
      originMorphIsland.classList.toggle('expanded');
    });

    document.addEventListener('click', (e) => {
      if (!originMorphIsland.contains(e.target)) {
        originMorphIsland.classList.remove('expanded');
      }
    });
  }
}

addEventListener('popstate', () => { route(); setTimeout(initCinemaUI, 60); });
route();
setTimeout(initCinemaUI, 100);
