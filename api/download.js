// api/download.js - Versi diperbaiki, multi-source fallback
import axios from "axios";
import * as cheerio from "cheerio";
import { guardRequest, signPayload } from "../lib/security.js";

const REQUEST_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (Chrome) Mobile Safari/537.36",
};

// ========== SUMBER #1: TIKWM (paling stabil, dipakai luas & gratis) ==========
async function ttdownFromTikwm(url) {
  const { data } = await axios.get("https://www.tikwm.com/api/", {
    params: { url, hd: 1 },
    timeout: 20000,
    headers: REQUEST_HEADERS,
  });

  if (data?.code !== 0 || !data?.data) {
    throw new Error(data?.msg || "TikWM response invalid");
  }

  const result = data.data;
  const downloads = [];

  if (result.play) {
    downloads.push({
      type: "nowatermark",
      label: "Video tanpa watermark",
      url: result.play.startsWith("http") ? result.play : `https://www.tikwm.com${result.play}`,
    });
  }

  if (result.hdplay) {
    downloads.push({
      type: "nowatermark_hd",
      label: "Video HD",
      url: result.hdplay.startsWith("http") ? result.hdplay : `https://www.tikwm.com${result.hdplay}`,
    });
  }

  if (result.music) {
    downloads.push({
      type: "mp3",
      label: "Audio MP3",
      url: result.music.startsWith("http") ? result.music : `https://www.tikwm.com${result.music}`,
    });
  }

  if (downloads.length === 0) {
    throw new Error("TikWM tidak mengembalikan link download");
  }

  return {
    title: result.title || "",
    author: result.author?.unique_id || result.author?.nickname || "",
    avatar: result.author?.avatar || result.author?.avatar_thumb || result.author?.avatar_larger || null,
    cover: result.cover || result.origin_cover || null,
    stats: {
      likes: result.digg_count ?? null,
      comments: result.comment_count ?? null,
      shares: result.share_count ?? null,
      plays: result.play_count ?? null,
    },
    downloads,
  };
}

// ========== SUMBER #2: YUULABS ==========
async function ttdownFromYuuLabs(url) {
  const YUULABS_API = "https://api.yuulabs.web.id/api/downloader/tiktok?url=";
  const { data } = await axios.get(`${YUULABS_API}${encodeURIComponent(url)}`, {
    timeout: 20000,
    headers: REQUEST_HEADERS,
  });

  if (!data?.status || !data?.result) {
    throw new Error(data?.message || "YuuLabs response invalid");
  }

  const result = data.result;
  const downloads = [];

  if (result.videoUrl) {
    downloads.push({ type: "nowatermark", label: "Video tanpa watermark", url: result.videoUrl });
  }
  if (result.hdVideo) {
    downloads.push({ type: "nowatermark_hd", label: "Video HD", url: result.hdVideo });
  }
  if (result.audioUrl) {
    downloads.push({ type: "mp3", label: "Audio MP3", url: result.audioUrl });
  }

  if (downloads.length === 0) {
    throw new Error("YuuLabs tidak mengembalikan link download");
  }

  return {
    title: result.description || "",
    author: result.author || "",
    avatar: result.avatar || result.authorAvatar || null,
    cover: result.cover || null,
    stats: null,
    downloads,
  };
}

// ========== SUMBER #3: MUSICALDOWN (scraping, fallback terakhir) ==========
async function ttdownFromMusicalDown(url) {
  const { data: html, headers } = await axios.get("https://musicaldown.com/en", {
    timeout: 20000,
    headers: REQUEST_HEADERS,
  });
  const $ = cheerio.load(html);

  const payload = {};
  $("#submit-form input").each((i, elem) => {
    const name = $(elem).attr("name");
    const value = $(elem).attr("value");
    if (name) payload[name] = value || "";
  });

  const urlField = Object.keys(payload).find((key) => !payload[key]);
  if (urlField) payload[urlField] = url;

  const cookieHeader = Array.isArray(headers["set-cookie"]) ? headers["set-cookie"].join("; ") : "";

  const { data } = await axios.post(
    "https://musicaldown.com/download",
    new URLSearchParams(payload).toString(),
    {
      timeout: 20000,
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
    downloads.push({ type, label, url: downloadUrl });
  });

  if (downloads.length === 0) {
    throw new Error("MusicalDown tidak mengembalikan link download");
  }

  const avatarSrc = $$(".video-author img").attr("src") || null;

  return {
    title: $$(".video-desc").text().trim(),
    author: $$(".video-author b").text().trim(),
    avatar: avatarSrc,
    cover: coverMatch ? coverMatch[1] : null,
    stats: null,
    downloads,
  };
}

