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

const resVideo = document.getElementById("resVideo");
const videoWrap = document.getElementById("videoWrap");
const videoAvatar = document.getElementById("videoAvatar");
const videoAvatarPh = document.getElementById("videoAvatarPh");
const videoAvatarName = document.getElementById("videoAvatarName");
const audioPlayer = document.getElementById("audioPlayer");
const resAudio = document.getElementById("resAudio");
const audioCover = document.getElementById("audioCover");
const audioCoverPh = document.getElementById("audioCoverPh");
const audioPlayBtn = document.getElementById("audioPlayBtn");
const audioBar = document.getElementById("audioBar");
const audioProgressTrack = document.getElementById("audioProgressTrack");
const audioCur = document.getElementById("audioCur");
const audioDur = document.getElementById("audioDur");

function formatTime(sec) {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function renderResult(data) {
  document.getElementById("resTitle").textContent = data.title || "TikTok";
  document.getElementById("resAuthorText").textContent = "@" + (data.author || "tiktok");

  const img = document.getElementById("resThumb");
  const icon = document.getElementById("thumbIcon");
  const thumbSrc = data.thumbnail || data.avatar || "";
  if (thumbSrc) {
    img.onerror = () => { img.style.display = "none"; icon.style.display = "block"; };
    img.src = thumbSrc;
    img.style.display = "block";
    icon.style.display = "none";
  } else {
    img.style.display = "none";
    icon.style.display = "block";
  }

  const likes = formatNum(data.stats?.likes);
  const comments = formatNum(data.stats?.comments);
  document.getElementById("statLikes").querySelector("b").textContent = likes ?? "—";
  document.getElementById("statComments").querySelector("b").textContent = comments ?? "—";
  document.getElementById("statLikes").style.display = likes ? "flex" : "none";
  document.getElementById("statComments").style.display = comments ? "flex" : "none";

  // ---------- preview yang bisa diputar langsung ----------
  const previewUrl = data.preview_url || data.download_url || "";
  resAudio.pause();
  resAudio.removeAttribute("src");
  resVideo.pause();
  resVideo.removeAttribute("src");
  audioPlayBtn.classList.remove("playing");
  audioBar.style.width = "0%";

  if (state.mode === "audio") {
    videoWrap.style.display = "none";
    audioPlayer.style.display = "flex";
    if (previewUrl) resAudio.src = previewUrl;

    if (data.avatar) {
      audioCover.onerror = () => { audioCover.style.display = "none"; audioCoverPh.style.display = "block"; };
      audioCover.src = data.avatar;
      audioCover.style.display = "block";
      audioCoverPh.style.display = "none";
    } else {
      audioCover.style.display = "none";
      audioCoverPh.style.display = "block";
    }
  } else {
    audioPlayer.style.display = "none";
    videoWrap.style.display = "block";
    if (previewUrl) resVideo.src = previewUrl;
    if (data.thumbnail) resVideo.poster = data.thumbnail;

    videoAvatarName.textContent = "@" + (data.author || "tiktok");
    if (data.avatar) {
      videoAvatar.onerror = () => { videoAvatar.style.display = "none"; videoAvatarPh.style.display = "block"; };
      videoAvatar.src = data.avatar;
      videoAvatar.style.display = "block";
      videoAvatarPh.style.display = "none";
    } else {
      videoAvatar.style.display = "none";
      videoAvatarPh.style.display = "block";
    }
  }

  document.getElementById("qualityText").textContent =
    data.quality_label || (state.mode === "audio" ? "Audio — kualitas terbaik" : "HD — kualitas terbaik");

  dlBtn.dataset.url = data.download_url || "";
  dlBtn.dataset.filename = `vortex_${(data.author || "tiktok").replace(/[^a-z0-9_-]/gi, "")}_${Date.now()}`;
  dlBtn.querySelector(".dltext").textContent =
    state.mode === "audio" ? "Unduh Audio (MP3)" : "Unduh Video (HD)";
  dlBtn.classList.remove("loading", "done");
}

// ---------- kontrol player audio custom (cover = foto profil akun) ----------
audioPlayBtn.addEventListener("click", () => {
  if (!resAudio.src) return;
  if (resAudio.paused) {
    resAudio.play().catch(() => {});
  } else {
    resAudio.pause();
  }
});
const audioCoverWrap = document.querySelector(".audio-cover-wrap");
resAudio.addEventListener("play", () => { audioPlayBtn.classList.add("playing"); audioCoverWrap.classList.add("playing"); });
resAudio.addEventListener("pause", () => { audioPlayBtn.classList.remove("playing"); audioCoverWrap.classList.remove("playing"); });
resAudio.addEventListener("ended", () => { audioPlayBtn.classList.remove("playing"); audioCoverWrap.classList.remove("playing"); });
resAudio.addEventListener("loadedmetadata", () => {
  audioDur.textContent = formatTime(resAudio.duration);
});
resAudio.addEventListener("timeupdate", () => {
  if (resAudio.duration) {
    audioBar.style.width = (resAudio.currentTime / resAudio.duration) * 100 + "%";
  }
  audioCur.textContent = formatTime(resAudio.currentTime);
});
audioProgressTrack.addEventListener("click", (e) => {
  if (!resAudio.duration) return;
  const rect = audioProgressTrack.getBoundingClientRect();
  const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
  resAudio.currentTime = ratio * resAudio.duration;
});

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

// ---------- tombol unduh: langsung simpan file ke folder Download ----------
dlBtn.addEventListener("click", () => {
  if (dlBtn.classList.contains("loading") || dlBtn.classList.contains("done")) return;
  const url = dlBtn.dataset.url;
  if (!url) return;

  const dltext = dlBtn.querySelector(".dltext");
  const originalText = dltext.textContent;

  dlBtn.classList.add("loading");
  dltext.textContent = "Mengunduh...";

  const params = new URLSearchParams({
    url,
    filename: dlBtn.dataset.filename || "vortex-tiktok",
    type: state.mode,
  });

  // arahkan ke proxy /api/save agar browser langsung menyimpan file (bukan buka tab baru)
  const a = document.createElement("a");
  a.href = `/api/save?${params.toString()}`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => {
    dlBtn.classList.remove("loading");
    dlBtn.classList.add("done");
    dltext.textContent = "Tersimpan";
    setTimeout(() => {
      dlBtn.classList.remove("done");
      dltext.textContent = originalText;
    }, 1700);
  }, 900);
});

// ---------- submit via keyboard "Enter" ----------
urlInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") cta.click();
});
