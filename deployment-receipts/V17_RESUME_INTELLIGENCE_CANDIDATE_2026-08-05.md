# V17 Resume Intelligence - Exact-Head Candidate Receipt

**Prepared:** 2026-08-05 (Pacific/Honolulu)  
**Repository:** `GlacierEQ/job-application`  
**Parent source:** `release/v16-signal-architecture` at `1cc8b22a8f675ea10edfc454508b7fd0013f8da2`  
**Candidate branch:** `release/v17-resume-intelligence`  
**Artifact-binding commit:** `c35e65c226946f3f1ad79d81d25452f63a05af3e`  
**Exact-head validation commit:** `8a501ce6f648b2393de49cfb20b2039ae5178847`  
**State:** `EXACT_HEAD_VALIDATED_READY_FOR_PROMOTION`

## Purpose

Upgrade the V16 resume from a truthful technical summary into a calibrated resume system with separate human, ATS, and machine interfaces. Factual identity and evidence boundaries remain invariant; presentation density and retrieval form change by audience.

## Human signal layer

- two-page, single-reading-order PDF designed for technical recruiters and hiring managers;
- editable DOCX companion;
- web resume with stronger positioning, execution proof, cross-domain technical foundation, and clear role fit;
- high-contrast responsive visual system with print and reduced-motion contracts;
- no client JavaScript and no tracking.

## Machine layer

- linear ATS text at `/resume/ats.txt`;
- JSON Resume-compatible contract with GlacierEQ evidence extensions at `/data/resume.json`;
- schema.org Person microdata in the human resume;
- claim IDs and explicit evidence states for core proof;
- canonical machine routes listed in `llms.txt`.

## PSYSOC-X calibration

The resume presents one identity through distinct profiles:

- **Human:** memorable narrative, visual hierarchy, role fit, and cross-domain reasoning;
- **ATS:** conventional headings, linear reading order, high-signal keywords, and no decorative parsing dependency;
- **Machine:** exact identities, dates, evidence states, test totals, project limits, source URLs, and prohibited-inference boundaries.

Facts, uncertainty, evidence state, authority, dignity, and non-affiliation boundaries remain invariant.

## External report audit

Useful report signals retained:

- stronger scientific and physical-systems narrative;
- clearer connection between field inspection and AI architecture;
- structured machine-readable candidate data;
- richer recruiter-facing visual presentation.

Claims excluded pending direct evidence or because they were architecturally unnecessary:

- current Vercel outage diagnosis;
- required migration to Next.js App Router or Edge Middleware;
- guaranteed sub-100ms latency;
- official Greenhouse or Workday MCP recruiting servers;
- direct JEFS API integration;
- enterprise-grade, executive-leadership, production, telemetry, customer-impact, and company-affiliation claims;
- Master's or Master's-level AWS Cloud Institute characterization;
- train-of-thought specialization and deployed deep-learning model claims.

## Grounded cross-domain additions

Prior user resume records support:

- sea-urchin morphometric research at the University of Hawaii, 2016-2017;
- scuba tank technician work with Hawaiian Diving Adventures and the UH Dive Office, conservatively represented as 2016-2017;
- Hi-Class residential repair and field-services ownership beginning in 2017;
- earlier PSI and diving credentials, explicitly labeled historical and requiring current-status confirmation.

These records are not transformed into current certification, executive, enterprise, or production claims.

## Exact artifact identities

- PDF: `8,287 bytes`; SHA-256 `7ed445caf8ea73392868fdf29ca150476c8ef89ca6c622bb136aa143ca405bab`
- DOCX: `41,576 bytes`; SHA-256 `e88a77e588fbcf98425adac8e4920837794c67985edee9d764d536049b5f79da`
- ATS text: `6,662 bytes`; SHA-256 `6956ed8a390bf433e3edf38cf99573b95da387562fd33aa3e82aaaab889dec9f`
- Resume JSON: `6,373 bytes`; SHA-256 `2e88302c1f69fdd5e5a6bcdced178d8d413d36b9030335fcb339ab17d30c6557`
- Generator: `site-v15/scripts/generate-resume-v17.py`
- Manifest: `site-v15/data/resume-artifacts.json`

## Exact-head execution receipts

All gates completed successfully against `8a501ce6f648b2393de49cfb20b2039ae5178847`:

- V17 Resume Intelligence - run `31027903110`;
- inherited V16 Signal Architecture - run `31027903212`;
- inherited V15 Final Hiring Release - run `31027901390`.

The V17 gate is fail-closed: pipeline failures propagate, the JSON receipt must be nonempty and parseable, and its schema, `PASS` state, and factual-invariance state are asserted before hashing and upload.

Validation artifact:

- artifact ID `8939405544`;
- archive digest `sha256:b6a2762f303b06e4f7222eba7a85f1b5df8e7a2321e6a7767bf059c1cb58e02d`;
- receipt JSON SHA-256 `1bfb68055cafa196c04b88872c969be2ba15ea7de5bb4c004bcd6d5aa7024c93`;
- receipt schema `glaciereq.resume-intelligence-validation.v17`;
- status `PASS`;
- profile `PSYSOC-X_MACHINE`;
- facts invariant `true`.

## Visual inspection

The exact generated PDF and DOCX were rendered and inspected as two-page documents. The layout preserves hierarchy, readable density, balanced page composition, execution-first evidence, cross-domain technical grounding, and explicit evidence boundaries.

## Promotion boundary

This receipt proves exact-head source validation and artifact identity. It does not claim merge into the V16 branch, Vercel preview deployment, production promotion, accessibility certification, ATS vendor acceptance, recruiter response, hiring outcome, current certification status, company affiliation, customer impact, or production-system operation. Those states require their own receipts.
