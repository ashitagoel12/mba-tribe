"""Automated sanity audit of data/mba_schools_data.json.

Flags values that are impossible, implausible for the school's tier, placeholders,
or stale. Every flag is a lead to verify, not proof of an error.
Usage: python3 scripts/auditData.py  (writes data/AUDIT-REPORT.md and prints a summary)
"""
import json, re, datetime, collections, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
data = json.load(open(ROOT / "data" / "mba_schools_data.json"))
schools = data["schools"]
TODAY = datetime.date(2026, 10, 16)

M7 = {"harvard-hbs","stanford-gsb","wharton-penn","booth-chicago","kellogg-northwestern","sloan-mit","columbia-cbs"}
T15 = {"tuck-dartmouth","yale-som","haas-berkeley","ross-michigan","darden-virginia","fuqua-duke","nyu-stern",
       "anderson-ucla","tepper-cmu","cornell-johnson","marshall-usc"}
PLACEHOLDER = re.compile(r"^(regional corporations|fortune 500 (companies|firms)|consulting firms|technology companies|"
                         r"manufacturing companies|financial services|industry advisory board partners|nyc financial institutions|"
                         r"various|local (firms|companies)|healthcare (organizations|systems))$", re.I)

flags = collections.defaultdict(list)   # category -> [(school_id, detail)]

def flag(cat, sid, detail):
    flags[cat].append((sid, detail))

for s in schools:
    sid = s["id"]; cp = s["classProfile"]; co = s["costs"]; em = s["employment"]
    tier = "M7" if sid in M7 else "T15" if sid in T15 else "other"

    # 1. Test scores
    g = cp.get("avgGMAT"); gre = cp.get("avgGRE")
    if g is not None and not (450 <= g <= 760):
        flag("Impossible or implausible GMAT", sid, f"avgGMAT={g}")
    if tier == "other" and g and g >= 680:
        flag("GMAT high for a non-top-15 program (verify)", sid, f"avgGMAT={g}")
    if gre is not None and gre < 260:
        flag("GRE stored as a section score, not a total (260–340)", sid, f"avgGRE={gre}")
    elif gre is not None and not (290 <= gre <= 340):
        flag("Implausible GRE total", sid, f"avgGRE={gre}")

    # 2. Costs
    t = co.get("annualTuition"); tot = co.get("totalProgramCost")
    if t and not (8000 <= t <= 95000):
        flag("Implausible tuition", sid, f"annualTuition={t}")
    if t and tot and not (0.9 * t <= tot <= 2.3 * t):
        flag("Total cost inconsistent with annual tuition", sid, f"tuition={t}, total={tot}")

    # 3. Employment
    r = em.get("employmentRate3Months"); sal = em.get("avgStartingSalary")
    if r is not None and not (50 <= r <= 100):
        flag("Implausible employment rate", sid, f"{r}%")
    if tier == "other" and r and r >= 95:
        flag("Employment rate at M7 level for a non-top-15 program (verify)", sid, f"{r}%")
    if sal and not (50000 <= sal <= 200000):
        flag("Implausible salary", sid, f"${sal:,}")
    ph = [c for c in em.get("top5Companies", []) if PLACEHOLDER.match(c.strip())]
    if ph:
        flag("Placeholder employer names instead of real companies", sid, "; ".join(ph))
    if len(set(em.get("top3Industries", []))) < len(em.get("top3Industries", [])):
        flag("Duplicate industries", sid, str(em["top3Industries"]))

    # 4. Class profile
    ip = cp.get("internationalStudentPct")
    if ip is not None and not (0 <= ip <= 80):
        flag("Implausible international %", sid, f"{ip}%")
    we = cp.get("avgWorkExperience")
    if we is not None and not (1 <= we <= 10):
        flag("Implausible work experience", sid, f"{we} yrs")

    # 5. Staleness: application deadlines already passed
    dl = (s.get("applicationInfo") or {}).get("deadlines") or {}
    future = []
    for rnd, v in dl.items():
        d = v.get("deadline") if isinstance(v, dict) else None
        if d and re.match(r"\d{4}-\d{2}-\d{2}$", d):
            future.append(datetime.date.fromisoformat(d) >= TODAY)
    if future and not any(future):
        flag("All listed application deadlines have passed (old cycle)", sid, "")

    # 6. Missing core fields
    for path in [("campusType",), ("stemOpt",), ("recruiterAccess",)]:
        if s.get(path[0]) is None:
            flag("Missing field used by scoring", sid, path[0])

n = len(schools)
lines = [f"# Data Audit Report", f"", f"Run on {TODAY.isoformat()} over {n} schools. Dataset last updated: {data['metadata'].get('lastUpdated')}.",
         "", "Each flag is a lead to verify, not proof of an error.", "",
         "Fixes already applied: " + " ".join(v for k, v in data["metadata"].items() if k.endswith("Note")), "", "| Check | Schools flagged |", "|---|---|"]
for cat, items in sorted(flags.items(), key=lambda kv: -len(kv[1])):
    lines.append(f"| {cat} | {len(set(i[0] for i in items))} |")
for cat, items in sorted(flags.items(), key=lambda kv: -len(kv[1])):
    lines += ["", f"## {cat}", ""]
    for sid, det in items:
        lines.append(f"- `{sid}` {det}".rstrip())
(ROOT / "data" / "AUDIT-REPORT.md").write_text("\n".join(lines) + "\n")
print(f"{n} schools checked; {len({sid for v in flags.values() for sid, _ in v})} schools have at least one flag")
for cat, items in sorted(flags.items(), key=lambda kv: -len(kv[1])):
    ids = sorted(set(i[0] for i in items))
    print(f"{len(ids):3d}  {cat}: {', '.join(ids[:8])}{' …' if len(ids) > 8 else ''}")
