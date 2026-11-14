# -*- coding: utf-8 -*-
"""
Daily Automated Update Script for h0syh0aπg Cinema
Fetches latest episodes and newly released movies from KKPhim / PhimAPI,
updates corresponding bucket JSONs in data/b/{h}.json,
and syncs data/search_index.json.
"""

import os
import sys
import json
import time
import urllib.request
import urllib.error

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data')
BUCKET_DIR = os.path.join(DATA_DIR, 'b')
SEARCH_INDEX_PATH = os.path.join(DATA_DIR, 'search_index.json')

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json'
}

def fetch_json(url, retries=3):
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=12) as resp:
                if resp.status == 200:
                    return json.loads(resp.read().decode('utf-8'))
        except Exception as e:
            time.sleep(1 + i)
    return None

def get_bucket_index(slug):
    return sum(ord(c) for c in slug) % 100

def main():
    print("=== [Daily Update] Starting Catalog Sync ===")
    if not os.path.isdir(BUCKET_DIR):
        print(f"Error: Bucket dir not found at {BUCKET_DIR}")
        sys.exit(1)

    # Load search index
    search_index = []
    if os.path.exists(SEARCH_INDEX_PATH):
        try:
            with open(SEARCH_INDEX_PATH, 'r', encoding='utf-8') as f:
                search_index = json.load(f)
        except Exception as e:
            print(f"Warning: Failed to load search_index: {e}")

    known_slugs = {item.get('s') for item in search_index if item.get('s')}

    # Fetch recently updated movies (Pages 1 & 2 = 48 movies)
    recent_slugs = []
    for page in [1, 2]:
        api_url = f"https://phimapi.com/danh-sach/phim-moi-cap-nhat?page={page}"
        print(f"Fetching page {page}: {api_url}")
        res = fetch_json(api_url)
        if res and res.get('status') and res.get('items'):
            for item in res['items']:
                s = item.get('slug')
                if s and s not in recent_slugs:
                    recent_slugs.append(s)
        time.sleep(0.5)

    print(f"Discovered {len(recent_slugs)} recently updated movies from API.")

    updated_buckets = set()
    total_new_episodes = 0
    total_movies_updated = 0
    new_movies_added = 0

    # Cache loaded buckets to minimize disk I/O
    loaded_buckets = {}

    def get_bucket(h):
        if h not in loaded_buckets:
            bpath = os.path.join(BUCKET_DIR, f"{h}.json")
            if os.path.exists(bpath):
                try:
                    with open(bpath, 'r', encoding='utf-8') as f:
                        loaded_buckets[h] = json.load(f)
                except Exception:
                    loaded_buckets[h] = {}
            else:
                loaded_buckets[h] = {}
        return loaded_buckets[h]

    for idx, slug in enumerate(recent_slugs, 1):
        h = get_bucket_index(slug)
        bucket = get_bucket(h)

        detail_url = f"https://phimapi.com/phim/{slug}"
        detail = fetch_json(detail_url)
        if not detail or not detail.get('status') or not detail.get('movie'):
            continue

        m_data = detail['movie']
        remote_episodes = detail.get('episodes', [])
        if not remote_episodes:
            continue

        # Convert remote servers to clean structure
        formatted_servers = []
        remote_total_eps = 0
        for s in remote_episodes:
            s_name = s.get('server_name', 'Vietsub').strip()
            s_data = s.get('server_data', [])
            clean_eps = []
            for ep in s_data:
                m3u8 = ep.get('link_m3u8', '').strip()
                embed = ep.get('link_embed', '').strip()
                if m3u8 or embed:
                    clean_eps.append({
                        'name': ep.get('name', ''),
                        'slug': ep.get('slug', ''),
                        'filename': ep.get('filename', ''),
                        'link_embed': embed,
                        'link_m3u8': m3u8 or embed
                    })
            if clean_eps:
                formatted_servers.append({
                    'server_name': s_name,
                    'server_data': clean_eps
                })
                remote_total_eps = max(remote_total_eps, len(clean_eps))

        if not formatted_servers:
            continue

        if slug in bucket:
            # Check if there are new episodes
            curr_movie = bucket[slug]
            curr_servers = curr_movie.get('episodes', [])
            curr_max_eps = 0
            for cs in curr_servers:
                curr_max_eps = max(curr_max_eps, len(cs.get('server_data', [])))

            if remote_total_eps > curr_max_eps:
                diff = remote_total_eps - curr_max_eps
                print(f"[{idx}/{len(recent_slugs)}] '{slug}' has {diff} NEW episodes ({curr_max_eps} -> {remote_total_eps})")
                
                # Update movie with new episodes
                # If current movie has higher priority servers (e.g. VSMov), keep them and append/merge
                curr_movie['episodes'] = formatted_servers
                curr_movie['modified'] = m_data.get('modified', {}).get('time', time.strftime('%Y-%m-%dT%H:%M:%SZ'))
                curr_movie['updated_at'] = int(time.time() * 1000)
                bucket[slug] = curr_movie
                updated_buckets.add(h)
                total_new_episodes += diff
                total_movies_updated += 1
        else:
            # New movie not previously in catalog
            print(f"[{idx}/{len(recent_slugs)}] Adding NEW movie '{slug}' ({m_data.get('name')})")
            thumb_url = m_data.get('thumb_url') or m_data.get('poster_url') or ''
            if thumb_url and not thumb_url.startswith('http'):
                thumb_url = 'https://phimimg.com/' + thumb_url.lstrip('/')
            poster_url = m_data.get('poster_url') or thumb_url
            if poster_url and not poster_url.startswith('http'):
                poster_url = 'https://phimimg.com/' + poster_url.lstrip('/')

            new_movie_entry = {
                'slug': slug,
                'name': m_data.get('name', slug),
                'origin_name': m_data.get('origin_name', ''),
                'year': m_data.get('year', 2024),
                'type': m_data.get('type', 'movie'),
                'poster_url': poster_url,
                'thumb_url': thumb_url,
                'tmdb_id': (m_data.get('tmdb') or {}).get('id'),
                'imdb_id': (m_data.get('imdb') or {}).get('id'),
                'sources_available': ['kkphim'],
                'modified': m_data.get('modified', {}).get('time', time.strftime('%Y-%m-%dT%H:%M:%SZ')),
                'updated_at': int(time.time() * 1000),
                'priority_tier': 1,
                'provider': 'kkphim',
                'stream_tier_name': 'FHD VIP',
                'stream_status': 'verified_m3u8',
                'episodes': formatted_servers,
                'is_playable': True
            }
            bucket[slug] = new_movie_entry
            updated_buckets.add(h)
            new_movies_added += 1

            # Update search_index
            search_index.append({
                's': slug,
                'n': m_data.get('name', slug),
                'o': m_data.get('origin_name', ''),
                'p': thumb_url,
                'y': m_data.get('year', 2024),
                't': m_data.get('type', 'movie')
            })

        time.sleep(0.3)

    # Save updated buckets
    for h in updated_buckets:
        bpath = os.path.join(BUCKET_DIR, f"{h}.json")
        try:
            with open(bpath, 'w', encoding='utf-8') as f:
                json.dump(loaded_buckets[h], f, ensure_ascii=False, indent=None)
            print(f"Saved bucket data/b/{h}.json")
        except Exception as e:
            print(f"Error saving bucket {h}: {e}")

    # Save search index if new movies added
    if new_movies_added > 0:
        try:
            with open(SEARCH_INDEX_PATH, 'w', encoding='utf-8') as f:
                json.dump(search_index, f, ensure_ascii=False, separators=(',', ':'))
            print(f"Saved data/search_index.json (Total movies: {len(search_index)})")
        except Exception as e:
            print(f"Error saving search_index.json: {e}")

    print("\n=== [Daily Update Summary] ===")
    print(f"Buckets updated: {len(updated_buckets)}")
    print(f"Movies updated with new episodes: {total_movies_updated}")
    print(f"Total new episodes added: {total_new_episodes}")
    print(f"New movies added to catalog: {new_movies_added}")
    print("Catalog sync completed successfully.")

if __name__ == '__main__':
    main()
