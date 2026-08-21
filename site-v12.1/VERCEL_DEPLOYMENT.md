# Vercel promotion contract

The source capsule is provider-neutral. For the existing Vercel project, use the unpacked directory as the project root.

Required production receipt:

- exact Git commit or source-capsule SHA-256;
- deployment ID and canonical alias;
- successful build output showing `npm run check`;
- public verification of all human routes and machine APIs;
- `application/x-protobuf` for `machine/bootstrap.pb`;
- expected graph SHA-256;
- zero active runtime error clusters after the verification traffic.

Do not infer deployment from a checked-in `vercel.json` or from a successful local build.
