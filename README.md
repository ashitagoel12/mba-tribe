# MBA Fit Copilot — MBA Tribe

A React single-page application that helps MBA applicants find programs that genuinely fit their profile — not just chase rankings.

---

## Quick Start

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Project Structure

```
mba-tribe/
├── mba_schools_data.json        ← School dataset (26 programs, Phase 1)
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── src/
    ├── App.jsx                  ← State machine: step 0→5
    ├── main.jsx
    ├── index.css
    ├── components/
    │   ├── WelcomeScreen.jsx    ← Hero / landing
    │   ├── AssessmentForm.jsx   ← 4-section multi-step form
    │   ├── ResultsPage.jsx      ← Tiered results + extras
    │   ├── SchoolCard.jsx       ← Full card (Strong Fit tier)
    │   └── SchoolCardCompact.jsx ← Compact card (other tiers)
    └── utils/
        ├── constants.js         ← Dropdowns, tier IDs, keyword maps
        ├── matchingAlgorithm.js ← Pure scoring logic (well-commented)
        └── bulletGenerator.js   ← "Why this fits" + "Watch out" copy
```

---

## How to Add More Schools

1. Open `mba_schools_data.json`
2. Append a new object to the `"schools"` array using the same schema as existing entries
3. Update `"metadata.totalSchools"` count
4. No code changes required — the algorithm works with any number of schools

---

## How to Adjust Algorithm Weights

All scoring logic lives in `src/utils/matchingAlgorithm.js`. The key function is `buildWeights()`:

```js
// src/utils/matchingAlgorithm.js — buildWeights()

function buildWeights(formData) {
  return {
    career: 15 + (priorities.industryPlacement / 5) * 20, // 19–35
    geography: 15,
    affordability: budgetSensitivity === 'major-factor' ? 25 : ...,
    international: isInternational ? 10 + ... : 5 + ...,
    culture: 8 + (priorities.collaborativeCulture / 5) * 12,
    gmat: 10,
    employment: 10,
    prestige: priorities.prestige <= 2 ? 4 : ...,
  }
}
```

- **Increase a weight** → that dimension matters more in the final score
- **Flatten a weight** → the dimension becomes less decisive
- All weights are normalised at the end so you don't need them to sum to 100

### Tier cutoffs

```js
// src/utils/matchingAlgorithm.js — runMatching()
const STRONG_THRESHOLD    = 65  // score >= 65 → Strong Fit
const EXPLORING_THRESHOLD = 45  // score 45–64 → Worth Exploring
// Stretch: GMAT gap > 30 pts AND neutral-GMAT score >= 40
```

---

## Deploying

**Build for production**
```bash
npm run build   # output goes to /dist
npm run preview # local preview of production build
```

**Vercel (recommended)**
1. Push this repo to GitHub
2. Import the project at [vercel.com](https://vercel.com)
3. Vercel auto-detects Vite — no configuration needed
4. Click **Deploy**

**Netlify**
1. Push to GitHub
2. New site → connect repo → build command: `npm run build`, publish dir: `dist`
3. Click **Deploy site**

---

## Tech Stack

- **React 18** with Vite
- **Tailwind CSS v3** — utility-first styling
- **lucide-react** — icon library
- No backend, no database — fully client-side

---

## Data Notes

- Source: official school websites and employment reports (2024–2026)
- `mba_schools_data.json` is Phase 1 of a planned 50-school dataset
- All data reflects Class of 2025–2027 profiles and Class of 2024–2025 employment reports
- Tuition shown as annual out-of-state/private rate for 2025–2026 academic year

---

## AI layer (Claude)

The scoring is rules-based and explainable. Claude adds what the rules can't do:

- **AI read on your top matches** (`/api/explain`): explains each top match using the applicant's industry, function and free-text notes, which the rules never read.
- **Ask about this school** (`/api/ask`): answers questions about one school from its record only, and says when the data doesn't cover the question.

Guardrails:
- Claude only sees the school records it is asked about and is told not to use outside knowledge.
- Every number in a response is checked against that school's record before it is shown. A read that fails is hidden, and the page says how many were hidden.
- Free text from users is treated as data, not instructions. Inputs are capped, output is structured (tool use), and each IP is limited to 20 calls an hour per server instance.
- If the AI is down or not configured, the rest of the app works as before.

Setup on Vercel: add `ANTHROPIC_API_KEY` as an environment variable (optional `ANTHROPIC_MODEL`, default `claude-haiku-5-5`). Set a monthly spend limit in the Anthropic Console.

## Tests

```bash
node scripts/personaCheck.mjs     # scoring: runs 4 test applicants and checks for known failure modes
python3 scripts/auditData.py      # data: flags impossible, placeholder or stale values -> data/AUDIT-REPORT.md
node scripts/evalAi.mjs           # AI layer: grounding filter + endpoint tests with a fake model
ANTHROPIC_API_KEY=... node scripts/evalAi.mjs --live   # real Claude runs, incl. a prompt-injection case
```

## Keeping the data current

`scripts/refresh/refreshData.mjs` re-checks each school against its own website:

1. **Find.** Claude searches only the school's domain for the newest class profile, employment report, tuition and deadlines.
2. **Extract.** Every value comes back with its source URL, the exact sentence it came from, and the year it covers.
3. **Verify in code.** The script opens the source page or PDF and checks that the sentence is there, that it contains the value, and that the value is plausible. A third-party source, a missing quote or an out-of-range number is rejected.
4. **Review.** `data/refresh/<date>/report.md` lists every value as updated, unchanged or rejected (with the reason). `applyRefresh.mjs` writes only verified values and records each source, which the school page shows under "Sources".

Run it from GitHub: **Actions → refresh-school-data → Run workflow** (`pilot`, `all`, or school ids). It opens a pull request with the report; nothing changes on the site until it is merged. It also runs quarterly. Needs the `ANTHROPIC_API_KEY` repository secret.

Tests: `node scripts/refresh/refresh.test.mjs`

## Talk to students and alumni

- **/mentors**: approved students and alumni, filterable by school. "Book a free call" opens the mentor's own Calendly or Cal.com link.
- **/questions**: a public Q&A board. Anyone can ask (optionally about a school); mentors answer. School pages show their mentors and questions too.
- **/mentors/apply**: students and alumni apply. **/admin** (password = `ADMIN_TOKEN`): approve or reject mentors, review held posts, issue new mentor links.
- **/mentor**: a mentor's private inbox, opened from the one-time link shown when you approve them.

Every public question and answer is checked by Claude for spam, abuse and personal contact details. Anything flagged, or anything posted when the check can't run, is held for review. Posting is rate limited per IP. Mentor emails are never shown publicly.

Setup: connect **Upstash for Redis** from the Vercel project's Storage tab (free), and set `ADMIN_TOKEN`. Tests: `node scripts/community.test.mjs`.
