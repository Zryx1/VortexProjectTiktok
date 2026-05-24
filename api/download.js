// api/download.js (Support Video & MP3)
export default async function handler(req, res) {
    // Biar bisa diakses dari mana aja
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        return res.status(200).end();
    }
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method harus POST' });
    }

    const { url, mode } = req.body;   // mode = "video" atau "audio"
    if (!url) return res.status(400).json({ error: 'URL tidak boleh kosong' });

    // Kumpulan API (endpoint) yang masih mungkin jalan
    const apiList = [
        // TikWM
        {
            endpoint: `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`,
            extractor: (json) => {
                const data = json.data;
                if (!data) return null;
                if (mode === 'audio') {
                    const musicUrl = data.music ? 'https://www.tikwm.com' + data.music : null;
                    return musicUrl;
                } else {
                    return data.play ? 'https://www.tikwm.com' + data.play : null;
                }
            },
            meta: (json) => ({
                title: json.data?.title,
                author: json.data?.author?.unique_id,
                thumbnail: json.data?.cover ? 'https://www.tikwm.com' + json.data.cover : null,
                stats: { likes: json.data?.digg_count, comments: json.data?.comment_count }
            })
        },
        // TikDown (alternatif)
        {
            endpoint: `https://tikdown.org/api/ajaxSearch?url=${encodeURIComponent(url)}`,
            extractor: (json) => {
                if (!json.data) return null;
                if (mode === 'audio') return json.data.music || null;
                return json.data.video || null;
            },
            meta: (json) => ({
                title: json.data?.title,
                author: json.data?.author,
                thumbnail: json.data?.cover,
                stats: { likes: json.data?.likes, comments: json.data?.comments }
            })
        }
    ];

    for (const api of apiList) {
        try {
            console.log(`Mencoba API: ${api.endpoint}`);
            const response = await fetch(api.endpoint, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': 'https://www.tiktok.com/'
                }
            });
            const result = await response.json();
            
            let downloadUrl = api.extractor(result);
            if (downloadUrl && typeof downloadUrl === 'string' && downloadUrl.startsWith('/')) {
                downloadUrl = 'https://www.tikwm.com' + downloadUrl;
            }
            
            if (downloadUrl && (downloadUrl.startsWith('http') || downloadUrl.startsWith('https'))) {
                const meta = api.meta(result);
                return res.status(200).json({
                    success: true,
                    download_url: downloadUrl,
                    title: meta.title || 'TikTok',
                    author: meta.author || 'TikTok User',
                    thumbnail: meta.thumbnail,
                    stats: meta.stats || {},
                    mode: mode
                });
            }
        } catch (e) {
            console.log(`API gagal: ${e.message}`);
        }
    }

    return res.status(500).json({ success: false, message: 'Semua API gagal, coba beberapa saat lagi.' });
}
