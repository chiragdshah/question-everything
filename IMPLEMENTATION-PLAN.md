# "The Opening Question" — Guest Questionnaire Redesign

> Implementation spec for the Question Everything guest questionnaire redesign.
> Take this to Anti-Gravity and execute against the QE codebase.

---

## Context

The guest questionnaire (formerly "Guest Snapshot" at `/guest-snapshot`) was originally designed as a dual-purpose tool: prime guests for reflection AND evaluate fit via automated Claude scoring with tiers (Strong Fit / Worth Exploring / Likely Not a Fit).

The fundamental problem: by the time a guest gets this form, they're already confirmed. Scoring them is unnecessary and philosophically contradicts the podcast's own values — the Bible says "This is not a podcast about heroes, purity, or perfect answers." A scoring rubric that grades people on their philosophical depth is exactly the kind of judgment the show says it doesn't make.

**New purpose:** Renamed to **"The Opening Question"** and moved to `/opening-question`. The questionnaire becomes a pure **conversation prep tool** — it primes the guest for reflection and saves their responses to a shared Google Sheet. All synthesis happens downstream in `/pod-prep`, where Claude can see both web research and the guest's own words in one pass. The name positions the form as the start of the conversation, not a gate before it.

---

## Architecture (Before → After)

**Before:**
```
Guest submits → Netlify function → OpenRouter (Claude scoring) → Brevo email
/pod-prep → web research only → prep doc
(disconnected — questionnaire never feeds into prep)
```

**After:**
```
Guest submits → Netlify function → writes raw responses to Google Sheet → done
Google Sheet notification rule → emails you that a submission arrived
/pod-prep [name] → web research + reads questionnaire from Google Sheet → integrated prep doc
```

**What's eliminated:**
- OpenRouter API (no more Claude synthesis at submission time)
- Brevo API (Google Sheets built-in notifications replace it)
- Scoring rubric, tiers, composite scores, archetype classification
- All email HTML generation

**API keys reduced:** 3 (OpenRouter, Brevo, notification email) → 1 (Google service account for Sheets)

---

## Step 0: Backup Before Anything

Copy the existing files to preserve the original scoring-based design:

```
mkdir -p archive/guest-snapshot-v1
cp guest-snapshot/index.html archive/guest-snapshot-v1/index.html
cp netlify/functions/submit.ts archive/guest-snapshot-v1/submit.ts
```

Then rename the directory:
```
mv guest-snapshot opening-question
```

---

## Step 1: Redesigned Question Set

**From:** 10 questions (6 radio + 4 text) designed to score across 5 dimensions
**To:** 8 questions (2 radio + 5 text + 1 optional text) designed to surface conversation material

Each question has a clear prep purpose — what it gives the hosts:

| Step | Question | Type | What It Surfaces |
|------|----------|------|-----------------|
| 0 | Name | Text input | Identity |
| 1 | "Which of these best describes where you are in your own story right now?" | Radio (5) | Orientation — where the guest's head is at |
| 2 | "Think of a decision that changed the direction of your life. What did it cost you — not just practically, but personally?" | Text | Core tradeoff — the emotional/relational cost |
| 3 | "When you think about the paths you didn't take, what feeling comes up most?" | Radio (5) | Emotional signal |
| 4 | "Who has shaped how you think about what a good life looks like — and what did they show you, or fail to show you?" | Text | Influential relationships — specific people the hosts can ask about |
| 5 | "What's something you used to believe about success that you've had to unlearn?" | Text | Evolution of thinking |
| 6 | "Where do you still feel the pull of something you've told yourself you don't want?" | Text | Unresolved tension — where stated values and actual feelings diverge |
| 7 | "What do most people misunderstand about the choices you've made?" | Text | Perception gap |
| 8 | "Finish this sentence: Lately, I've been rethinking..." | Text (optional) | Open-ended closer |

### Radio Options

**Step 1 — "Where you are in your story":**
- Building something I believe in
- Questioning something I built
- Recovering from a big decision
- Searching for what comes next
- Holding multiple things in tension

**Step 3 — "Paths not taken feeling":**
- Relief
- Curiosity
- Regret
- Gratitude
- It depends on the day

