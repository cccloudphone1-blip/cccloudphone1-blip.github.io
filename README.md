# KhoPhim Clone

**Chạy thử:** https://cracksteam456.github.io/ (bản deploy từ repo này, tự cập nhật mỗi lần push)

Bản clone giao diện + chức năng của `khophim.org`, viết bằng **HTML/CSS/JS thuần** — không build tool, không dependency, không framework.

Dữ liệu lấy trực tiếp từ Supabase public catalog của site gốc (publishable key, chỉ đọc).

---

## Chạy local

```bash
node serve.js 5173
# mở http://localhost:5173
```

Không cần `npm install`. `serve.js` là static server 0-dependency, có fallback SPA (mọi route lạ trả `index.html`).

---

## Tính năng

**Đọc dữ liệu**
- 27.400+ phim, 600.000+ tập từ Supabase (REST + publishable key)
- Trang chủ: hero slider, Top 10 đánh giá cao, Xem tiếp, tabs quốc gia, phim mới / bộ / lẻ / hoạt hình / Việt Nam / chiếu rạp / có trailer
- Danh sách, thể loại (34), quốc gia (31), landing SEO (~70), tìm kiếm, lọc nâng cao (sort theo mới nhất / điểm / **lượt xem** / tên)
- Nút **"Tải thêm"** + tự nạp khi cuộn tới cuối ở mọi trang danh sách
- Chi tiết phim, diễn viên, lịch phát sóng, sitemap
- **Blog thật**: 114 bài giới thiệu/đánh giá phim lấy từ bảng `movie_reviews`, phân trang, JSON-LD `Article`; mỗi bài tự gắn khối "Giới thiệu phim" trong trang chi tiết
- Chip **IMDb** (2.500+ phim), **ngày chiếu rạp**, thông báo phim, lượt xem

**Player**
- Ưu tiên phát **m3u8 trực tiếp** bằng hls.js (không quảng cáo, có thanh điều khiển riêng: tốc độ 0.5×–2×, phụ đề, ảnh trong ảnh); lỗi thì tự rơi về iframe wrapper rồi mới nhảy nguồn
- 3 tầng dự phòng: HLS native → iframe wrapper (`player.phimapi.com`) → iframe embed gốc
- Gộp `movie_episodes` + bảng `streams` (priority / playback_score / health_status)
- Tự phát hiện nguồn chết: host trả 404 hoặc chặn nhúng (`X-Frame-Options`, `frame-ancestors`) → tự nhảy server khác, **giữ đúng số tập**
- Tập / server lỗi được đánh dấu ⚠, có nút "Thử nguồn khác" và "Thử lại tất cả"
- Preview thumbnail tập khi rê chuột (6.000+ tập có ảnh)

**Khác**
- SEO: title/description/canonical/OG/Twitter + JSON-LD (WebSite, ItemList, Movie, TVSeries, BreadcrumbList), `robots.txt`, `sitemap.xml`, noindex cho trang riêng tư
- PWA: `sw.js` cache app shell, `site.webmanifest`
- Yêu thích / lịch sử xem / xem tiếp: localStorage
- Bình luận theo phim, theo dõi phim, thông báo tập mới, báo lỗi nguồn phát — đều lưu `localStorage`, cùng cơ chế site gốc (`khophim_comments_*`, `kp_followed_movies`, `kp_episode_notifications`)
- Trailer xem trong modal (YouTube/Vimeo, tự chuyển link watch → embed), chia sẻ link phim, phím `/` focus ô tìm kiếm
- Admin local (`/admin/overview`): PIN, thêm-sửa-xoá phim tay, review, SEO override, banner, chẩn đoán, backup JSON — tất cả trong `localStorage`, không ghi lên Supabase

---

## Cấu trúc

```
index.html            # shell: nav, footer, banner slot
assets/app.js         # router, Supabase client, card/hero/detail/watch/list, player, SEO
assets/admin.js       # admin panel + overlay dữ liệu local
assets/style.css      # design tokens + component
brand/                # logo, favicon, icon PWA   ← brand của khophim.org, xem mục Bản quyền
sw.js                 # service worker
serve.js              # static server (dev + self-host)
gen-sitemap.js        # sinh sitemap.xml từ Supabase
robots.txt / sitemap.xml / site.webmanifest
```

Router dùng `pushState`. Thêm route mới: sửa `route()` trong `assets/app.js`.

Route đã có: `/phim-moi`, `/phim-<quốc-gia>`, `/xem-phim-<quốc-gia>`, `/xem/:slug` (alias của `/xem-phim/:slug`, giữ `?sv=&ep=`), `/review-phim/:slug` (bài review, không có thì về trang phim).
Sitemap chia 3 file: `sitemap-movies.xml`, `sitemap-reviews.xml`, `sitemap-static.xml` + `sitemap.xml` làm index.

---

## Deploy

Yêu cầu duy nhất: **host tĩnh có SPA fallback** (mọi path → `index.html`).

| Host | Cách làm |
|---|---|
| Netlify | Kéo repo vào, đã có `_redirects` + `netlify.toml`. Publish dir: `.` |
| Vercel | `vercel deploy`, đã có `vercel.json` |
| Cloudflare Pages | Framework preset: None, build command: trống, output: `/` (đã có `_redirects`) |
| VPS / máy riêng | `node serve.js 80` sau reverse proxy (nginx/caddy) |
| GitHub Pages | ✔ đang dùng: repo `cracksteam456.github.io` (user site → path tuyệt đối chạy đúng). Không có rewrite thật nên deep link trả **HTTP 404** rồi mới render `404.html` — người dùng vẫn vào được, nhưng bot/SEO sẽ thấy 404. Project page dưới `/ten-repo/` thì không dùng được vì path tuyệt đối |

Sau khi có domain, sinh lại sitemap:

```bash
node gen-sitemap.js https://domain-cua-ban.com 6000
```

---

## Giới hạn đã biết

- **Chỉ đọc** dữ liệu gốc. Muốn ghi (thêm phim, review, banner cho mọi người thấy) thì cần backend riêng — hiện admin chỉ lưu trong `localStorage` của từng trình duyệt.
- **Không có đăng nhập**: Google OAuth + đồng bộ `user_sync_items` chưa nối.
- **Không SSR**: bot chỉ nhận HTML shell, không có nội dung render sẵn.
- **Nguồn phim là CDN bên thứ ba.** Một số CDN (`*.phim1280.tv`, `*.kkphimplayer*.com`, `a.kvp726.com`) chặn IP datacenter / VPN / WARP → trả 404. Nếu xem bằng VPN/WARP, thêm split-tunnel exclude cho các host đó, hoặc dùng mạng dân dụng VN. Player tự nhảy sang nguồn khác khi gặp lỗi.
- `streamc.xyz`, `dailymotion.com`, `short.icu` chặn nhúng iframe → đã loại khỏi vòng chọn nguồn.

---

## Bản quyền & ghi công

- **Code trong repo này**: MIT (xem `LICENSE`).
- **Dữ liệu phim, tên/logo/thương hiệu KhoPhim**: thuộc `khophim.org`. Repo này chỉ dùng publishable key công khai của họ để đọc catalog.
- Nếu deploy công khai, nên **thay bộ nhận diện trong `brand/`** bằng logo của bạn và ghi rõ nguồn dữ liệu, tránh để người dùng nhầm là site chính thức.
- Không có quảng cáo, không có mã theo dõi của site gốc.
