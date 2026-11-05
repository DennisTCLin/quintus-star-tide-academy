# Unified release integration (2026-11-05)

This candidate combines the new repository root snapshot `054f6a3db8ce093bb331020b5b8d5ded48fa1aed` with the running production source `a8166b25da81fb5bf478124920130bd11891017e` from the former repository. Neither source alone contains all current work.

The explicit three-way content base is `a2ce19d80a66cd3ffee78b355243073aea048b65`, the original source tree exported to the new repository. Because the latest new-repository snapshot has no parent, this is a content/provenance merge, not an ancestry-based fast-forward. Both references were fetched locally before integration.

- Preserve the new snapshot's invitations, stepped questions, added question banks and pronunciation corrections.
- Preserve production's complete shared conquest, NPC worker, reports/acknowledgements, character growth, elements, artwork and tests.
- Resolve the App navigation conflict by retaining conquest-report focus/scroll behavior and the speech error callback.
- Merge reviewed pronunciation overrides by key against the explicit base; regenerate both interface dictionaries from the combined sources.
- Regenerate the content audit rather than choosing either old report.

The production service, URL and database are not changed by this source integration. No player rows are modified. Test results from either input are not acceptance evidence for this combined candidate. Deployment remains blocked until the final combined source passes tests and coordinated verification.
