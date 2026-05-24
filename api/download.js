// api/download.js
export default async function handler(req, res) {
    // Izinkan akses dari website mana aja (biar gak kena CORS)
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

    try {
        // === PAKE SSSTIK.IO (Paling Stabil Saat Ini) ===
        const formData = new URLSearchParams();
        formData.append('url', url);
        formData.append('hd', '1'); // Minta kualitas HD

        const response = await fetch('https://ssstik.io/api', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Origin': 'https://ssstik.io',
                'Referer': 'https://ssstik.io/'
            },
            body: formData.toString()
        });

        const result = await response.json();

        if (result && result.url) {
            let downloadUrl = result.url;
            let title = result.title || 'TikTok Video';
            
            // Kalo mode minta audio (MP3), kita ganti ekstensinya atau pake link music
            if (mode === 'audio') {
                // Coba cari link musiknya, kalo ga ada ya pake video link diganti .mp3
                const musicUrl = downloadUrl.replace('.mp4', '.mp3');
                return res.status(200).json({
                    success: true,
                    download_url: musicUrl,
                    title: title,
                    author: 'TikToker',
                    mode: mode
                });
            } else {
                return res.status(200).json({
                    success: true,
                    download_url: downloadUrl,
                    title: title,
                    author: 'TikToker',
                    thumbnail: result.thumbnail || '',
                    mode: mode
                });
            }
        } else {
            throw new Error('Gagal mendapatkan link dari SSSTik');
        }

    } catch (error) {
        console.error('Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Gagal memproses video. Coba lagi nanti atau cek URL TikTok nya.'
        });
    }
}
