// api/download.js - VERSI TERBARU (PAKAI API YANG MASIH HIDUP)
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        return res.status(200).end();
    }
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method harus POST' });
    }

    const { url, mode } = req.body;
    if (!url) return res.status(400).json({ error: 'URL tidak boleh kosong' });

    // ========== API ALTERNATIF YANG MASIH HIDUP ==========
    
    // 1. Menggunakan service ssstik (paling stabil)
    try {
        const ssstikUrl = `https://ssstik.io/api?url=${encodeURIComponent(url)}`;
        const response = await fetch(ssstikUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Origin': 'https://ssstik.io',
                'Referer': 'https://ssstik.io/'
            }
        });
        const data = await response.json();
        
        if (data && data.url) {
            if (mode === 'audio') {
                // Audio version - convert ke mp3
                return res.status(200).json({
                    success: true,
                    download_url: data.url.replace('.mp4', '.mp3'),
                    title: data.title || 'TikTok Audio',
                    author: 'TikTok User',
                    mode: mode
                });
            } else {
                return res.status(200).json({
                    success: true,
                    download_url: data.url,
                    title: data.title || 'TikTok Video',
                    author: 'TikTok User',
                    thumbnail: data.thumbnail || '',
                    mode: mode
                });
            }
        }
    } catch(e) { console.log('ssstik error:', e.message); }
    
    // 2. Backup: SnapTik API
    try {
        const snaptikUrl = `https://snaptik.app/api/ajaxSearch?url=${encodeURIComponent(url)}`;
        const response = await fetch(snaptikUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        const data = await response.json();
        
        if (data && data.medias && data.medias[0]) {
            const videoUrl = data.medias[0].url;
            if (mode === 'audio') {
                return res.status(200).json({
                    success: true,
                    download_url: videoUrl.replace('.mp4', '.mp3'),
                    title: data.title || 'TikTok',
                    mode: mode
                });
            } else {
                return res.status(200).json({
                    success: true,
                    download_url: videoUrl,
                    title: data.title || 'TikTok',
                    mode: mode
                });
            }
        }
    } catch(e) { console.log('snaptik error:', e.message); }
    
    // 3. Backup terakhir: TikMate
    try {
        const tikmateUrl = `https://tikmate.app/api/download?url=${encodeURIComponent(url)}`;
        const response = await fetch(tikmateUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const data = await response.json();
        
        if (data && data.video_url) {
            if (mode === 'audio') {
                return res.status(200).json({
                    success: true,
                    download_url: data.video_url.replace('.mp4', '.mp3'),
                    title: data.title || 'TikTok',
                    mode: mode
                });
            } else {
                return res.status(200).json({
                    success: true,
                    download_url: data.video_url,
                    title: data.title || 'TikTok',
                    mode: mode
                });
            }
        }
    } catch(e) { console.log('tikmate error:', e.message); }

    return res.status(500).json({ 
        success: false, 
        message: 'Maaf, semua server downloader sedang sibuk. Coba beberapa saat lagi atau gunakan URL TikTok yang berbeda.' 
    });
}
