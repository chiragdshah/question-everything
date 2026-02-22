# PRD: Question Everything Podcast Landing Page
*Version: 0.2 — Updated hero headline, newsletter name & cadence*
*Last updated: 2026-02-22*

---

## Overview

Build a one-page static HTML website for the **Question Everything** podcast, hosted at questioneverythingetp.com and deployed on Netlify.

The site is a **central hub**, not a content destination. Its sole job is to orient a new visitor, establish credibility, and direct them onward to listen (Spotify/Apple), watch (YouTube), or read (Substack newsletter). Everything else is noise.

---

## Background & Positioning

**Question Everything** is a philosophy-of-life podcast that deliberates, examines, and explores what a well-lived life consists of across diverse perspectives. Hosted by Chirag Shah and Sunay Shah (co-hosts since the show's founding, lifelong friends who met in a NYU chemistry lab).

The show's founding philosophy: *"An unexamined life is not worth living."* (Socrates)

The show is Socratic in method — the hosts ask, they don't answer. We speak with people about their deliberate choices, exploring the true intent behind their decisions, especially those involving the rejection of conventional paths, and the acceptance of real tradeoffs.

**Distribution:**
- Audio: Spotify, Apple Podcasts (RSS via Spotify for Creators)
- Video: YouTube ("Question Everything ETP" channel)
- Written: Substack newsletter (monthly, treated as near-separate product — "The Examined Life")
- Social: LinkedIn (company page + personal)

---

## Goals

1. Give new visitors a clear, fast orientation to the show
2. Drive conversions to Spotify/Apple (listen), YouTube (watch), and Substack (read)
3. Actively solicit guest pitches from qualified candidates
4. Reflect the show's intellectual tone and visual identity — nothing generic

---

## Non-Goals

- This is NOT a blog or content hub — no articles, no episode archive page
- Do NOT link to external social platforms in the hero — save for footer/find us section
- Do NOT use stock photography of people talking, microphones, or generic podcast imagery
- Do NOT use startup-style design patterns (gradients, animations for their own sake, hero videos)

---

## Brand & Design System

### Colors
| Token | Hex |
|-------|-----|
| Primary Orange | `#FA7017` |
| Dark Navy | `#04344f` |
| White | `#ffffff` |

### Typography
| Use | Font | Weight |
|-----|------|--------|
| Display / Headlines | Oswald (Google Fonts) | Regular (400) |
| Body | Inter (Google Fonts) | Medium (500) |
| Bold emphasis | Inter | ExtraBold (800) |

### Design Principles
- **Dark-first:** Navy (#04344f) is the dominant background color
- **Typographic-led:** Oswald for all headlines; Inter for all body copy
- **Restrained:** No gradients, no decorative animations, no clutter
- **Orange as accent only:** CTAs, hover states, link underlines, subtle motifs — never overused
- **The question mark as motif:** Can appear subtly in section dividers, favicon, or decorative elements

### Logo Assets
Logo files will be provided separately. Variants available:
- `logo-color-transparent.png` — Orange mic on dark backgrounds
- `logo-color-inverted-transparent.png` — Navy mic on white backgrounds
- `logo-white-transparent.png` — White mic on non-navy dark backgrounds
- `logo-symbol-transparent.png` — Icon only (favicon)
- SVG versions of all of the above

### Mood Reference (conceptual, not to copy)
- Aeon Essays — intellectual without being academic
- The Browser — curated, confident, no noise
- Substack dark mode — familiar to the target audience

---

## Page Structure

### Section 1 — Hero

**Purpose:** Stop the visitor, orient them, give them one action.

**Content:**
- Logo (top-left or centered)
- Headline: *"An unexamined life is not worth living."* — Socrates
- Subhead: *Deliberate, examine, and explore what a well-lived life consists of across diverse perspectives.*
- Two CTAs:
  - Primary: "Listen on Spotify" → [Spotify URL]
  - Secondary: "Watch on YouTube" → [YouTube channel URL]

**Visual:**
- Full-width, dark navy background
- Orange accent on headline or logo
- No hero image — let the typography carry the section

---

### Section 2 — What This Is

**Purpose:** In 3–4 sentences, tell the right person this show is for them.

**Suggested copy direction (to be written/refined):**
> Most podcasts celebrate people who made it. We talk to the ones who made a different call — and paid for it.
>
> Question Everything is a Socratic conversation. We don't give answers. We find people who gave up something real — prestige, money, a path everyone expected them to take — and we ask them everything about what that choice actually meant.
>
> If you've ever made a tradeoff you're still thinking about, this show is for you.

**Tone:** Plain, direct, never preachy. Feels like a letter to the right listener, not a press release.

---

### Section 3 — Recent Episodes

**Purpose:** Prove the show exists and is worth listening to. Social proof through content.

**Content:**
- 3–6 episode cards
- Each card: thumbnail image, episode title, guest name, 1-sentence tease
- "See all episodes" link → YouTube channel or Spotify

**Episode data source:** TBD
- **Option A (RSS — recommended for MVP):** Parse the Spotify for Creators RSS feed. No auth required. Pull title, description, episode number. Thumbnails may need to come from a separate source or be hardcoded.
- **Option B (YouTube API):** Richer metadata (view counts, YouTube thumbnails). Requires API key + quota management. Better for v2.

**For MVP:** Hardcode 3–6 episodes. Update manually when needed. Revisit dynamic loading in v2.

---

### Section 4 — Newsletter CTA

**Purpose:** Position the Substack newsletter as a distinct product — not just a link in the footer.

**Treatment:** Full-width section with its own background (could be white or a lighter navy variant to break the page rhythm). Feels like a separate offer.

**Suggested copy direction:**
> **The Examined Life**
>
> A monthly curated letter — the links, ideas, and questions Chirag and Sunay are actually sending each other. Philosophy, tradeoffs, and the questions worth asking. Free. On Substack.
>
> [Subscribe] → [Substack URL]

**Note:** The newsletter is monthly and named *The Examined Life*. It is adjacent to but distinct from the podcast. The CTA should reflect that it's worth subscribing to on its own terms.

---

### Section 5 — The Hosts

**Purpose:** Give the show a human face. Make visitors feel like they know who they're listening to.

**Content:**
- Chirag Shah — photo + 2–3 sentences
- Sunay Shah — photo + 2–3 sentences
- Origin note: the NYU chemistry lab story earns a brief mention — it explains why two people from seemingly different trajectories ended up co-hosting a philosophy podcast

**Photos:** Candid/editorial preferred over headshots. Use retro-futuristic thumbnail rendering style. Will be provided.

**Bio copy:** To be written. Tone: curious humans, not credentials. No titles. No "X years of experience."

---

### Section 6 — Be a Guest

**Purpose:** Actively solicit guest pitches while filtering for the right kind of person.

**Content:**
> We're looking for people who made a deliberate choice — who walked away from something most people wouldn't, and who have something genuine to say about what it cost them. Not heroes. Not success stories. People with something real to examine.
>
> If that's you (or someone you know), we'd love to hear from you.
>
> [Get in touch] → mailto:[Zoho email address]

**Note:** This is a filter, not a wide net. The copy should make it clear that we're selective, not collecting warm bodies.

---

### Section 7 — Find Us

**Purpose:** Clean distribution links with no clutter.

**Content — icon row with labels:**
- Spotify
- Apple Podcasts
- YouTube
- Substack

**Treatment:** Simple icon grid, white on navy. No paragraph copy needed here.

---

### Section 8 — Footer

**Content:**
- questioneverythingetp.com wordmark or logo
- LinkedIn links (company page + Chirag personal)
- Copyright line: © 2026 Question Everything
- Optional: "Built with [tool]" — only if tasteful

---

## Headline (Locked)

**Headline:**
> *"An unexamined life is not worth living."* — Socrates

**Subhead:**
> *Deliberate, examine, and explore what a well-lived life consists of across diverse perspectives.*

---

## Technical Specifications

| Spec | Detail |
|------|--------|
| Build | Static HTML + CSS (no framework required) |
| Hosting | Netlify |
| Deployment | Git-connected CI/CD or drag-and-drop |
| Fonts | Google Fonts (Oswald + Inter) — loaded via `<link>` |
| Episode data (MVP) | Hardcoded HTML |
| Episode data (v2) | RSS feed parse or YouTube Data API v3 |
| Images | Logo SVGs + PNG thumbnails + host photos (provided externally) |
| Performance target | Lighthouse score 95+ |

---

## Open Items Before Build

- [ ] **Substack URL** — needed for newsletter CTA and Find Us section
- [ ] **Spotify show URL** — needed for Listen CTA
- [ ] **Apple Podcasts URL** — needed for Find Us section
- [ ] **YouTube channel URL** — needed for Watch CTA and Find Us section
- [ ] **Zoho guest pitch email** — needed for Be a Guest CTA
- [ ] **Host photos** — candid/editorial, dark or neutral backgrounds
- [ ] **Bio copy** — Chirag + Sunay, 2–3 sentences each
- [ ] **Episode data (MVP)** — confirm 3–6 episodes to hardcode with title, guest, tease, thumbnail
- [ ] **LinkedIn URLs** — company page + Chirag personal for footer

---

## Out of Scope (v1)

- Contact form (use mailto link instead)
- Episode archive / full episode listing page
- Search functionality
- CMS or dynamic content management
- Analytics beyond basic Netlify analytics
- Multi-page navigation

---

## Success Criteria

The site is done when:
1. All 8 sections are complete and render correctly on mobile + desktop
2. All CTA links are live and tested
3. Logo renders correctly on dark background
4. Fonts load from Google Fonts without flash
5. Lighthouse performance score is 95+
6. Deployed and live on Netlify at questioneverythingetp.com
