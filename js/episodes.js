/**
 * episodes.js — Fetch recent episodes from YouTube via Netlify function
 * and render them into the episode grid.
 */
(function () {
  "use strict";

  const GRID_ID = "episodes-grid";
  const YOUTUBE_CHANNEL = "https://www.youtube.com/@questioneverythingetp"; // TODO: confirm handle

  async function loadEpisodes() {
    const grid = document.getElementById(GRID_ID);
    if (!grid) return;

    try {
      const res = await fetch("/.netlify/functions/youtube-feed");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (!data.episodes || data.episodes.length === 0) {
        showFallback(grid);
        return;
      }

      grid.innerHTML = data.episodes
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
