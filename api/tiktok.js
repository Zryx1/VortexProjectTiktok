import axios from 'axios';

export default async function handler(req, res) {
  // Hanya menerima method POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    // Panggil API TikWM dari server (tidak kena CORS)
    const response = await axios.post('https://www.tikwm.com/api/', {}, {
      params: { url, count: 12, cursor: 0, web: 1, hd: 1 },
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': 'https://www.tikwm.com',
        'Referer': 'https://www.tikwm.com/'
      }
    });

    return res.status(200).json(response.data);
    
  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({ 
      error: 'Failed to fetch TikTok data',
      details: error.message 
    });
  }
}
