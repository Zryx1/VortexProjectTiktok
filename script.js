/* ============================================================
   Vortex background — particles spiral inward continuously,
   speeding up while a request is being processed.
   ============================================================ */
(function vortexBackground() {
    const canvas = document.getElementById("vortexCanvas");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!canvas || reduceMotion) return;

    const ctx = canvas.getContext("2d");
    let w, h, cx, cy;
    let speedMult = 1;
    let targetMult = 1;

    function resize() {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
        cx = w / 2;
        cy = h * 0.32;
    }
    resize();
    window.addEventListener("resize", resize);

    const colors = ["139,92,246", "236,72,153", "53,230,214"];
    const COUNT = 70;
    const particles = [];

    function spawn(atEdge) {
        return {
            angle: Math.random() * Math.PI * 2,
            radius: atEdge ? Math.random() * 60 + 30 : Math.random() * Math.max(w, h) * 0.6 + 60,
            angularSpeed: (0.15 + Math.random() * 0.35) * (Math.random() < 0.5 ? 1 : -1),
            inSpeed: 18 + Math.random() * 30,
            size: 0.6 + Math.random() * 1.8,
            color: colors[Math.floor(Math.random() * colors.length)],
            opacity: 0.15 + Math.random() * 0.35
        };
    }
    for (let i = 0; i < COUNT; i++) particles.push(spawn(false));

    window.vortexSetWarp = function (on) {
        targetMult = on ? 3.2 : 1;
    };

    let lastT = performance.now();
    function frame(t) {
        const dt = Math.min((t - lastT) / 1000, 0.05);
        lastT = t;
        speedMult += (targetMult - speedMult) * 0.04;

        ctx.clearRect(0, 0, w, h);
        for (const p of particles) {
            p.angle += p.angularSpeed * dt * speedMult;
            p.radius -= p.inSpeed * dt * speedMult;
            if (p.radius < 4) Object.assign(p, spawn(true), { radius: Math.max(w, h) * 0.6 + 60 });

            const x = cx + Math.cos(p.angle) * p.radius;
            const y = cy + Math.sin(p.angle) * p.radius * 0.6;
            const fade = Math.min(1, p.radius / 120);
            ctx.beginPath();
            ctx.fillStyle = `rgba(${p.color}, ${p.opacity * fade})`;
            ctx.arc(x, y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
})();

/* ============================================================
   App logic
   ============================================================ */
let currentMode = "video";

const modeCardVideo = document.getElementById("modeCardVideo");
const modeCardAudio = document.getElementById("modeCardAudio");
const modeCards = [modeCardVideo, modeCardAudio];
const urlInput = document.getElementById("tiktokUrl");
const actionBtn = document.getElementById("actionBtn");
const loadingDiv = document.getElementById("loadingArea");
const resultDiv = document.getElementById("resultArea");
const portalRing = document.querySelector(".portal-ring");

const qualityModal = document.getElementById("qualityModal");
const modalThumb = document.getElementById("modalThumb");
const modalTitle = document.getElementById("modalTitle");
const optHD = document.getElementById("optHD");
const optNormal = document.getElementById("optNormal");
const modalClose = document.getElementById("modalClose");

modalClose.addEventListener("click", closeQualityModal);
qualityModal.addEventListener("click", (e) => { if (e.target === qualityModal) closeQualityModal(); });

function closeQualityModal() {
    qualityModal.classList.remove("show");
}

function setWarp(on) {
    if (portalRing) portalRing.classList.toggle("warp", on);
    if (window.vortexSetWarp) window.vortexSetWarp(on);
}

function extractVideoOptions(data) {
    const videoOptions = (data.all_downloads || []).filter(
        d => d.type === "nowatermark_hd" || d.type === "nowatermark"
    );
    if (videoOptions.length === 0) {
        videoOptions.push({ type: "nowatermark", label: "Video", url: data.download_url });
    }
    videoOptions.sort((a, b) => (a.type === "nowatermark_hd" ? -1 : 1) - (b.type === "nowatermark_hd" ? -1 : 1));
    return videoOptions;
}

function openQualityModal(data, videoOptions) {
    const title = data.title || "TikTok Video";
    modalThumb.src = data.thumbnail || "";
    modalThumb.style.display = data.thumbnail ? "block" : "none";
    modalTitle.textContent = title.substring(0, 70);

    const hdOption = videoOptions.find(v => v.type === "nowatermark_hd");
    const normalOption = videoOptions.find(v => v.type === "nowatermark") || videoOptions[0];

    optHD.style.display = hdOption ? "flex" : "none";
    optNormal.style.display = normalOption ? "flex" : "none";

    optHD.onclick = () => {
        closeQualityModal();
        showVideoResult(data, hdOption);
    };
    optNormal.onclick = () => {
        closeQualityModal();
        showVideoResult(data, normalOption);
    };

    qualityModal.classList.add("show");
}

function getDateStamp() {
    const d = new Date();
    return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;
}

async function triggerDownload(url, filename, btnEl) {
    const originalHTML = btnEl.innerHTML;
    btnEl.style.pointerEvents = "none";
    btnEl.style.opacity = "0.75";
    btnEl.innerHTML = '<svg class="icon spin"><use href="#icon-loader"></use></svg> Mengunduh...';

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Gagal mengambil file dari server");
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
    } catch (err) {
        window.open(url, "_blank");
    } finally {
        btnEl.innerHTML = originalHTML;
        btnEl.style.pointerEvents = "auto";
        btnEl.style.opacity = "1";
    }
}

function pad2(n) {
    return String(n).padStart(2, "0");
}

modeCards.forEach(card => {
    card.addEventListener("click", () => {
        modeCards.forEach(c => c.classList.remove("active"));
        card.classList.add("active");
        currentMode = card.getAttribute("data-mode");
        if (currentMode === "audio") {
            actionBtn.innerHTML = '<svg class="icon"><use href="#icon-music"></use></svg> Konversi MP3';
        } else {
            actionBtn.innerHTML = '<svg class="icon"><use href="#icon-sparkle"></use></svg> Proses';
        }
        resultDiv.innerHTML = "";
    });
});

actionBtn.addEventListener("click", async () => {
    const url = urlInput.value.trim();
    if (!url) {
        alert("Masukkan URL TikTok dulu!");
        return;
    }

    loadingDiv.style.display = "flex";
    resultDiv.innerHTML = "";
    setWarp(true);

    try {
        const response = await fetch("/api/download", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: url, mode: currentMode })
        });

        const data = await response.json();

        if (!data.success || !data.download_url) {
            throw new Error(data.message || "Gagal mengambil data dari server");
        }

        if (currentMode === "video") {
            const videoOptions = extractVideoOptions(data);
            if (videoOptions.length > 1) {
                openQualityModal(data, videoOptions);
            } else {
                showVideoResult(data, videoOptions[0]);
            }
        } else {
            showAudioResult(data);
        }
    } catch (err) {
        resultDiv.innerHTML = `<div class="cell error-cell"><div class="error-title"><svg class="icon"><use href="#icon-alert"></use></svg> Gagal</div>${err.message}<br>Coba URL lain atau cek koneksi</div>`;
    } finally {
        loadingDiv.style.display = "none";
        setWarp(false);
    }
});

