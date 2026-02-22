# Question Everything — Website Strategy
*Last updated: 2026-02-22 (updated hero headline, newsletter cadence & name)*

## What the Site Is For

questioneverythingetp.com is the central hub for the podcast — not a content destination. Substack hosts the written newsletter. YouTube hosts the video. The website holds the identity: it's where strangers land, orient, and get sent onward.

**The job of the page:** Stop a curious person, make them understand the show in under 60 seconds, and direct them to subscribe/listen/watch.

---

## Strategic Constraints

- **Tone:** Intellectually curious, accessible, questioning — never preachy or clickbait
- **Avoid:** Over-promising, jargon, fake controversy, current-events references that date quickly
- **Audience:** People already asking big questions about meaning, purpose, and the tradeoffs of modern life — not mass market
- **Newsletter:** Treated as a near-separate product with its own prominent CTA, not a footnote

---

## Brand Assets

| Asset | Value |
|-------|-------|
| Primary Orange | #FA7017 |
| Dark Navy | #04344f |
| White | #ffffff |
| Display Font | Oswald Regular (400) |
| Body Font | Inter Medium (500) / Bold (800) |
| Logo files | `content/question-everything/assets/` — color, inverted, white, icon-only (PNG + SVG) |

---

## Page Structure (8 Sections)

| # | Section | Job |
|---|---------|-----|
| 1 | **Hero** | Stop + orient. Headline, subhead, two CTAs (Listen / Watch) |
| 2 | **What This Is** | 3–4 sentences: cost of choice, Socratic method, who the guests are |
| 3 | **Recent Episodes** | 3–6 cards: thumbnail, title, guest, 1-sentence tease. Proof of concept. |
| 4 | **Newsletter CTA** | Distinct block — "The written companion." Weekly Substack. Its own product. |
| 5 | **The Hosts** | Chirag + Sunay. Candid photos, 2–3 sentences each. NYU origin story. |
| 6 | **Be a Guest** | Who we're looking for. CTA to email. Filter, not a wide net. |
| 7 | **Find Us** | Icon row: Spotify, Apple Podcasts, YouTube, Substack |
| 8 | **Footer** | LinkedIn links, copyright, domain |

---

## Aesthetic Direction

**Overall feel:** Dark-first, typographic-led, restrained. Nothing glossy. Nothing startup-ish.

- Navy (#04344f) as dominant background
- Orange (#FA7017) for CTAs, hover states, accents — not overused
- Oswald for all display/headline text
- Inter for body copy
- The question mark as a subtle design motif (section dividers, favicon)
- No decorative stock imagery — episode thumbnails + candid host photos only

**Mood references (conceptual):**
- Aeon Essays — intellectual without being academic
- The Browser — curated, confident, no noise
- Substack dark mode — familiar to the target audience
- NOT: glossy podcast network sites, startup landing pages, anything trying too hard

---

## Hero Headline

**Headline (Socrates quote):**
> *"An unexamined life is not worth living."* — Socrates

**Subhead:**
> *Deliberate, examine, and explore what a well-lived life consists of across diverse perspectives.*

---

## The Newsletter

### What It Is

A monthly shared curation from both hosts — the links, ideas, and questions Chirag and Sunay are actually sending each other. MVP format: simple, honest, two-person reading list with brief commentary. No production overhead.

**Source material:** The "?E! Links" Gmail thread — the ongoing back-and-forth between Chirag and Sunay throughout the week. Whatever they're reading, watching, thinking about. That thread *is* the newsletter, just not yet formatted.

**Voice:** Both hosts. Not one polished writer — two friends sharing what's worth their time and why. Commentary can be brief ("this is the question I couldn't stop thinking about") or absent if the link speaks for itself.

**Cadence:** Monthly. Not tied to episode drops — stands on its own.

### MVP Format

```
[Newsletter Name] // [Date]

This week, Chirag and Sunay have been reading, watching, and arguing about:

---

[Link title](URL)
[1–3 sentence take. Optional.]

[Link title](URL)
[1–3 sentence take. Optional.]

[3–6 more links]

---

See you next week.
— Chirag & Sunay
```

### Name
**The Examined Life**

---

## Technical Decisions

| Decision | Choice |
|----------|--------|
| Hosting | Netlify |
| Build | Static HTML |
| Episode data | TBD — RSS feed (MVP) or YouTube API (v2) |
| Guest pitches | Active solicitation via site |

---

## Open Items

### Website
- [ ] Chirag + Sunay to decide on hero headline (Finalist A vs. B)
- [ ] Decide: RSS feed vs. YouTube API for episode cards
- [ ] Source candid host photos for Hosts section — use thumbnail rendering style (retro-futuristic)
- [ ] Confirm Substack URL + Spotify/Apple Podcasts links for CTAs

### Newsletter
- [ ] Confirm cadence: monthly regardless of episode drops?
- [ ] Decide: does each link include a byline ("via Chirag" / "via Sunay")? Or merged voice?
- [ ] Set up Substack newsletter (separate from podcast Substack, or same publication?)
- [ ] First issue: what week do we want to launch?
