/* Admin panel + overlay dữ liệu local (không quảng cáo, không cần token của site gốc) */
const K = {
  PIN: 'kp_admin_pin',
  TOKEN: 'kp_admin_token',
  EXP: 'kp_admin_token_exp',
  MOVIES: 'kp_local_movies',
  REVIEWS: 'kp_local_reviews',
  SEO: 'kp_seo_overrides',
  BANNER: 'kp_banner',
};

const read = (k, def) => { try { const v = JSON.parse(localStorage.getItem(k)); return v === null ? def : v; } catch { return def; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const hash = s => { let h = 5381; for (const c of String(s)) h = ((h << 5) + h + c.charCodeAt(0)) | 0; return 'h' + (h >>> 0).toString(36); };
const normSlug = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* ---------------- overlay API ---------------- */
export const localMovies = () => read(K.MOVIES, []);
export function saveLocalMovie(movie) {
  const list = localMovies().filter(m => m.slug !== movie.slug);
  list.unshift(movie);
  write(K.MOVIES, list.slice(0, 500));
  return movie;
}
export function deleteLocalMovie(slug) {
  write(K.MOVIES, localMovies().filter(m => m.slug !== slug));
}
export function findLocalMovie(slug) {
  const m = localMovies().find(x => x.slug === slug);
  if (!m) return null;
  const eps = (m.episodes || []).map((e, i) => ({
    num: i + 1, name: e.name || 'Tập ' + (i + 1),
    link: e.embed || e.m3u8 || '', embed: e.embed || '', m3u8: e.m3u8 || '',
  })).filter(e => e.link);
  return {
    movie: {
      ...m, id: 'local-' + m.slug, _local: true,
      episode_current: m.episode_current || (eps.length ? 'Tập ' + eps.length : ''),
      category: m.category || [], country: m.country || [], _epCount: eps.length,
    },
    servers: eps.length ? [{ name: 'Local', audio: '', eps }] : [],
  };
}
export const localReviews = slug => read(K.REVIEWS, {})[slug] || [];
export function addReview(slug, review) {
  const all = read(K.REVIEWS, {});
  all[slug] = [{ ...review, at: Date.now() }, ...(all[slug] || [])].slice(0, 100);
  write(K.REVIEWS, all);
}
export const allReviews = () => read(K.REVIEWS, {});
export const seoOverrides = () => read(K.SEO, {});
export function setSeoOverride(path, title, description) {
  const all = seoOverrides();
  if (!title && !description) delete all[path];
  else all[path] = { title, description };
  write(K.SEO, all);
}
export const bannerState = () => read(K.BANNER, { active: false, text: '', link: '' });

/* ---------------- auth ---------------- */
const pinSet = () => !!read(K.PIN, '');
const sessionValid = () => {
  const t = sessionStorage.getItem(K.TOKEN);
  const exp = Number(sessionStorage.getItem(K.EXP) || 0);
  return t && t === read(K.PIN, '') && Date.now() < exp;
};
const startSession = () => {
  sessionStorage.setItem(K.TOKEN, read(K.PIN, ''));
  sessionStorage.setItem(K.EXP, String(Date.now() + 8 * 3600 * 1000));
};
const endSession = () => { sessionStorage.removeItem(K.TOKEN); sessionStorage.removeItem(K.EXP); };

export const ADMIN_PAGES = {
  overview: 'Tổng quan', movies: 'Quản lý phim', 'add-movie': 'Thêm phim', reviews: 'Review',
  seo: 'SEO', banner: 'Banner', 'content-health': 'Sức khoẻ nội dung', 'sync-health': 'Đồng bộ',
  ping: 'Chẩn đoán', settings: 'Cài đặt',
};

/* ---------------- UI ---------------- */
export function adminPage(ctx) {
  const { app, section = 'overview', esc, setHead, api, num, loading, emptyBox, crumbs, SITE_NAME, TYPES, BASE, CARD_FIELDS, NEWEST } = ctx;

  setHead({
    title: `Admin · ${ADMIN_PAGES[section] || 'Tổng quan'} | ${SITE_NAME}`,
    description: 'Bảng quản trị cục bộ của bản clone.',
    path: '/admin/' + section,
    robots: 'noindex, nofollow',
  });

  const shell = (body) => {
    app.innerHTML = `<div class="pagehead">
      ${crumbs([{ text: 'Trang chủ', href: '/' }, { text: 'Admin' }, { text: ADMIN_PAGES[section] || 'Admin' }])}
      <h1>Admin · ${esc(ADMIN_PAGES[section] || 'Admin')}</h1>
      <p class="count">Quản trị cục bộ: ghi vào localStorage của trình duyệt. Không quảng cáo, không token site gốc.</p>
      <div class="filters">${Object.entries(ADMIN_PAGES).map(([s, n]) => `<a href="/admin/${s}"${s === section ? ' class="on"' : ''}>${n}</a>`).join('')}</div>
      ${sessionValid() ? `<a class="btn btn--ghost" style="margin-top:12px" href="#" id="adminLogout">Đăng xuất</a>` : ''}
    </div><section class="section" id="adminBody">${body}</section>`;
    document.getElementById('adminLogout')?.addEventListener('click', e => { e.preventDefault(); endSession(); adminPage(ctx); });
  };

  /* chưa có PIN → tạo */
  if (!pinSet()) {
    shell(`<div class="admin-card"><h2>Tạo PIN quản trị</h2>
      <p>PIN lưu dạng hash trong trình duyệt, dùng để mở khoá trang admin.</p>
      <form class="filterform" id="pinCreate">
        <input type="password" name="pin" placeholder="PIN mới (≥4 ký tự)" minlength="4" required>
        <input type="password" name="pin2" placeholder="Nhập lại PIN" minlength="4" required>
        <button class="btn btn--primary" type="submit">Tạo PIN</button>
      </form><p class="count" id="pinMsg"></p></div>`);
    document.getElementById('pinCreate').addEventListener('submit', e => {
      e.preventDefault();
      const f = e.target;
      if (f.pin.value.length < 4) { document.getElementById('pinMsg').textContent = 'PIN cần ≥ 4 ký tự.'; return; }
      if (f.pin.value !== f.pin2.value) { document.getElementById('pinMsg').textContent = 'PIN nhập lại không khớp.'; return; }
      write(K.PIN, hash(f.pin.value));
      startSession();
      adminPage(ctx);
    });
    return;
  }

  /* có PIN nhưng chưa đăng nhập */
  if (!sessionValid()) {
    shell(`<div class="admin-card"><h2>Đăng nhập admin</h2>
      <form class="filterform" id="pinLogin">
        <input type="password" name="pin" placeholder="Nhập PIN" required>
        <button class="btn btn--primary" type="submit">Mở khoá</button>
        <button class="btn btn--ghost" type="button" id="pinForgot">Quên PIN</button>
      </form><p class="count" id="pinMsg"></p></div>`);
    document.getElementById('pinLogin').addEventListener('submit', e => {
      e.preventDefault();
      if (hash(e.target.pin.value) !== read(K.PIN, '')) { document.getElementById('pinMsg').textContent = 'PIN sai.'; return; }
      startSession();
      adminPage(ctx);
    });
    document.getElementById('pinForgot').addEventListener('click', () => {
      if (!confirm('Xoá PIN để tạo lại? Dữ liệu phim/review local vẫn giữ.')) return;
      localStorage.removeItem(K.PIN);
      endSession();
      adminPage(ctx);
    });
    return;
  }

  const body = () => document.getElementById('adminBody');
  const flash = (msg, ok = true) => { const p = document.getElementById('adminMsg'); if (p) { p.textContent = msg; p.style.color = ok ? '#8fe6f2' : '#ff9a9a'; } };

  switch (section) {
    case 'overview': {
      shell(loading());
      (async () => {
        const countOf = async params => (await api('movies', { select: 'id', ...BASE, ...params }, { paged: true, per: 1 })).total;
        try {
          const [all, series, single, cartoon] = await Promise.all([
            countOf({}), countOf({ type: TYPES['phim-bo'] }), countOf({ type: TYPES['phim-le'] }), countOf({ type: TYPES['hoat-hinh'] }),
          ]);
          const stats = [
            ['Tổng phim (Supabase)', num(all)], ['Phim bộ', num(series)], ['Phim lẻ', num(single)], ['Hoạt hình', num(cartoon)],
            ['Phim local', num(localMovies().length)], ['Review local', num(Object.values(allReviews()).flat().length)],
            ['SEO override', num(Object.keys(seoOverrides()).length)], ['Banner', bannerState().active ? 'bật' : 'tắt'],
          ];
          body().innerHTML = `<div class="admin-grid">${stats.map(([k, v]) => `<div class="admin-card"><small>${k}</small><b>${v}</b></div>`).join('')}</div>
            <div class="btnrow"><a class="btn btn--primary" href="/admin/add-movie">Thêm phim</a><a class="btn btn--ghost" href="/admin/banner">Sửa banner</a><a class="btn btn--ghost" href="/admin/seo">SEO</a></div>`;
        } catch (e) {
          body().innerHTML = emptyBox('Supabase lỗi: ' + e.message);
        }
      })();
      break;
    }

    case 'movies':
    case 'add-movie': {
      const list = localMovies();
      shell(`<div class="admin-card">
        <h2>Phim local (${list.length})</h2>
        <p>Phim thêm tay hiển thị trong tìm kiếm và có trang riêng, ưu tiên trước khi Supabase lỗi.</p>
        <form class="admin-form" id="movieForm">
          <div class="row2">
            <label>Tên phim<input name="name" required></label>
            <label>Tên gốc<input name="origin_name"></label>
          </div>
          <div class="row2">
            <label>Slug (bỏ trống tự sinh)<input name="slug" placeholder="tu-dong"></label>
            <label>Năm<input name="year" type="number" value="2026"></label>
          </div>
          <div class="row2">
            <label>Loại<select name="type"><option value="series">Phim bộ</option><option value="single">Phim lẻ</option><option value="hoathinh">Hoạt hình</option></select></label>
            <label>Chất lượng<input name="quality" value="FHD"></label>
          </div>
          <div class="row2">
            <label>Ngôn ngữ<input name="lang" value="Vietsub"></label>
            <label>Tập hiện tại<input name="episode_current" placeholder="Tập 1"></label>
          </div>
          <label>Poster URL<input name="poster_url" placeholder="https://..."></label>
          <label>Mô tả<textarea name="content" rows="3"></textarea></label>
          <label>Tập — mỗi dòng: Tên|link embed|link m3u8 (2 link cuối có thể bỏ)<textarea name="episodes" rows="4" placeholder="Tập 01|https://player...|"></textarea></label>
          <div class="btnrow"><button class="btn btn--primary" type="submit">Lưu phim</button><button class="btn btn--ghost" type="reset">Xoá form</button></div>
          <p class="count" id="adminMsg"></p>
        </form>
      </div>
      <div class="admin-card"><h2>Danh sách</h2>
        ${list.length ? `<div class="hist">${list.map(m => `<div class="hist__row">
            <img src="${esc(m.poster_url || '')}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">
            <div><b>${esc(m.name)}</b><small>${esc(m.slug)} · ${esc(m.year || '')} · ${(m.episodes || []).length} tập</small></div>
            <a class="btn btn--ghost" href="/phim/${esc(m.slug)}">Xem</a>
            <button class="btn btn--ghost" type="button" data-edit="${esc(m.slug)}">Sửa</button>
            <button class="btn btn--ghost" type="button" data-del="${esc(m.slug)}">Xoá</button>
          </div>`).join('')}</div>` : emptyBox('Chưa có phim local.')}</div>`);
      document.getElementById('movieForm').addEventListener('submit', e => {
        e.preventDefault();
        const f = e.target;
        const episodes = f.episodes.value.split('\n').map(line => {
          const [name, embed, m3u8] = line.split('|').map(x => (x || '').trim());
          return name || embed ? { name: name || 'Tập', embed: embed || '', m3u8: m3u8 || '' } : null;
        }).filter(Boolean);
        const movie = {
          slug: normSlug(f.slug.value || f.name.value),
          name: f.name.value.trim(),
          origin_name: f.origin_name.value.trim(),
          year: Number(f.year.value) || new Date().getFullYear(),
          type: f.type.value,
          quality: f.quality.value.trim(),
          lang: f.lang.value.trim(),
          episode_current: f.episode_current.value.trim(),
          poster_url: f.poster_url.value.trim(),
          thumb_url: f.poster_url.value.trim(),
          content: f.content.value.trim(),
          episodes,
        };
        if (!movie.name || !movie.slug) { flash('Thiếu tên phim.', false); return; }
        saveLocalMovie(movie);
        adminPage(ctx);
      });
      body().querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
        if (!confirm('Xoá phim local ' + b.dataset.del + '?')) return;
        deleteLocalMovie(b.dataset.del);
        adminPage(ctx);
      }));
      body().querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => {
        const m = localMovies().find(x => x.slug === b.dataset.edit);
        const f = document.getElementById('movieForm');
        if (!m || !f) return;
        f.name.value = m.name; f.origin_name.value = m.origin_name || ''; f.slug.value = m.slug;
        f.year.value = m.year || ''; f.type.value = m.type || 'series'; f.quality.value = m.quality || '';
        f.lang.value = m.lang || ''; f.episode_current.value = m.episode_current || '';
        f.poster_url.value = m.poster_url || ''; f.content.value = m.content || '';
        f.episodes.value = (m.episodes || []).map(e => [e.name, e.embed, e.m3u8].join('|')).join('\n');
        f.scrollIntoView({ block: 'center' });
      }));
      break;
    }

    case 'reviews': {
      const all = allReviews();
      const total = Object.values(all).flat().length;
      shell(total
        ? `<div class="admin-card"><h2>Review local (${total})</h2><div class="hist">${Object.entries(all).map(([slug, arr]) => arr.map((r, i) => `<div class="hist__row">
            <div><b>${esc(r.name || 'Khách')} · ${'★'.repeat(Number(r.rating) || 0)}</b><small>${esc(slug)} · ${esc(r.text || '')}</small></div>
            <button class="btn btn--ghost" type="button" data-rslug="${esc(slug)}" data-ri="${i}">Xoá</button>
          </div>`).join('')).join('')}</div></div>`
        : emptyBox('Chưa có review. Gửi ở trang chi tiết phim.'));
      body().querySelectorAll('[data-rslug]').forEach(b => b.addEventListener('click', () => {
        const all2 = allReviews();
        all2[b.dataset.rslug].splice(Number(b.dataset.ri), 1);
        if (!all2[b.dataset.rslug].length) delete all2[b.dataset.rslug];
        write(K.REVIEWS, all2);
        adminPage(ctx);
      }));
      break;
    }

    case 'seo': {
      const overrides = seoOverrides();
      shell(`<div class="admin-card"><h2>SEO override</h2>
        <p>Ghi đè title/description theo đường dẫn, áp dụng ngay khi trang render.</p>
        <form class="admin-form" id="seoForm">
          <div class="row2"><label>Đường dẫn<input name="path" placeholder="/phim/abc" required></label><label>Title<input name="title"></label></div>
          <label>Description<textarea name="description" rows="2"></textarea></label>
          <div class="btnrow"><button class="btn btn--primary" type="submit">Lưu</button></div>
          <p class="count" id="adminMsg"></p>
        </form></div>
        <div class="admin-card"><h2>Đang áp dụng (${Object.keys(overrides).length})</h2>
        ${Object.keys(overrides).length ? `<div class="hist">${Object.entries(overrides).map(([p, v]) => `<div class="hist__row">
            <div><b>${esc(p)}</b><small>${esc(v.title || '(giữ title gốc)')} · ${esc(v.description || '')}</small></div>
            <button class="btn btn--ghost" type="button" data-seo="${esc(p)}">Xoá</button></div>`).join('')}</div>` : emptyBox('Chưa có override.')}</div>`);
      document.getElementById('seoForm').addEventListener('submit', e => {
        e.preventDefault();
        const f = e.target;
        setSeoOverride(f.path.value.trim(), f.title.value.trim(), f.description.value.trim());
        adminPage(ctx);
      });
      body().querySelectorAll('[data-seo]').forEach(b => b.addEventListener('click', () => {
        setSeoOverride(b.dataset.seo, '', '');
        adminPage(ctx);
      }));
      break;
    }

    case 'banner': {
      const b = bannerState();
      shell(`<div class="admin-card"><h2>Banner đầu trang</h2>
        <p>Không quảng cáo bên thứ ba — chỉ thông báo nội bộ của bạn.</p>
        <form class="admin-form" id="bannerForm">
          <label>Nội dung<input name="text" value="${esc(b.text || '')}" placeholder="Thông báo..."></label>
          <label>Link (tuỳ chọn)<input name="link" value="${esc(b.link || '')}" placeholder="/phim/abc"></label>
          <label class="inline"><input type="checkbox" name="active"${b.active ? ' checked' : ''}> Bật hiển thị</label>
          <div class="btnrow"><button class="btn btn--primary" type="submit">Lưu</button><button class="btn btn--ghost" type="button" id="bannerOff">Xoá banner</button></div>
          <p class="count" id="adminMsg"></p>
        </form>
        ${b.active && b.text ? `<div class="bannerprev">${esc(b.text)}</div>` : ''}</div>`);
      document.getElementById('bannerForm').addEventListener('submit', e => {
        e.preventDefault();
        const f = e.target;
        write(K.BANNER, { text: f.text.value.trim(), link: f.link.value.trim(), active: f.active.checked });
        adminPage(ctx);
      });
      document.getElementById('bannerOff').addEventListener('click', () => { write(K.BANNER, { text: '', link: '', active: false }); adminPage(ctx); });
      break;
    }

    case 'content-health': {
      shell(loading());
      api('movies', { ...BASE, select: CARD_FIELDS, or: '(poster_url.is.null,episode_current.is.null)', order: NEWEST, limit: 40 })
        .then(({ rows }) => {
          body().innerHTML = `<div class="admin-card"><h2>Thiếu poster / tập (${rows.length})</h2>
            ${rows.length ? `<div class="hist">${rows.map(m => `<a class="hist__row" href="/phim/${esc(m.slug)}"><img src="${esc(m.poster_url || '')}" alt="" onerror="this.style.visibility='hidden'"><div><b>${esc(m.name)}</b><small>${esc(m.episode_current || 'chưa có tập')} · ${m.poster_url ? 'có poster' : 'thiếu poster'}</small></div></a>`).join('')}</div>` : emptyBox('Không có bản ghi lỗi.')}</div>`;
        })
        .catch(e => { body().innerHTML = emptyBox('Lỗi: ' + e.message); });
      break;
    }

    case 'sync-health': {
      shell(loading());
      api('movies', { ...BASE, select: CARD_FIELDS + ',updated_at', order: 'updated_at.desc.nullslast', limit: 30 })
        .then(({ rows }) => {
          body().innerHTML = `<div class="admin-card"><h2>30 phim cập nhật gần nhất</h2><div class="hist">${rows.map(m => `<a class="hist__row" href="/phim/${esc(m.slug)}"><img src="${esc(m.poster_url || '')}" alt=""><div><b>${esc(m.name)}</b><small>${esc(new Date(m.updated_at).toLocaleString('vi-VN'))}</small></div></a>`).join('')}</div></div>`;
        })
        .catch(e => { body().innerHTML = emptyBox('Lỗi: ' + e.message); });
      break;
    }

    case 'ping': {
      shell(loading());
      (async () => {
        const t0 = performance.now();
        let ok = false, err = '';
        try { await api('movies', { select: 'id', limit: 1 }); ok = true; } catch (e) { err = e.message; }
        const ms = Math.round(performance.now() - t0);
        const bytes = Object.keys(localStorage).reduce((a, k) => a + (localStorage.getItem(k) || '').length, 0);
        body().innerHTML = `<div class="admin-card"><h2>Chẩn đoán</h2><div class="hist">
          <div class="hist__row"><div><b>Supabase REST</b><small>${ok ? 'OK' : 'FAIL ' + esc(err)} · ${ms} ms</small></div><span class="chip ${ok ? 'chip--cyan' : 'chip--red'}">${ok ? 'up' : 'down'}</span></div>
          <div class="hist__row"><div><b>localStorage</b><small>${Object.keys(localStorage).length} key · ${Math.round(bytes / 1024)} KB</small></div></div>
          <div class="hist__row"><div><b>Service worker</b><small>${'serviceWorker' in navigator ? (navigator.serviceWorker.controller ? 'đang điều khiển' : 'chưa active') : 'không hỗ trợ'}</small></div></div>
          <div class="hist__row"><div><b>Player</b><small>iframe embed + HLS native fallback</small></div></div>
        </div></div>`;
      })();
      break;
    }

    case 'settings': {
      shell(`<div class="admin-card"><h2>Đổi PIN</h2>
        <form class="filterform" id="pinChange">
          <input type="password" name="old" placeholder="PIN hiện tại" required>
          <input type="password" name="pin" placeholder="PIN mới" minlength="4" required>
          <button class="btn btn--primary" type="submit">Đổi</button>
        </form><p class="count" id="adminMsg"></p></div>
        <div class="admin-card"><h2>Sao lưu dữ liệu local</h2>
        <p>Xuất/nhập toàn bộ phim local, review, SEO override, banner.</p>
        <div class="btnrow">
          <button class="btn btn--ghost" type="button" id="expBtn">Xuất JSON</button>
          <button class="btn btn--ghost" type="button" id="impBtn">Nhập JSON</button>
          <button class="btn btn--ghost" type="button" id="clrBtn">Xoá dữ liệu local</button>
        </div>
        <textarea id="backupBox" rows="6" placeholder="Dán JSON để nhập..."></textarea></div>`);
      document.getElementById('pinChange').addEventListener('submit', e => {
        e.preventDefault();
        if (hash(e.target.old.value) !== read(K.PIN, '')) { document.getElementById('adminMsg').textContent = 'PIN hiện tại sai.'; return; }
        write(K.PIN, hash(e.target.pin.value));
        startSession();
        flash('Đã đổi PIN.');
      });
      document.getElementById('expBtn').addEventListener('click', () => {
        const dump = { movies: localMovies(), reviews: allReviews(), seo: seoOverrides(), banner: bannerState() };
        document.getElementById('backupBox').value = JSON.stringify(dump, null, 1);
      });
      document.getElementById('impBtn').addEventListener('click', () => {
        try {
          const j = JSON.parse(document.getElementById('backupBox').value || '{}');
          if (j.movies) write(K.MOVIES, j.movies);
          if (j.reviews) write(K.REVIEWS, j.reviews);
          if (j.seo) write(K.SEO, j.seo);
          if (j.banner) write(K.BANNER, j.banner);
          flash('Đã nhập dữ liệu.');
          adminPage(ctx);
        } catch { flash('JSON không hợp lệ.', false); }
      });
      document.getElementById('clrBtn').addEventListener('click', () => {
        if (!confirm('Xoá toàn bộ dữ liệu local (phim, review, SEO, banner)?')) return;
        [K.MOVIES, K.REVIEWS, K.SEO, K.BANNER].forEach(k => localStorage.removeItem(k));
        adminPage(ctx);
      });
      break;
    }

    default:
      shell(emptyBox('Không có trang này.'));
  }
  window.scrollTo(0, 0);
}
