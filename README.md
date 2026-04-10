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
