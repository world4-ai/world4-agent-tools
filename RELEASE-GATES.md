# Release gates

## Current preparation status

GitHub publication has been authorized for `world4-ai/world4-agent-tools`. npm publication is separate and has not been authorized. The source license has not been selected; no MIT or Apache license grant is claimed. The README banner is a brand asset and does not grant trademark rights. Package names remain `@agentarea/*`; proposed alternative npm scopes are not reserved or guaranteed.

## Before publication

- Explicitly select and approve the source license.
- Review the allowlisted integration source and banner rights.
- Run standalone build, typecheck and tests.
- Scan source, lockfile, assets and future Git history for secrets and private references.
- Configure a private vulnerability reporting channel.
- Confirm GitHub publication approval separately from npm publication.
- Use only author and committer `world4-ai <world@purexbt.dev>` for the prepared initial history, with no co-author trailers. Verify email association in GitHub before promising contributor attribution.

Excluded: application/backend source, deployment and VPS configuration, production environment files, database exports, original Git history, internal reports, private QA artifacts and unrelated brand/3D assets.
