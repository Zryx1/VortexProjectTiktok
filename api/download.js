// api/download.js - Versi Gabungan dengan tiktok.js
import axios from "axios";
import * as cheerio from "cheerio";

const YUULABS_API = "https://api.yuulabs.web.id/api/downloader/tiktok?url=";
const REQUEST_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (Chrome) Mobile Safari/537.36",
};

// ========== FUNGSI DARI YUULABS ==========
async function ttdownFromYuuLabs(url) {
  const { data } = await axios.get(`${YUULABS_API}${encodeURIComponent(url)}`, {
    timeout: 30000,
    headers: REQUEST_HEADERS,
  });

  if (!data?.status || !data?.result) {
    throw new Error(data?.message || "YuuLabs response invalid");
  }

  const result = data.result;
  const downloads = [];

  if (result.videoUrl) {
    downloads.push({
      type: "nowatermark",
      label: "Video tanpa watermark",
      url: result.videoUrl,
    });
  }

  if (result.hdVideo) {
    downloads.push({
      type: "nowatermark_hd",
      label: "Video HD",
      url: result.hdVideo,
    });
  }

  if (result.audioUrl) {
    downloads.push({
      type: "mp3",
      label: "Audio MP3",
      url: result.audioUrl,
    });
  }

  if (downloads.length === 0) {
    throw new Error("YuuLabs tidak mengembalikan link download");
  }

  return {
    title: result.description || "",
    author: result.author || "",
    cover: null,
    downloads,
  };
}

// ========== FUNGSI DARI MUSICALDOWN ==========
async function ttdownFromMusicalDown(url) {
  const { data: html, headers } = await axios.get(
    "https://musicaldown.com/en",
    {
      timeout: 30000,
      headers: REQUEST_HEADERS,
    }
  );
  const $ = cheerio.load(html);

  const payload = {};
  $("#submit-form input").each((i, elem) => {
    const name = $(elem).attr("name");
    const value = $(elem).attr("value");
    if (name) payload[name] = value || "";
  });

  const urlField = Object.keys(payload).find((key) => !payload[key]);
  if (urlField) payload[urlField] = url;

  const cookieHeader = Array.isArray(headers["set-cookie"])
    ? headers["set-cookie"].join("; ")
    : "";

  const { data } = await axios.post(
    "https://musicaldown.com/download",
    new URLSearchParams(payload).toString(),
    {
      timeout: 30000,
      headers: {
        ...REQUEST_HEADERS,
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        cookie: cookieHeader,
        origin: "https://musicaldown.com",
        referer: "https://musicaldown.com/",
      },
    }
  );

  const $$ = cheerio.load(data);
  const videoHeader = $$(".video-header");
  const bgImage = videoHeader.attr("style");
  const coverMatch = bgImage?.match(/url\((.*?)\)/);

  const downloads = [];
  $$("a.download").each((i, elem) => {
    const $elem = $$(elem);
    const type = $elem.data("event")?.replace("_download_click", "");
    const label = $elem.text().trim();
    const downloadUrl = $elem.attr("href");
    if (!downloadUrl) return;
    downloads.push({
      type,
      label,
      url: downloadUrl,
    });
  });

  if (downloads.length === 0) {
    throw new Error("MusicalDown tidak mengembalikan link download");
  }

  return {
    title: $$(".video-desc").text().trim(),
    author: $$(".video-author b").text().trim(),
    cover: coverMatch ? coverMatch[1] : null,
    downloads,
  };
}

// ========== FUNGSI UTAMA ==========
async function ttdown(url) {
  if (!url.includes("tiktok.com")) throw new Error("Invalid url.");
  try {
    return await ttdownFromYuuLabs(url);
  } catch (error) {
    console.log("YuuLabs gagal, mencoba MusicalDown...", error.message);
    return await ttdownFromMusicalDown(url);
  }
}

// ========== HANDLER UNTUK VERCEL ==========
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method harus POST' });
  }

  const { url, mode } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL tidak boleh kosong' });
  }

  try {
    const result = await ttdown(url);
    
    // Cari link yang sesuai dengan mode yang diminta
    let downloadUrl = null;
    let type = "";
    
    if (mode === "audio") {
      const audio = result.downloads.find(d => d.type === "mp3");
      if (audio) {
        downloadUrl = audio.url;
        type = "audio";
      }
    } else {
      // Mode video: cari HD dulu, baru no watermark
      const video = result.downloads.find(d => d.type === "nowatermark_hd") ||
                    result.downloads.find(d => d.type === "nowatermark");
      if (video) {
        downloadUrl = video.url;
        type = "video";
      }
    }
    
    if (!downloadUrl) {
      // Kalau ga nemu sesuai mode, ambil yang pertama aja
      downloadUrl = result.downloads[0]?.url;
    }
    
    if (!downloadUrl) {
      throw new Error("Tidak ada link download yang ditemukan");
    }
    
    return res.status(200).json({
      success: true,
      download_url: downloadUrl,
      title: result.title || "TikTok",
      author: result.author || "TikTok User",
      thumbnail: result.cover || "",
      all_downloads: result.downloads, // opsional: kasih semua pilihan
      mode: mode || "video"
    });
    
  } catch (error) {
    console.error("Error:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Gagal memproses video"
    });
  }
}
