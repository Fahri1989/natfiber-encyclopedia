# NatFiber Encyclopedia — Gold-Standard Record Protocol v1

## Purpose
A Gold-Standard Record is a public NatFiber profile that has passed scientific, licensing, provenance, data-integrity, and public-display QA. Gold Standard does **not** require every analytical technique or global statistic to exist. `NOT_FOUND`, `PARTIAL`, `SOURCE_ONLY`, and explicit data gaps are valid outcomes when they are evidence-based.

## Mandatory gates

### 1. Identity & taxonomy
- Canonical/common/scientific names resolved.
- Taxonomy sourced.
- Plant part / fibre origin category explicit.
- Synonyms separated from accepted identity.

### 2. Canonical engineering properties
- Canonical display values linked to individual observations.
- Method/condition warnings retained.
- No universal constant inferred from heterogeneous literature.

### 3. Chemistry & morphology
- Source-resolved records.
- Individual observations preserved.
- Methods and sample conditions visible.

### 4. Treatments & composite systems
- Treatment conditions recorded when available.
- Composite matrix, fibre loading, orientation, processing, and application context separated.
- No assumed matrix/loading or missing method detail silently filled.

### 5. Processing & applications
- Literature-reported processing routes retained.
- Commercial / demonstrated / experimental / proposed applications distinguished.

### 6. Evidence, conflicts & research gaps
- Evidence coverage is explicit.
- Conflicts are not hidden.
- Open research gaps are preserved.
- Missing evidence may remain `NOT_FOUND`.

### 7. Global Production & Distribution
- Actual fibre output separated from host-plant resource base.
- Sugar/food/by-product production must not be converted into fibre output.
- Mixed HS codes must not be claimed as fibre-specific trade.
- Botanical distribution separated from commercial production.
- Global series may be `NOT_FOUND`.

### 8. Media Gallery
- Identity of each image checked.
- Creator/source/license/attribution stored.
- `REHOST_ALLOWED`, `SOURCE_ONLY`, `PERMISSION_REQUIRED`, `LICENSE_UNRESOLVED` respected.
- Historical or partial-taxonomy media must be labelled as such.

### 9. Scientific Characterization Library
Evaluate, where relevant:
- SEM / FESEM
- FTIR
- XRD
- DSC
- TGA / DTG
- ¹H-NMR
- ¹³C-NMR
- XRF

Rules:
- Primary-source first.
- Intrinsic fibre, fibre fraction, and composite context must not be mixed.
- EDX/EDS is not XRF.
- TGA evidence does not automatically imply DTG figure verification.
- Missing techniques remain `NOT_FOUND`.
- Figure-level reuse must be assessed separately from article-level accessibility.

### 10. Public QA
- No cross-fibre contamination.
- Units and labels are context-correct.
- Bilingual rendering reviewed.
- Deep-linking / profile navigation works.
- Public and private records separated by RLS.
- References have traceable DOI/URL.
- Duplicate DOI/source anomalies checked.

## Certification outcome
A record may be certified when:
- all mandatory domains are reviewed;
- unresolved items are documented, not guessed;
- licensing conflicts are conservatively handled;
- public rendering does not overstate evidence;
- explicit gaps are stored as part of the certification.

## NF-0001 precedent
NF-0001 Ijuk is the first record certified under `NF-GS-v1`.

Its Gold-Standard status coexists with explicit open gaps:
- modern voucher-quality raw-fibre close-up desired;
- extraction image file-level licensing incomplete;
- DTG figure-level mapping partial;
- intrinsic DSC not found;
- intrinsic XRF not found;
- no isolated annual world production series;
- no Ijuk-specific numeric trade series isolated from mixed HS codes.

This is intentional: scientific completeness is not the same as filling every field.