### Design Principles
- Questions are *adjacent* to interview questions, not identical — they prime the guest without spoiling the conversation
- Radio questions at steps 1 and 3 provide cognitive breaks between text-heavy questions
- Hint text on text questions: "A sentence or two is plenty — we're not looking for essays"
- Wizard format (one question per screen) preserved — creates contemplative pacing

---

## Step 2: Frontend — Rebuild `opening-question/index.html`

**File:** `opening-question/index.html`

Changes from the current `guest-snapshot/index.html`:

- **Page title:** "The Opening Question | Question Everything"
- **Header h1:** "The Opening Question"
- **Header subtitle:** Keep the spirit of "there are no right answers" — e.g., "A brief, reflective check-in for Question Everything. There are no right answers. We're interested in how you think about these questions, not whether you've resolved them."
- **Replace all 10 question steps** with the 8 new questions (see Step 1 above)
- **Add hint text** below each text question: `<p class="question-hint">A sentence or two is plenty — we're not looking for essays.</p>`
- **Update form field names:**
  - `guest_name` (keep)
  - `q1_story_stage` (radio)
  - `q2_decision_cost` (text)
  - `q3_paths_feeling` (radio)
  - `q4_who_shaped` (text)
  - `q5_unlearned` (text)
  - `q6_the_pull` (text)
  - `q7_misunderstanding` (text)
  - `q8_rethinking` (text, optional)
- **Brand typography:** Swap Georgia/system font for Oswald + Inter via Google Fonts:
  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Oswald:wght@400;500&display=swap" rel="stylesheet">
  ```
  - Oswald for `.header h1` and `.question` (display/headline text)
  - Inter for body copy, options, hints, buttons
- **Brand colors:** Update accents from `#1a1a2e` to `#04344f` (QE brand navy). Keep the warm light background `#faf9f6`.
- **Progress bar:** Adjust step count — total steps = 9 (name + 8 questions)
- **Last step is optional:** Keep the existing logic where step 8 (the closer) doesn't require input to enable "Submit"

---

## Step 3: Backend — Rewrite `netlify/functions/submit.ts`

**File:** `netlify/functions/submit.ts`

Complete rewrite. The function becomes a thin pipe: receive form data → write to Google Sheet → return success.

### New Interface

```typescript
interface GuestResponses {
  guest_name: string;
  q1_story_stage: string;
  q2_decision_cost: string;
  q3_paths_feeling: string;
  q4_who_shaped: string;
  q5_unlearned: string;
  q6_the_pull: string;
  q7_misunderstanding: string;
  q8_rethinking: string;
}
```

### Google Sheet Structure

One shared Google Sheet, one row per guest submission:

| Column | Field Name | Source |
|--------|-----------|--------|
| A | Timestamp | Auto-generated (`new Date().toISOString()`) |
| B | Guest Name | `guest_name` |
| C | Story Stage | `q1_story_stage` (radio) |
| D | Decision & Cost | `q2_decision_cost` (text) |
| E | Paths Not Taken Feeling | `q3_paths_feeling` (radio) |
| F | Who Shaped You | `q4_who_shaped` (text) |
| G | Unlearned Belief | `q5_unlearned` (text) |
| H | The Pull | `q6_the_pull` (text) |
| I | Misunderstanding | `q7_misunderstanding` (text) |
| J | Rethinking | `q8_rethinking` (text, may be empty) |

### Function Logic

```
1. Parse POST body as GuestResponses
2. Validate guest_name is present
3. Authenticate with Google Sheets API via service account
4. Append a row to the target spreadsheet
5. Return { success: true }
```

### Google Sheets API Setup

- Use `googleapis` npm package (add to package.json)
- Create a Google Cloud service account with Sheets API enabled
- Share the target Google Sheet with the service account email (editor access)
- Store credentials as Netlify environment variable: `GOOGLE_SERVICE_ACCOUNT_KEY` (JSON string)
- Store the spreadsheet ID: `GOOGLE_SHEET_ID`

### Target Sheet (already created)

