# Top 18 MBA Schools — Data Verification Report
**Generated:** 2026-04-11  
**File:** `data/top-18-schools-comprehensive-data.json`  
**File Size:** 190.3 KB | **Total Schools:** 18

---

## ✅ Summary Statistics

| Metric | Value |
|---|---|
| Total schools | 18 |
| All 10 required sections present | ✅ All 18 |
| Schools with 6 quick links | ✅ All 18 |
| Schools with admissions deadlines | ✅ All 18 |
| Schools with employment report URLs | ✅ All 18 |
| Schools with tuition data | ✅ All 18 |
| Schools with programs listed | ✅ All 18 |
| JSON validity | ✅ Valid |

---

## 📋 School-by-School Summary

### Tier 1 Schools (Top 15)

| # | School | ID | Programs | Rounds | GMAT Median | Avg Salary | Tuition/yr |
|---|---|---|---|---|---|---|---|
| 1 | Tuck | tuck-dartmouth | 5 | 3 | 727 | $175,000 | $84,250 |
| 2 | Yale SOM | yale-som | 7 | 3 | 740 | $160,000 | $87,800 |
| 3 | Haas | haas-berkeley | 7 | 3 | 730 | $160,000 | $85,406 |
| 4 | Ross | ross-michigan | 7 | 4 | 731 | $170,000 | $81,152 |
| 5 | Darden | darden-uva | 5 | 4* | 716 | $163,710 | $84,598 |
| 6 | Fuqua | fuqua-duke | 5 | 5* | 720 | $175,000 | $81,000 |
| 7 | Anderson | anderson-ucla | 4 | 3 | 703 | $146,526 | $79,452 |
| 8 | Stern | stern-nyu | 6 | 4 | 737 | $166,148 | $86,916 |
| 9 | Johnson | johnson-cornell | 8 | 3 | 710 | $161,967 | $86,596 |
| 10 | Tepper | tepper-cmu | 4 | 4 | 707 | $154,846 | $81,340 |

*Darden and Fuqua include an Early Action round

### Tier 2 Schools (Top 25)

| # | School | ID | Programs | Rounds | GMAT Median | Avg Salary | Tuition/yr |
|---|---|---|---|---|---|---|---|
| 11 | McCombs | mccombs-texas | 6 | 3 | 668* | $151,178 | $61,214 |
| 12 | Kenan-Flagler | kenan-flagler-unc | 6 | 4 | 707 | $140,490 | $74,138 |
| 13 | Goizueta | goizueta-emory | 4 | 3 | 720 | $175,000 | $76,900 |
| 14 | Marshall | marshall-usc | 5 | 3 | 742 | $144,442 | $79,893 |
| 15 | McDonough | mcdonough-georgetown | 7 | 4* | 700 | $146,033 | $70,108 |
| 16 | Jones | jones-rice | 5 | 4 | 710 | $149,521 | $76,073 |
| 17 | Owen | owen-vanderbilt | 5 | 4 | 690 | $150,246 | $74,500 |
| 18 | Foster | foster-uw | 4 | 3 | 720 | $151,322 | $59,574 |

*McCombs uses GMAT Focus score; McDonough includes Early Action round

---

## 🔍 Data Sources

Data was gathered by research agents using:
- Official school websites (primary source for all URLs)
- ClearAdmit deadline database (deadline verification)
- GMAT Club school profiles (test score medians)
- Poets & Quants class profile pages (demographics)
- Official employment reports (salary/industry data)

---

## ⚠️ Notable Findings & Caveats

### Unique Program Features
- **Marshall (USC)**: Only top MBA program that requires **zero letters of recommendation**
- **Stern (NYU)**: Uses "EQ Endorsement" instead of traditional recommendations; requires current supervisor
- **Foster (UW)**: Lowest application fee ($85) and highest tech placement (47%) of any MBA
- **Ross (Michigan)**: Only requires 1 recommendation (vs. standard 2)
- **Haas (Berkeley)**: Video essay embedded IN the application (not post-submission)
- **Yale SOM**: Post-submission video essay with randomized questions
- **Goizueta (Emory)**: 1-minute extemporaneous "small talk" video essay
- **McCombs (Texas)**: Reports GMAT Focus score (668) rather than classic GMAT

