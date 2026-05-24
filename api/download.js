// api/download.js
export default async function handler(req, res) {
    // 1. Biar gak kena Cors
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method salah' });

    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL kosong' });

    // 2. Daftar API TikTok yang masih mungkin idup
    const apis = [
        `https://tikdown.org/api/ajaxSearch?url=${encodeURIComponent(url)}`,
        `https://api.tikmate.app/api/lookup?url=${encodeURIComponent(url)}`,
        `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`
    ];

    for (let api of apis) {
        try {
            console.log(`Mencoba: ${api}`);
            const response = await fetch(api, {
                headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://google.com' }
            });
            const result = await response.json();
            
            // Parsing hasil
            let download_link = result.data?.play || result.videoUrl || result.images?.[0];
            if (download_link) {
                if (!download_link.startsWith('http')) download_link = 'https://www.tikwm.com' + download_link;
                return res.status(200).json({ 
                    success: true, 
                    download_link: download_link,
                    message: 'Berhasil ambil video!'
                });
            }
        } catch (e) { console.log(`Gagal: ${e.message}`); }
    }
    
    res.status(500).json({ error: 'Semua API gagal, coba lagi nanti' });
}
