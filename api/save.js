// api/save.js - Proxy unduhan langsung (memaksa file tersimpan ke folder Download)
import axios from "axios";

const REQUEST_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (Chrome) Mobile Safari/537.36",
};

function sanitizeFilename(name) {
  return (name || "vortex-tiktok")
    .toString()
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 60) || "vortex-tiktok";
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method harus GET" });
  }

  const { url, filename, type } = req.query || {};
  if (!url || typeof url !== "string") {
    return res.status(400).json({ success: false, message: "URL file kosong" });
  }

  const isAudio = type === "audio";
  const ext = isAudio ? "mp3" : "mp4";
  const safeName = sanitizeFilename(filename) + "." + ext;

  try {
    const upstream = await axios.get(url, {
      responseType: "stream",
      timeout: 60000,
      headers: REQUEST_HEADERS,
      maxRedirects: 5,
    });

    res.setHeader("Content-Type", isAudio ? "audio/mpeg" : "video/mp4");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);
    if (upstream.headers["content-length"]) {
      res.setHeader("Content-Length", upstream.headers["content-length"]);
    }

    upstream.data.pipe(res);
    upstream.data.on("error", () => {
      if (!res.headersSent) res.status(500).end();
      else res.end();
    });
  } catch (error) {
    console.error("Save proxy error:", error.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Gagal mengunduh file, coba lagi." });
    } else {
      res.end();
    }
  }
}
