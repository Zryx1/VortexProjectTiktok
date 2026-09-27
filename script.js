// ============ Vortex — Downloader TikTok ============
const state = { mode: "video" };

const segVideo = document.getElementById("segVideo");
const segAudio = document.getElementById("segAudio");
const thumbToggle = document.getElementById("thumb");
const pasteBtn = document.getElementById("pasteBtn");
const urlInput = document.getElementById("urlInput");
const cta = document.getElementById("ctaBtn");
const ctaText = document.getElementById("ctaText");
const errorBox = document.getElementById("errorBox");
const result = document.getElementById("result");
const dlBtn = document.getElementById("dlBtn");

// ---------- toggle mode Video / MP3 ----------
segVideo.addEventListener("click", () => {
  state.mode = "video";
  segVideo.classList.add("on");
  segAudio.classList.remove("on");
  thumbToggle.style.transform = "translateX(0)";
});
segAudio.addEventListener("click", () => {
  state.mode = "audio";
  segAudio.classList.add("on");
  segVideo.classList.remove("on");
  thumbToggle.style.transform = "translateX(100%)";
});

// ---------- paste dari clipboard ----------
pasteBtn.addEventListener("click", async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (text) urlInput.value = text.trim();
  } catch (e) {
    /* clipboard tidak diizinkan browser — abaikan diam-diam */
  }
});

// ---------- helper ----------
function formatNum(n) {
  if (n == null) return null;
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.classList.add("show");
  setTimeout(() => errorBox.classList.remove("show"), 4500);
}

function shake(el) {
  el.classList.add("shake");
  setTimeout(() => el.classList.remove("shake"), 400);
}

function renderResult(data) {
  document.getElementById("resTitle").textContent = data.title || "TikTok";
  document.getElementById("resAuthor").textContent = "@" + (data.author || "tiktok");

  const img = document.getElementById("resThumb");
  const icon = document.getElementById("thumbIcon");
  if (data.thumbnail) {
    img.onerror = () => { img.style.display = "none"; icon.style.display = "block"; };
    img.src = data.thumbnail;
    img.style.display = "block";
    icon.style.display = "none";
  } else {
    img.style.display = "none";
    icon.style.display = "block";
  }

  const likes = formatNum(data.stats?.likes);
  const comments = formatNum(data.stats?.comments);
  const statsEl = document.getElementById("resStats");
  statsEl.innerHTML =
    (likes ? `<span><b>${likes}</b> suka</span>` : "") +
    (comments ? `<span><b>${comments}</b> komentar</span>` : "");

  dlBtn.dataset.url = data.download_url || "";
  dlBtn.querySelector(".dltext").textContent =
    state.mode === "audio" ? "Simpan Audio (MP3)" : "Simpan Video (HD)";
  dlBtn.classList.remove("loading", "done");
}

// ---------- proses tautan (panggil api/download.js yang asli) ----------
cta.addEventListener("click", async () => {
  const url = urlInput.value.trim();
  if (!url) { shake(urlInput); urlInput.focus(); return; }
  if (cta.classList.contains("loading")) return;

  cta.classList.add("loading");
  cta.disabled = true;
  ctaText.textContent = "Memproses...";
  result.classList.remove("show");
  errorBox.classList.remove("show");

  try {
    const res = await fetch("/api/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, mode: state.mode }),
    });
    const data = await res.json();

    if (!data.success) {
      throw new Error(data.message || "Gagal memproses tautan. Coba lagi.");
    }

    renderResult(data);
    result.classList.add("show");
  } catch (err) {
    showError(err.message || "Terjadi kesalahan, coba beberapa saat lagi.");
  } finally {
    cta.classList.remove("loading");
    cta.disabled = false;
    ctaText.textContent = "Proses tautan";
  }
});

// ---------- tombol simpan / download ----------
dlBtn.addEventListener("click", () => {
  if (dlBtn.classList.contains("loading") || dlBtn.classList.contains("done")) return;
  const url = dlBtn.dataset.url;
  if (!url) return;

  const dltext = dlBtn.querySelector(".dltext");
  const originalText = dltext.textContent;

  dlBtn.classList.add("loading");
  dltext.textContent = "Menyimpan...";

  // buka file hasil download di tab baru — user simpan manual (perilaku umum downloader)
  window.open(url, "_blank");

  setTimeout(() => {
    dlBtn.classList.remove("loading");
    dlBtn.classList.add("done");
    dltext.textContent = "Tersimpan";
    setTimeout(() => {
      dlBtn.classList.remove("done");
      dltext.textContent = originalText;
    }, 1700);
  }, 700);
});

// ---------- submit via keyboard "Enter" ----------
urlInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") cta.click();
});
