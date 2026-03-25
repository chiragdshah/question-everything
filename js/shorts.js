/**
 * shorts.js — Fetch latest YouTube Shorts and render a horizontal carousel.
 * Clicking a thumbnail opens a fullscreen <dialog> lightbox with swipe-up/down
 * navigation between shorts (like YouTube Shorts / Instagram Reels).
 */
(function () {
  "use strict";

  const CAROUSEL_ID = "shorts-carousel";
  const MODAL_ID = "shorts-modal";
  const CHANNEL_ID = "UC2aiyplnabkJ7YzfWK1yISw";
  const UUSH_PLAYLIST_ID = "UUSH" + CHANNEL_ID.slice(2);
  const MAX_SHORTS = 8;

  // State
  let shortsData = [];
  let currentIndex = 0;
  let touchStartY = 0;
  let isAnimating = false;

  // ─── Load & Render ──────────────────────────────────────────────────────────

  async function loadShorts() {
    const carousel = document.getElementById(CAROUSEL_ID);
    if (!carousel) return;

    try {
      let shorts = await fetchFromNetlify();
      if (!shorts || shorts.length === 0) shorts = await fetchFromRSS();
      if (!shorts || shorts.length === 0) {
        carousel.closest("section").style.display = "none";
        return;
      }

      shortsData = shorts;
      renderCarousel(shorts, carousel);
    } catch (err) {
      console.error("Failed to load Shorts:", err);
      const section = document.getElementById(CAROUSEL_ID)?.closest("section");
      if (section) section.style.display = "none";
    }
  }

  function renderCarousel(shorts, carousel) {
    carousel.innerHTML = shorts
      .map(
        (s, i) => `
      <button class="short-card" data-index="${i}" aria-label="Play: ${escapeHtml(s.title)}">
        <div class="short-card__thumb-wrap">
          <img
            src="${s.thumbnail}"
            alt="${escapeHtml(s.title)}"
            class="short-card__thumb"
            loading="lazy"
            width="360"
            height="480"
          />
          <div class="short-card__play" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>
        <p class="short-card__title">${escapeHtml(s.title)}</p>
      </button>
    `
      )
      .join("");

    carousel.querySelectorAll(".short-card").forEach((card) => {
      card.addEventListener("click", () => openModal(parseInt(card.dataset.index, 10)));
    });
  }

  // ─── Modal ───────────────────────────────────────────────────────────────────

  function openModal(index) {
    currentIndex = index;
    const modal = document.getElementById(MODAL_ID);
    loadShortIntoModal(index);
    updateDots();
    modal.showModal();
    document.body.classList.add("modal-open");
  }

  function closeModal() {
    const modal = document.getElementById(MODAL_ID);
    const iframe = modal.querySelector("#shorts-iframe");
    modal.close();
    iframe.src = "";
    document.body.classList.remove("modal-open");
  }

  function loadShortIntoModal(index) {
    const iframe = document.getElementById("shorts-iframe");
    const s = shortsData[index];
    iframe.src = `https://www.youtube.com/embed/${s.videoId}?autoplay=1&rel=0&playsinline=1`;
  }

  // ─── Navigation ─────────────────────────────────────────────────────────────

  function navigateTo(newIndex, direction) {
    if (isAnimating) return;
    if (newIndex < 0 || newIndex >= shortsData.length) return;

    isAnimating = true;
    const frame = document.querySelector(".shorts-modal__frame");
    const slideOut = direction === "next" ? "slide-out-up" : "slide-out-down";
    const slideIn  = direction === "next" ? "slide-in-up"  : "slide-in-down";

    frame.classList.add(slideOut);

    setTimeout(() => {
      frame.classList.remove(slideOut);
      currentIndex = newIndex;
      loadShortIntoModal(newIndex);
      updateDots();
      frame.classList.add(slideIn);

      setTimeout(() => {
        frame.classList.remove(slideIn);
        isAnimating = false;
      }, 300);
    }, 200);
  }

  function goNext() { navigateTo(currentIndex + 1, "next"); }
  function goPrev() { navigateTo(currentIndex - 1, "prev"); }

  // ─── Dot indicator ───────────────────────────────────────────────────────────

  function updateDots() {
    const dotsContainer = document.getElementById("shorts-dots");
    if (!dotsContainer) return;

    dotsContainer.innerHTML = shortsData
      .map((_, i) => `<span class="shorts-dot${i === currentIndex ? " shorts-dot--active" : ""}"></span>`)
      .join("");
  }

  // ─── Touch / Swipe ───────────────────────────────────────────────────────────

  function initSwipe(modal) {
    modal.addEventListener("touchstart", (e) => {
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    modal.addEventListener("touchend", (e) => {
      const delta = touchStartY - e.changedTouches[0].clientY;
      if (Math.abs(delta) < 50) return; // ignore small movements
      if (delta > 0) goNext(); else goPrev();
    }, { passive: true });
  }

  // ─── Keyboard ────────────────────────────────────────────────────────────────

  function initKeyboard() {
    document.addEventListener("keydown", (e) => {
      const modal = document.getElementById(MODAL_ID);
      if (!modal.open) return;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); goNext(); }
      if (e.key === "ArrowUp"   || e.key === "ArrowLeft")  { e.preventDefault(); goPrev(); }
    });
  }

  // ─── Init ────────────────────────────────────────────────────────────────────

  function initModal() {
    const modal = document.getElementById(MODAL_ID);
    if (!modal) return;

    modal.querySelector("#shorts-modal-close").addEventListener("click", closeModal);
    modal.querySelector("#shorts-nav-prev").addEventListener("click", goPrev);
    modal.querySelector("#shorts-nav-next").addEventListener("click", goNext);

    // Click on backdrop closes the modal
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });

    // ESC key (native dialog behaviour) — clear iframe src
    modal.addEventListener("cancel", () => {
      document.getElementById("shorts-iframe").src = "";
      document.body.classList.remove("modal-open");
    });

    initSwipe(modal);
    initKeyboard();
  }

  // ─── Data fetching ───────────────────────────────────────────────────────────

  async function fetchFromNetlify() {
    try {
      const res = await fetch("/.netlify/functions/youtube-shorts");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.shorts && data.shorts.length > 0 ? data.shorts : null;
    } catch (err) {
      console.warn("Netlify shorts function unavailable, trying RSS fallback…", err.message);
      return null;
    }
  }

  async function fetchFromRSS() {
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${UUSH_PLAYLIST_ID}`;
    const corsProxies = [
      (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    ];

    let xml = null;
    for (const proxyFn of corsProxies) {
      try {
        const res = await fetch(proxyFn(feedUrl));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        xml = await res.text();
        break;
      } catch (err) {
        console.warn("CORS proxy failed, trying next…", err.message);
      }
    }

    if (!xml) return null;
    return parseRSS(xml);
  }

  function parseRSS(xml) {
    const entries = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;

    while ((match = entryRegex.exec(xml)) !== null && entries.length < MAX_SHORTS * 2) {
      const entry = match[1];
      const videoIdMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
      const titleMatch   = entry.match(/<media:title>([^<]+)<\/media:title>/);
      const pubMatch     = entry.match(/<published>([^<]+)<\/published>/);

      if (videoIdMatch && titleMatch) {
        const videoId = videoIdMatch[1];
        const decode = (s) =>
          s.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'");

        entries.push({
          title: decode(titleMatch[1]),
          videoId,
          thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          published: pubMatch?.[1] || "",
          url: `https://www.youtube.com/shorts/${videoId}`,
        });
      }

      if (entries.length >= MAX_SHORTS) break;
    }

    return entries.length > 0 ? entries : null;
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { initModal(); loadShorts(); });
  } else {
    initModal();
    loadShorts();
  }
})();