### Public Schools (Lower Tuition)
Foster (UW) at $59,574/yr and McCombs (Texas) at $61,214/yr (out-of-state) offer significantly lower tuition than private peers, representing strong value propositions.

### Data Gaps / Items Marked Null
- Some schools did not publicly publish interview invite dates for all rounds → `null`
- Marshall and some other schools did not publish GRE median breakdowns → `null`
- Some virtual tour URLs could not be confirmed → `null`
- Some `atGraduation` employment rates not published → `null` (3-month rates available for all)

---

## 🔗 URL Verification Notes

All URLs follow official school domain patterns and have been constructed based on:
- Confirmed domain names (e.g., `tuck.dartmouth.edu`, `som.yale.edu`, `mba.haas.berkeley.edu`)
- Standard path conventions consistent with school site structures
- Research agent verification via WebFetch during data collection

### Domains Confirmed
| School | Primary Domain |
|---|---|
| Tuck | tuck.dartmouth.edu |
| Yale SOM | som.yale.edu |
| Haas | mba.haas.berkeley.edu |
| Ross | michiganross.umich.edu |
| Darden | darden.virginia.edu / apply.darden.virginia.edu |
| Fuqua | fuqua.duke.edu / admissions.fuqua.duke.edu |
| Anderson | anderson.ucla.edu / apply.anderson.ucla.edu |
| Stern | stern.nyu.edu / admissions.stern.nyu.edu |
| Johnson | johnson.cornell.edu |
| Tepper | cmu.edu/tepper |
| McCombs | mccombs.utexas.edu |
| Kenan-Flagler | mba.unc.edu |
| Goizueta | goizueta.emory.edu |
| Marshall | marshall.usc.edu |
| McDonough | msb.georgetown.edu |
| Jones | business.rice.edu |
| Owen | business.vanderbilt.edu |
| Foster | foster.uw.edu |

### ⚡ Pre-Deployment Checklist
Before deploying to production, manually verify:
- [ ] Application portal URLs load and go to correct school
- [ ] Employment report URLs load PDFs or pages with current data
- [ ] Events calendar URLs show live/upcoming events
- [ ] Class profile pages reflect most recent cohort data
- [ ] Financial aid URLs show current tuition figures
- [ ] Deadlines are confirmed for the 2025-2026 cycle

---

## 📊 Class Size Comparison

| Size Range | Schools |
|---|---|
| 100–150 students | Foster (111), Goizueta (125), Tepper (144) |
| 150–200 students | Jones (157), Owen (160), Marshall (199) |
| 200–300 students | McDonough (248), Kenan-Flagler (249), McCombs (235), Haas (273) |
| 300–400 students | Tuck (304), Anderson (305), Johnson (314), Yale SOM (367), Ross (379) |
| 400+ students | Fuqua (426) |

---

## 💰 Tuition Range (Annual, 2025-2026)

| Range | Schools |
|---|---|
| Under $65K | Foster ($59,574), McCombs ($61,214) |
| $65K–$75K | McDonough ($70,108), Owen ($74,500), Kenan-Flagler ($74,138) |
| $75K–$80K | Goizueta ($76,900), Jones ($76,073), Anderson ($79,452), Marshall ($79,893) |
| $80K–$85K | Fuqua ($81,000), Tepper ($81,340), Ross ($81,152), Tuck ($84,250) |
| $85K+ | Darden ($84,598), Haas ($85,406), Johnson ($86,596), Stern ($86,916), Yale ($87,800) |

---

*Report generated as part of MBA Tribe data pipeline | Last updated: 2026-04-11*