function showVideoResult(data, chosenVideo) {
    const title = data.title || "TikTok Video";
    const author = data.author || "TikTok User";
    const avatar = data.thumbnail || "https://ui-avatars.com/api/?background=8b5cf6&color=fff&name=" + encodeURIComponent(author);
    const likes = formatCount(data.stats?.likes);
    const comments = formatCount(data.stats?.comments);
    const isHd = chosenVideo.type === "nowatermark_hd";

    let html = `
        <div class="cell cell-video">
            <video id="resultVideo" src="${chosenVideo.url}" controls autoplay loop playsinline poster="${data.thumbnail || ""}"></video>
        </div>
        <div class="cell cell-title">
            <div class="title-text">${escapeHtml(title.substring(0, 90))} <span class="hd-badge"><svg class="icon"><use href="${isHd ? "#icon-star" : "#icon-smartphone"}"></use></svg>${isHd ? "HD" : "Normal"}</span></div>
        </div>
        <div class="cell cell-author">
            <img class="author-avatar" src="${avatar}" onerror="this.src='https://ui-avatars.com/api/?background=8b5cf6&color=fff&name=?'">
            <div>
                <div class="author-name">@${escapeHtml(author)}</div>
                <div class="author-label">Creator</div>
            </div>
        </div>
        <div class="cell cell-stats">
            <div class="stat-item">
                <div class="num"><svg class="icon icon-fill"><use href="#icon-heart"></use></svg> ${likes}</div>
                <div class="lbl">Likes</div>
            </div>
            <div class="stat-item">
                <div class="num"><svg class="icon"><use href="#icon-message"></use></svg> ${comments}</div>
                <div class="lbl">Komentar</div>
            </div>
        </div>
        <div class="cell cell-download" id="downloadActions">
            <a class="btn-download video-btn" id="downloadLink" href="${chosenVideo.url}" download="video-${getDateStamp()}.mp4"><svg class="icon"><use href="#icon-download"></use></svg> Download Video (MP4)</a>
        </div>
    `;
    resultDiv.innerHTML = html;

    const downloadLink = document.getElementById("downloadLink");
    downloadLink.addEventListener("click", (e) => {
        e.preventDefault();
        triggerDownload(downloadLink.href, downloadLink.getAttribute("download"), downloadLink);
    });
}

function showAudioResult(data) {
    const audioUrl = data.download_url;
    const title = data.title || "TikTok Audio";
    const author = data.author || "TikTok Creator";

    let html = `
        <div class="cell cell-audio-avatar"><svg class="icon" style="width:1.6em;height:1.6em;color:#fff;"><use href="#icon-headphones"></use></svg></div>
        <div class="cell cell-audio-info">
            <div class="title-text">${escapeHtml(title.substring(0, 60))}</div>
            <div class="author-label-row"><svg class="icon"><use href="#icon-mic"></use></svg> @${escapeHtml(author)}</div>
            <audio controls src="${audioUrl}"></audio>
        </div>
        <div class="cell cell-download">
            <a class="btn-download audio-btn" id="downloadLinkAudio" href="${audioUrl}" download="audio-${getDateStamp()}.mp3"><svg class="icon"><use href="#icon-download"></use></svg> Download MP3 (Audio Only)</a>
        </div>
    `;
    resultDiv.innerHTML = html;

    const downloadLinkAudio = document.getElementById("downloadLinkAudio");
    downloadLinkAudio.addEventListener("click", (e) => {
        e.preventDefault();
        triggerDownload(downloadLinkAudio.href, downloadLinkAudio.getAttribute("download"), downloadLinkAudio);
    });
}

function formatCount(n) {
    if (n === null || n === undefined) return "?";
    n = Number(n);
    if (isNaN(n)) return "?";
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    return String(n);
}

function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>]/g, function (m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}
