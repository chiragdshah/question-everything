/**
 * episodes.js — Fetch recent episodes from YouTube via Netlify function
 * (production) or directly from YouTube RSS feed via CORS proxy (local dev),
 * and render them into the episode grid.
 */
(function () {
  "use strict";

  const GRID_ID = "episodes-grid";
  const YOUTUBE_CHANNEL = "https://www.youtube.com/@questioneverythingetp";
  const CHANNEL_ID = "UC2aiyplnabkJ7YzfWK1yISw";
  const MAX_EPISODES = 6;

  async function loadEpisodes() {
    const grid = document.getElementById(GRID_ID);
    if (!grid) return;

    try {
      // Try the Netlify function first (works in production)
      let episodes = await fetchFromNetlify();

      // If that fails, parse the YouTube RSS feed directly via CORS proxy
      if (!episodes || episodes.length === 0) {
        episodes = await fetchFromRSS();
      }

      if (!episodes || episodes.length === 0) {
        showFallback(grid);
        return;
      }

      grid.innerHTML = episodes
        .map(
          (ep) => `
        <a href="${ep.url}" target="_blank" rel="noopener noreferrer" class="episode-card">
          <img
            src="${ep.thumbnail}"
            alt="${escapeHtml(stripPrefix(ep.title))}"
            class="episode-card__thumb"
            loading="lazy"
            width="480"
            height="360"
          />
          <div class="episode-card__body">
            <h3 class="episode-card__title">${stripPrefix(ep.title)}</h3>
            <p class="episode-card__desc">${ep.description}</p>
          </div>
        </a>
      `
        )
        .join("");
    } catch (err) {
      console.error("Failed to load episodes:", err);
      showFallback(grid);
    }
  }

  /**
   * Fetch episodes from the Netlify serverless function.
   * Returns an array of episode objects, or null on failure.
   */
  async function fetchFromNetlify() {
    try {
      const res = await fetch("/.netlify/functions/youtube-feed");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.episodes && data.episodes.length > 0 ? data.episodes : null;
    } catch (err) {
      console.warn("Netlify function unavailable, trying RSS fallback…", err.message);
      return null;
    }
  }

  /**
   * Fetch and parse the YouTube RSS feed directly.
   * Uses multiple CORS proxy services as fallbacks.
   */
  async function fetchFromRSS() {
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
    const corsProxies = [
      (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    ];

    let xml = null;

    for (const proxyFn of corsProxies) {
      try {
        const proxyUrl = proxyFn(feedUrl);
        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        xml = await res.text();
        break;
      } catch (err) {
        console.warn("CORS proxy failed, trying next…", err.message);
      }
    }

    if (!xml) return null;

    return parseYouTubeRSS(xml);
  }

  /**
   * Parse YouTube RSS XML and extract episode data.
   * Filters out YouTube Shorts.
   */
  function parseYouTubeRSS(xml) {
    const entries = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;

    while ((match = entryRegex.exec(xml)) !== null && entries.length < MAX_EPISODES * 2) {
      const entry = match[1];

      // Extract video link to check if it's a short
      const linkMatch = entry.match(/<link rel="alternate" href="([^"]+)"\/>/);
      const url = linkMatch?.[1] || "";

      // Skip YouTube Shorts — only include full watch videos
      if (url.includes("/shorts/")) continue;

      const videoIdMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
      const titleMatch = entry.match(/<media:title>([^<]+)<\/media:title>/);
      const descMatch = entry.match(/<media:description>([\s\S]*?)<\/media:description>/);
      const pubMatch = entry.match(/<published>([^<]+)<\/published>/);

      if (videoIdMatch && titleMatch) {
        const videoId = videoIdMatch[1];
        const rawDesc = descMatch?.[1] || "";
        // Truncate description to first sentence or 200 chars
        const description =
          rawDesc.length > 200
            ? rawDesc.substring(0, 200).replace(/\s+\S*$/, "") + "…"
            : rawDesc;

        const decode = (s) =>
          s
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&#39;/g, "'");

        entries.push({
          title: decode(titleMatch[1]),
          videoId,
          thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          description: decode(description),
          published: pubMatch?.[1] || "",
          url: `https://www.youtube.com/watch?v=${videoId}`,
        });
      }

      if (entries.length >= MAX_EPISODES) break;
    }

    return entries.length > 0 ? entries : null;
  }

  function showFallback(grid) {
    grid.innerHTML = `
      <div class="episodes__loading">
        <p>Visit our YouTube channel to see the latest episodes.</p>
        <a href="${YOUTUBE_CHANNEL}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" style="margin-top: 1rem;">
          Watch on YouTube →
        </a>
      </div>
    `;
  }

  function stripPrefix(str) {
    // Strip "?E! #XX - " prefix
    return str.replace(/^\?E!?\s*#?\d*\s*[-–—]\s*/i, "");
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // Load on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadEpisodes);
  } else {
    loadEpisodes();
  }
})();
