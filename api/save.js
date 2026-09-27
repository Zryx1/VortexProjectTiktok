// api/save.js - Proxy streaming: hanya menerima token bertanda-tangan (bukan URL bebas),
// jadi tidak bisa dipakai sebagai open-proxy dan tidak bisa "dicopy" langsung lewat wget/curl.
import axios from "axios";
import { guardRequest, verifyToken } from "../lib/security.js";

const REQUEST_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (Chrome) Mobile Safari/537.36",
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method harus GET" });
  }

  // blokir tool CLI/bot (wget, curl, python-requests, dll) + wajib berasal dari halaman sendiri
  const guard = guardRequest(req);
  if (!guard.ok) {
    return res.status(403).json({ success: false, message: guard.reason });
  }

  const { token, mode } = req.query || {};
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(403).json({ success: false, message: "Link kedaluwarsa atau tidak valid. Proses ulang tautannya." });
  }

  const isAudio = payload.kind === "audio";
  const ext = isAudio ? "mp3" : "mp4";
  const safeName = (payload.filename || "vortex-tiktok").replace(/[^a-z0-9_-]/gi, "_") + "." + ext;
  const asAttachment = mode === "download";

  try {
    const upstream = await axios.get(payload.url, {
      responseType: "stream",
      timeout: 60000,
      headers: REQUEST_HEADERS,
      maxRedirects: 5,
    });

    res.setHeader("Content-Type", isAudio ? "audio/mpeg" : "video/mp4");
    res.setHeader("Content-Disposition", `${asAttachment ? "attachment" : "inline"}; filename="${safeName}"`);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
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
