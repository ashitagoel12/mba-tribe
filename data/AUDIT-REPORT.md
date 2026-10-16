# Data Audit Report

Run on 2026-10-16 over 100 schools. Dataset last updated: 2025-07-01.

Each flag is a lead to verify, not proof of an error.

Fixes already applied: avgGRE is the total score (260-340). 48 values were stored as per-section averages and were converted (x2) on 2026-10-16. Audited 2026-10-16 (scripts/auditData.py). NC A&T avgGMAT removed (school waives the GMAT and publishes no average). Placeholder employer names removed for 4 schools.

| Check | Schools flagged |
|---|---|
| GMAT high for a non-top-15 program (verify) | 16 |
| Employment rate at M7 level for a non-top-15 program (verify) | 11 |
| All listed application deadlines have passed (old cycle) | 2 |
| Total cost inconsistent with annual tuition | 1 |

## GMAT high for a non-top-15 program (verify)

- `mccombs-utaustin` avgGMAT=710
- `kenan-flagler-unc` avgGMAT=707
- `goizueta-emory` avgGMAT=723
- `mcdonough-georgetown` avgGMAT=700
- `kelley-indiana` avgGMAT=680
- `foster-uw` avgGMAT=720
- `jones-rice` avgGMAT=693
- `simon-rochester` avgGMAT=680
- `vanderbilt-owen` avgGMAT=703
- `notre-dame-mendoza` avgGMAT=710
- `arizona-state-carey` avgGMAT=690
- `byu-marriott` avgGMAT=680
- `boston-university-questrom` avgGMAT=680
- `ucsd-rady` avgGMAT=690
- `ut-dallas-jindal` avgGMAT=682
- `washu-olin` avgGMAT=701

## Employment rate at M7 level for a non-top-15 program (verify)

- `goizueta-emory` 97%
- `notre-dame-mendoza` 96%
- `penn-state-smeal` 97%
- `georgia-terry` 95%
- `kansas` 96%
- `tulane-freeman` 100%
- `oklahoma-state-spears` 98%
- `tcu-neeley` 96%
- `auburn-harbert` 97%
- `lsu-ourso` 95%
- `charleston-mba` 100%

## All listed application deadlines have passed (old cycle)

- `stanford-gsb`
- `columbia-cbs`

## Total cost inconsistent with annual tuition

- `case-western-weatherhead` tuition=42450, total=99660
