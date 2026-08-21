# GlacierEQ Systems Atlas V12.1 Source Capsule

This directory preserves the exact reproducible release-candidate source for the live recruiter/runtime portfolio.

## Verify

```bash
python unpack-and-verify.py
cd unpacked
npm run check
```

`npm run check` performs four gates:

1. verifies and materializes the deterministic binary-artifact bundle;
2. regenerates the public release manifest;
3. executes the Node contract suite;
4. verifies every public byte count and SHA-256, the graph digest, HTML contracts, Crown Jewel count, and real Protobuf binary.

## Evidence boundary

The capsule closes source preservation, not provider promotion. Production closure still requires the exact merged source revision, Vercel deployment ID, successful build log, public route/API verification, and runtime-error check to be recorded together.

The complete PSYSOC-X diligence report is inside the capsule at `docs/PSYSOCX_V12_1_DILIGENCE.md`, with a machine receipt at `receipts/psysocx-v12.1-diligence.json`.
