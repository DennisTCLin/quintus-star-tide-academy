# Lossless seen-history storage

Base: 054f6a3db8ce093bb331020b5b8d5ded48fa1aed. The complete original
learning-performance fixture is unchanged, including all non-math static seen
IDs, all six profiles and the 96 KiB ceiling. Both base and question-only branch
were 105597 bytes. Compact JSON is 85855 bytes; all 4773 seen IDs remain ordered.
`seen` remains distinct from mastered successes and never grants rewards.

`prefix-v1` stores each ID as [shared UTF-16 prefix length with previous ID,
remaining suffix]. It is self-contained, independent of catalog ordering, and
only used when smaller. Over-budget writer inputs remain arrays. Reader errors
are rejected without truncation. Existing catalog validation is unchanged.
Unknown string IDs roundtrip through the codec but remain subject to the old
full validator's rejection policy.

Runtime arrays and public API arrays are unchanged. The non-enumerable family
serialization hook is restored by newFamily/validateFamily, and deliberately
removed by structuredClone after publicState redacts future question IDs. Actual
local storage, backup and PostgreSQL writes use JSON.stringify on this validated
family. No historical database rows are bulk rewritten.

## Measurement

Metrics JSON contains 100 measured iterations after 20 warmups, local Node, not
phone hardware. Exact fixture setup matches learning-performance.test.ts.
serialize = JSON.stringify(family); parseValidate = validateFamily(JSON.parse(raw)).
Base serialization p95 0.161 ms / parse+validate 2.193 ms; branch serialization
p95 0.919 ms / parse+validate 2.805 ms in this run. Size improves at a measurable
CPU cost; these are local observations, not device guarantees. The original
benchmark also measures validate+allocate+serialize with its unchanged scenario.

## Deployment and rollback

Publish the tested reader+writer together only after integrating the currently
live NPC baseline and release coordination. Never deploy a reader-only version
that fails the existing size test as an intermediate release.

Retain the deployed image/commit containing the new reader. If compact writing
must be stopped, redeploy that SAME reader-capable release with
`STAR_TIDE_COMPACT_SEEN_WRITES=off`. Existing compact rows remain readable; future
server JSON writes use arrays. This is a degraded rollback mode, not a claim
that array-only output meets the 96 KiB steady-state target. Unit coverage reads
existing compact data with the switch off and verifies identical history and
balances. Browser/offline code remains reader-capable; this server switch does
not remove the decoder or mutate data in bulk.

**Do not roll back directly to an older runtime without the decoder.** Old
runtimes cannot read compact rows or backups. Returning to such a runtime needs
a separate audited backup/conversion procedure; none is executed by this PR.
Keep pre-release snapshots according to the existing operator backup procedure.

No production accounts, progress, rewards or database rows have been changed by
this branch. Physical iPad Safari verification remains unavailable.
