export default async function handler(req, res) {
  // Hanya menerima POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  // Set CORS headers biar bisa diakses dari browser
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Panggil API TikWM (pakai fetch bawaan Node.js 18+, ga perlu axios)
    const params = new URLSearchParams();
    params.append('url', url);
    params.append('hd', '1');

    const response = await fetch('https://www.tikwm.com/api/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.tikwm.com/'
      },
      body: params.toString()
    });

    const data = await response.json();

    // Kirim balik response dari TikWM
    return res.status(200).json(data);

  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({ 
      error: 'Gagal mengambil data TikTok',
      code: 500
    });
  }
}
