# Distinct dog interactions and shared Higgsfield care buttons

The original release reused a greeting for care actions and rendered rest as a still. This update gives the dog twelve distinct motion assets (eleven newly generated clips plus the existing greeting), with a sleeping rest loop. The six care illustrations are a shared Higgsfield atlas used by every companion, while the dog remains restricted to authenticated Olivia on her assigned doudou profile.

Care actions remain locked until actual playback completion. Rest can interrupt immediately; stale completions or rejected play promises cannot override it. Playback failures unlock actions, and replaying spoken feedback preserves the current care clip. Reduced motion uses action-specific stills, including a sleeping rest image.

## Validation

- Build, content audit, pronunciation checks: PASS.
- Full suite after rebasing latest main: 757 passed, 171 database-dependent skipped.
- Independent read-only Chromium review: PASS after fixing autoplay rejection and spoken-feedback interruption. Delayed play rejection after rest does not override rest.
- `browser-qa.py`: actual playback of each care action, all game targets, eleven-second rest looping, interruption, pause/resume, twelve media decodes, 390/820/1440 layouts, shared icons on the original mascot, video-failure sleep poster, autoplay rejection recovery. Uses intercepted synthetic API fixtures; never mutates real child accounts.
- Generation provenance, model requests, costs, asset SHA-256: `completed-generation.json`. Eleven Kling 3.0 standard silent clips (66 credits) and one icon atlas (0.25 credits), total 66.25.

Source processing is recorded in `prepare-media.py`. Rest uses the closed-eye segment in forward/reverse sequence to avoid returning to the initial standing greeting pose. Raw generated downloads and visual contact sheets are local QA artifacts, not deployed source.

No database or saved-progress migration. Rollback is the previous Railway deployment. Physical tablet hardware and live speech provider output were not tested in this update.
