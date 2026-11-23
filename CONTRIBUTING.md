# Contributing

Keep changes easy to run and judge. Explain the behavior you changed, show the result, and preserve the original experiment’s measurements.

## Set up

Use Node.js 22.12 or later and npm, then run:

```sh
npm ci
npm run build
npm run check
```

Run either app with `npm run dev:astra` or `npm run dev:sol`. These serve compiled output; restart after editing. Keep app-specific changes inside the corresponding `apps/` directory. Shared serving, checks and browser tools belong in `scripts/`.

## Browser verification

For gameplay changes, exercise walking, turning, orbit, stomp and reset. Check key release, leaving the tab, refresh and the initial camera view. Test at 1280×720 and include a screenshot when the result is visible.

The automated suite uses Python 3.10 or later and Playwright:

```sh
python3 -m venv .venv
```

Activate the environment (`source .venv/bin/activate` on macOS/Linux, or `.venv\Scripts\Activate.ps1` in PowerShell), then:

```sh
python -m pip install -r requirements-dev.txt
python -m playwright install chromium
python scripts/smoke.py
```

The suite starts temporary local servers, checks actual runtime position/impact state and saves ignored artifacts under `test-results/`. An existing Chromium executable can be selected with `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. Do not put a personal executable path in source files.

Regenerate documentation images with:

```sh
python scripts/screenshots.py
```

Capture the app only, without desktop chrome, account panels or personal branding. Keep OpenStreetMap credits visible. Do not replace screenshots with generated concept art.

## Before a pull request

- [ ] Build both apps and run `npm run check`.
- [ ] Run `npm run privacy -- --include-builds` and `npm run test:privacy`.
- [ ] Run browser checks when changing gameplay, rendering or asset paths.
- [ ] Include screenshots for visible changes.
- [ ] Document new data sources and retain their attribution.
- [ ] Keep historical counters in `benchmark/results.json` unchanged.

A local private denylist can add names or identifiers to the audit without checking them into the repo:

```sh
python scripts/privacy_check.py --include-builds --denylist ../private-identifiers.txt
```

The scanner reports file names and categories, never matching values. It is a practical check, not a proof that arbitrary documents or pixels contain no identifying information. Review screenshots and the complete staged file list as well. Add `--anonymous-history` when checking an anonymous publication checkout; hosted CI checks content without assuming the runner’s auxiliary refs use the same identity policy.

## Commit attribution

Use your GitHub-provided no-reply email in Git author settings to receive contribution credit without publishing a personal email. Authentication through `gh` authorizes the push; the commit email links the contribution to your profile. The repository’s `.mailmap` links the initial publication commits to its maintainer.

## Benchmark changes

Record a new run separately with its prompt, model, reasoning setting, tool access, time limit and exact usage source. Do not apply later fixes and attribute them to the original ten-minute run. Label screenshots of modified code as current examples. One scored run per model is not enough to claim a universal ranking.

## Code and data

Use the existing JavaScript module style and avoid reformatting unrelated generated code. Add dependencies only when they solve a concrete problem. Commit the root lockfile. Do not check in `node_modules`, build directories, sessions, authentication files or provider project configuration.

Code contributions use the repository’s MIT license. Geographic data remains under its existing data license; preserve source terms and the in-game attribution. The [notice](NOTICE.md) lists the boundaries.
