// lib/security.js — proteksi dasar: token bertanda-tangan + blokir tool non-browser (wget, curl, dll)
import crypto from "crypto";

// Set env var VORTEX_SECRET di Vercel (Project Settings > Environment Variables) untuk produksi.
const SECRET = process.env.VORTEX_SECRET || "vortex-tiktok-dev-secret-change-me";
const TOKEN_TTL_MS = 5 * 60 * 1000; // token link hanya berlaku 5 menit

// ---------- token bertanda-tangan (menyembunyikan URL CDN asli dari client) ----------
export function signPayload(payload) {
  const body = JSON.stringify({ ...payload, exp: Date.now() + TOKEN_TTL_MS });
  const b64 = Buffer.from(body).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(b64).digest("base64url");
  return `${b64}.${sig}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [b64, sig] = token.split(".");
  const expected = crypto.createHmac("sha256", SECRET).update(b64).digest("base64url");
  // perbandingan tahan timing-attack
  const a = Buffer.from(sig || "");
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(b64, "base64url").toString());
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

// ---------- blokir tool CLI / bot umum (wget, curl, python-requests, dll) ----------
const BLOCKED_UA = /wget|curl|python-requests|python-urllib|libwww-perl|go-http-client|httpclient|aiohttp|scrapy|axios\/|node-fetch|okhttp|postmanruntime|insomnia|java\/|ruby|phantomjs|headlesschrome|bot|spider|crawler/i;

// ---------- pastikan request datang dari halaman kita sendiri ----------
export function guardRequest(req) {
  const ua = req.headers["user-agent"] || "";
  if (!ua || BLOCKED_UA.test(ua)) {
    return { ok: false, reason: "Akses ditolak: klien tidak diizinkan." };
  }

  // Jika Referer/Origin ADA tapi mengarah ke domain lain, itu jelas mencurigakan (hotlink/scrape) → blokir.
  // Jika TIDAK ADA sama sekali (beberapa browser/WebView menghilangkannya saat memuat video/audio),
  // jangan blokir hanya karena itu — bisa mematikan pemutaran yang sah. UA blacklist di atas
  // sudah jadi lapisan utama untuk menahan wget/curl/dll.
  const referer = req.headers["referer"] || req.headers["origin"] || "";
  const host = req.headers["host"] || "";
  if (referer && host && !referer.includes(host)) {
    return { ok: false, reason: "Akses ditolak: permintaan harus berasal dari halaman Vortex." };
  }

  return { ok: true };
}