// ========== PEMILIH KUALITAS TERBAIK (HD, tanpa watermark) ==========
function pickBest(downloads, kind) {
  const list = downloads || [];
  const norm = (s) => (s || "").toString().toLowerCase();
  const isAudioLike = (d) => /mp3|audio|music|sound/.test(norm(d.type) + " " + norm(d.label));

  if (kind === "audio") {
    const candidates = list.filter(isAudioLike);
    return candidates[0] || null;
  }

  // video: beri skor, paling tinggi menang
  const candidates = list
    .filter((d) => !isAudioLike(d))
    .map((d) => {
      const t = norm(d.type) + " " + norm(d.label);
      let score = 0;
      if (/\bhd\b|1080|720|high/.test(t)) score += 4;
      if (/no.?watermark|nowm|original|tanpa.?watermark/.test(t)) score += 3;
      if (/\bwatermark\b/.test(t) && !/no.?watermark|tanpa.?watermark/.test(t)) score -= 6;
      return { d, score };
    })
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.d || list[0] || null;
}

// ========== FUNGSI UTAMA: coba tiap sumber berurutan ==========
async function ttdown(url) {
  if (!url.includes("tiktok.com")) throw new Error("URL bukan link TikTok yang valid.");

  const sources = [
    { name: "TikWM", fn: ttdownFromTikwm },
    { name: "YuuLabs", fn: ttdownFromYuuLabs },
    { name: "MusicalDown", fn: ttdownFromMusicalDown },
  ];

  let lastError = null;
  for (const source of sources) {
    try {
      return await source.fn(url);
    } catch (error) {
      lastError = error;
      console.log(`${source.name} gagal: ${error.message}`);
    }
  }

  throw new Error(lastError?.message || "Semua sumber download gagal diakses");
}

// ========== HANDLER UNTUK VERCEL ==========
export default async function handler(req, res) {
  // Set CORS headers (lengkap, termasuk untuk preflight JSON POST)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method harus POST" });
  }

  const guard = guardRequest(req);
  if (!guard.ok) {
    return res.status(403).json({ success: false, message: guard.reason });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const { url, mode } = body || {};
  if (!url || typeof url !== "string") {
    return res.status(400).json({ success: false, message: "URL tidak boleh kosong" });
  }

  try {
    const result = await ttdown(url.trim());

    const chosen = pickBest(result.downloads, mode === "audio" ? "audio" : "video");
    const downloadUrl = chosen?.url || result.downloads[0]?.url || null;

    if (!downloadUrl) {
      throw new Error("Tidak ada link download yang ditemukan");
    }

    const qualityLabel =
      mode === "audio"
        ? "Audio original — kualitas terbaik"
        : chosen?.type && /hd/.test(chosen.type.toLowerCase())
        ? "Video HD tanpa watermark"
        : "Video tanpa watermark — kualitas terbaik yang tersedia";

    const safeName =
      "vortex_" + (result.author || "tiktok").toString().replace(/[^a-z0-9_-]/gi, "") + "_" + Date.now();

    // URL CDN asli TIDAK pernah dikirim ke client — hanya token bertanda-tangan yang bisa
    // dibuka oleh /api/save milik kita sendiri, dan hanya berlaku 5 menit.
    const token = signPayload({
      url: downloadUrl,
      kind: mode === "audio" ? "audio" : "video",
      filename: safeName,
    });

    return res.status(200).json({
      success: true,
      token,
      title: result.title || "TikTok",
      author: result.author || "TikTok User",
      avatar: result.avatar || "",
      thumbnail: result.cover || "",
      stats: result.stats || null,
      quality_label: qualityLabel,
      mode: mode || "video",
    });
  } catch (error) {
    console.error("Error:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Gagal memproses video. Coba URL lain atau coba lagi nanti.",
    });
  }
}
