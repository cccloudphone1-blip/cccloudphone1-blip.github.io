/* Tạo sitemap.xml từ Supabase: trang tĩnh + landing + thể loại/quốc gia + phim mới nhất */
const fs = require('fs');
const SB = 'https://ceoxbhsdodllziyxmbqr.supabase.co';
const KEY = 'sb_publishable_Juh45t-R83dfgJI0O4_PQw_iYYoU-yh';
const BASE = (process.argv[2] || 'http://localhost:5173').replace(/\/$/, '');
const MAX = Number(process.argv[3] || 12000);

const STATIC = ['/', '/phim', '/phim-moi-cap-nhat', '/phim-bo', '/phim-le', '/hoat-hinh', '/anime', '/phim-chieu-rap',
  '/phim-thuyet-minh', '/phim-4k', '/phim-hoan-tat', '/phim-sap-chieu', '/phim-hay', '/phim-2026', '/phim-2025', '/phim-2024',
  '/dien-vien', '/loc-phim', '/tim-kiem', '/blog', '/about', '/policy', '/sitemap', '/lich-cua-toi', '/yeu-cau-phim'];

const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };

async function fetchPage(offset, size = 1000) {
  const url = `${SB}/rest/v1/movies?select=slug,updated_at&is_published=eq.true&order=published_at.desc.nullslast`;
  const res = await fetch(url, { headers: { ...H, Range: `${offset}-${offset + size - 1}` } });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

/* bài viết thật trong bảng movie_reviews */
async function fetchReviews() {
  const url = `${SB}/rest/v1/movie_reviews?select=slug,updated_at`;
  const res = await fetch(url, { headers: { ...H, Range: '0-1999' } });
  if (!res.ok) return [];
  return res.json();
}

(async () => {
  const urls = new Map();
  for (const p of STATIC) urls.set(BASE + p, null);

  try {
    const reviews = await fetchReviews();
    for (const r of reviews) urls.set(`${BASE}/blog/${r.slug}`, r.updated_at);
    console.log(`  blog: ${reviews.length}`);
  } catch {}

  let offset = 0;
  while (offset < MAX) {
    const rows = await fetchPage(offset);
    if (!rows.length) break;
    for (const m of rows) urls.set(`${BASE}/phim/${m.slug}`, m.updated_at);
    offset += rows.length;
    process.stdout.write(`  fetched ${offset}\n`);
  }

  const body = [...urls.entries()].map(([loc, lastmod]) =>
    `  <url><loc>${loc.replace(/&/g, '&amp;')}</loc>${lastmod ? `<lastmod>${String(lastmod).slice(0, 10)}</lastmod>` : ''}</url>`
  ).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  fs.writeFileSync(__dirname + '/sitemap.xml', xml, 'utf8');
  console.log('sitemap.xml:', urls.size, 'urls,', Math.round(xml.length / 1024), 'KB');
})();