- **Name:** The Opening Question — Responses
- **Sheet ID:** `1bJoNIBcQ26fgnlG9_g-Aj9CECzro1S3m6GGyaRCYvKI`
- **URL:** https://docs.google.com/spreadsheets/d/1bJoNIBcQ26fgnlG9_g-Aj9CECzro1S3m6GGyaRCYvKI/edit
- **Location:** Question Everything folder on Google Drive
- **Tab name:** `Responses`
- **Header row already set:** Timestamp | Guest Name | Story Stage | Decision & Cost | Paths Not Taken Feeling | Who Shaped You | Unlearned Belief | The Pull | Misunderstanding | Rethinking
- **Notification rules:** Set up manually in the Sheet (Tools → Notification rules → "Any changes are made" → email immediately)

### What to Remove

Delete entirely from submit.ts:
- `SYSTEM_PROMPT` (the entire Claude scoring prompt)
- `ScoringResult` interface and all dimension types
- `buildUserPrompt()` function
- `buildScoringEmail()` function
- OpenRouter API call
- Brevo API call
- All email HTML generation
- `QUESTION_LABELS` mapping

### Notifications

Instead of Brevo emails, use Google Sheets built-in notification rules:
- Open the shared Google Sheet
- Tools → Notification rules → "Any changes are made" → "Email - right away"
- This notifies you automatically when a new row is appended

---

## Step 4: Update `package.json`

**Add:** `googleapis` package
**Update:** `.env.example` — replace the 3 old keys:

```
# Old (remove):
# OPENROUTER_API_KEY=
# BREVO_API_KEY=
# NOTIFICATION_EMAIL=

# New:
GOOGLE_SERVICE_ACCOUNT_KEY=
GOOGLE_SHEET_ID=1bJoNIBcQ26fgnlG9_g-Aj9CECzro1S3m6GGyaRCYvKI
```

---

## Step 5: Pod-Prep Integration

**File:** `/Users/chiragshah/chirag-os/.claude/commands/pod-prep.md`

> This file lives in the chirag-os repo, not the QE codebase. Update it separately.

Add a new step to the existing prep workflow:

- **Before** the 3 research agents launch, check the Google Sheet for questionnaire responses matching the guest name (using google-workspace MCP `read_sheet_values`)
- The Google Sheet ID for the questionnaire responses should be embedded in the command (same pattern as other IDs in slash commands)
- If responses exist, pass them to the synthesis step so the final prep doc includes a **"From the Guest"** section with:
  - Their responses (lightly organized, not raw dump)
  - Threads and tensions surfaced from their own words
  - Suggested questions that connect their questionnaire answers to the web research
- If no responses exist, proceed as normal (web research only) with a note: "No questionnaire responses found — consider sending The Opening Question form"

---

## Step 6: Task File Update

**File:** `/Users/chiragshah/chirag-os/todos/tasks/question-everything-web-questionnaire.md`

> Also lives in chirag-os. Update separately.

- Revise objective (conversation prep tool, not scoring/evaluation)
- Remove the scoring rubric section entirely
- Update architecture description to reflect Google Sheets pipeline
- Add new subtask: set up Google Cloud service account + create/share Sheet
- Remaining deployment subtasks still apply (deploy to Netlify, test end-to-end, connect custom domain, update outreach templates)

---

## Verification

1. Open `opening-question/index.html` in browser — verify all 9 steps work (name + 8 questions), progress bar tracks correctly, submit button on final step
2. Verify submit.ts compiles: `npx tsc --noEmit` or Netlify build check
3. Test Google Sheets API call structure locally with a sample payload
4. After deployment: submit form → verify row appears in Google Sheet → verify notification email arrives
5. Run `/pod-prep [test guest]` and confirm it reads responses from the Sheet

---

## Reference: Current Files

These are the files being replaced (backups in `archive/guest-snapshot-v1/`):

- `guest-snapshot/index.html` — 678 lines, wizard-style form with 10 questions
- `netlify/functions/submit.ts` — ~300 lines, OpenRouter scoring + Brevo email pipeline
- Brand assets referenced in `qe-website-strategy.md`: Primary Orange #FA7017, Dark Navy #04344f, Oswald + Inter fonts
