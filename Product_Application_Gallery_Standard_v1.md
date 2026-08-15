# NatFiber Encyclopedia — Product Application Gallery Standard v1

## 1. Purpose
The Product Application Gallery connects natural-fibre science to visible real-world outcomes. It is part of the engineering evidence architecture, not a decorative image carousel.

## 2. Two-layer data model

### `fiber_media`
Stores the media asset and its legal/provenance record:
- creator
- source page
- original file URL
- licence and licence URL
- attribution
- alt text
- provenance note
- media verification
- public/private state

### `fiber_product_media`
Stores what the image means:
- linked fibre
- linked media asset
- optional `application_id`
- value-chain stage
- application class
- product category
- bilingual product name/description
- maturity
- evidence relation
- product verification
- optional scientific/reference link
- public/private state

This separation avoids mixing copyright/licensing facts with engineering/application semantics.

## 3. Required visual taxonomy

### Value-chain stage
- `INTERMEDIATE_MATERIAL`
  - yarn
  - roving
  - mat
  - felt/nonwoven
  - woven reinforcement
  - pulp/cellulose fraction
  - prepreg or semi-finished reinforcement
- `FINISHED_PRODUCT`
  - broom
  - rope product
  - panel
  - automotive component
  - building product
  - filtration product
  - packaging
  - geotextile installation
  - final prototype

### Application class
- `TRADITIONAL`
  - conventional, local, household, craft, agricultural, fisheries or historical use
- `MODERN_ENGINEERING`
  - engineered, industrial, composite, functional, biomedical, automotive, construction, filtration, packaging, advanced textile, research prototype

**Traditional/Modern is not the same as maturity.**
A traditional product can be commercial; a modern product can still be experimental.

## 4. Maturity
- `COMMERCIAL`
- `DEMONSTRATED`
- `EXPERIMENTAL`
- `PROPOSED`

## 5. Evidence relation
- `SOURCE_EXPLICIT_PRODUCT_FIBER`
- `SOURCE_EXPLICIT_PRODUCT_MATERIAL`
- `RESEARCH_PROTOTYPE`
- `HISTORICAL_DOCUMENTATION`
- `CONTEXT_ONLY`

## 6. Product verification
Preferred public states:
- `VERIFIED_FIBER_PRODUCT`
- `VERIFIED_RESEARCH_PROTOTYPE`
- `HISTORICAL_VERIFIED`

`CONTEXT_ONLY` requires explicit caveat.
`UNVERIFIED` should remain private/hold.

## 7. Media admission rules
A product photo may be admitted only when:
1. the depicted object/product is identifiable;
2. the source explicitly links it to the target fibre/material, or a primary research source documents the prototype;
3. creator/source/licence/attribution are traceable;
4. the media reuse status is defensible;
5. the image is classified as traditional or modern independently from maturity;
6. intermediate material is not misrepresented as a finished commercial product.

### Not allowed as scientific/product evidence
- photos inferred only by visual resemblance;
- generic stock images without fibre identity;
- seller images without reusable rights unless SOURCE_ONLY;
- AI-generated or synthetic images as evidence;
- composite products where the target fibre cannot be source-resolved;
- screenshots from copyrighted papers unless reuse is permitted.

AI-generated visuals may only be used as clearly labelled **illustration**, never as evidence in the Product Application Gallery.

## 8. Public UI
Applications tab displays:
- value-chain strip: Plant → Raw Fibre → Intermediate → Finished Product
- Conventional / Traditional group
- Modern / Engineering group
- stage, maturity and evidence badges
- product name and description
- source and licence links
- empty-state disclosure where verified imagery is not yet available

## 9. Editorial workflow
1. Create PRIVATE candidate.
2. Media asset and product semantics enter one release group.
3. Human editor reviews product identity and licence.
4. ADMIN approves all selected items.
5. ADMIN publishes release.
6. Public renderer reads only RLS-approved public records.

## 10. NF-0001 seed example
Existing `MED-000011` (Ijuk broom) is mapped as:
- `FINISHED_PRODUCT`
- `TRADITIONAL`
- `DEMONSTRATED`
- `SOURCE_EXPLICIT_PRODUCT_FIBER`
- `VERIFIED_FIBER_PRODUCT`

This is a semantic candidate until owner approval/publication of the Product Gallery release.
