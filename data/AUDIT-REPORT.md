# Data Audit Report

Run on 2026-10-16 over 100 schools. Dataset last updated: 2025-07-01.

Each flag is a lead to verify, not proof of an error.

Fixes already applied: avgGRE is the total score (260-340). 48 values were stored as per-section averages and were converted (x2) on 2026-10-16. Audited 2026-10-16 (scripts/auditData.py). NC A&T avgGMAT removed (school waives the GMAT and publishes no average). Placeholder employer names removed for 4 schools.

| Check | Schools flagged |
|---|---|
| GMAT high for a non-top-15 program (verify) | 17 |
| Employment rate at M7 level for a non-top-15 program (verify) | 12 |
| Total cost inconsistent with annual tuition | 6 |
| All listed application deadlines have passed (old cycle) | 2 |
| Impossible or implausible GMAT | 1 |
| Implausible tuition | 1 |

## GMAT high for a non-top-15 program (verify)

- `mccombs-utaustin` avgGMAT=705
- `kenan-flagler-unc` avgGMAT=705
- `goizueta-emory` avgGMAT=723
- `mcdonough-georgetown` avgGMAT=700
- `foster-uw` avgGMAT=720
- `jones-rice` avgGMAT=693
- `simon-rochester` avgGMAT=680
- `vanderbilt-owen` avgGMAT=715
- `notre-dame-mendoza` avgGMAT=710
- `ohio-state-fisher` avgGMAT=705
- `arizona-state-carey` avgGMAT=690
- `byu-marriott` avgGMAT=680
- `boston-university-questrom` avgGMAT=685
- `smu-cox` avgGMAT=685
- `ucsd-rady` avgGMAT=690
- `ut-dallas-jindal` avgGMAT=682
- `washu-olin` avgGMAT=701

## Employment rate at M7 level for a non-top-15 program (verify)

- `goizueta-emory` 97%
- `texas-am-mays` 96.3%
- `penn-state-smeal` 97%
- `ut-dallas-jindal` 96%
- `georgia-terry` 95%
- `iowa-state-ivy` 96%
- `kansas` 96%
- `tulane-freeman` 100%
- `oklahoma-state-spears` 98%
- `auburn-harbert` 97%
- `lsu-ourso` 95%
- `charleston-mba` 100%

## Total cost inconsistent with annual tuition

- `kenan-flagler-unc` tuition=55470, total=166410
- `maryland-smith` tuition=42228, total=126684
- `minnesota-carlson` tuition=49100, total=147300
- `case-western-weatherhead` tuition=42450, total=99660
- `oregon-lundquist` tuition=34668, total=138672
- `buffalo-suny` tuition=15230, total=60920

## All listed application deadlines have passed (old cycle)

- `stanford-gsb`
- `columbia-cbs`

## Impossible or implausible GMAT

- `marshall-usc` avgGMAT=770

## Implausible tuition

- `pepperdine-graziadio` annualTuition=96825
