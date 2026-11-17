# Contributing

Documentation corrections and focused improvements are welcome. Use the
[bug report form](https://github.com/JustBeanie/timer-panel-card/issues/new?template=bug_report.yml)
for problems, or describe the task you want to accomplish in a
[feature request](https://github.com/JustBeanie/timer-panel-card/issues/new?template=feature_request.yml).

## Project layout

| Path | Purpose |
| --- | --- |
| `dist/timer-panel-card.js` | Both the source and installable card. Edit this file directly. |
| `hacs.json` | HACS display name, filename, and minimum HA version. |
| `examples/` | Complete card configurations for users to copy. |
| `docs/` | Configuration, troubleshooting, comparisons, and publishing. |
| `scripts/check-release.mjs` | Distribution filename, version, and changelog checks. |
| `.github/workflows/` | HACS validation and release publishing. |

## Making a change

1. Fork the repository and create a branch from `main`.
2. Make a focused change. Update relevant documentation and add a note under **Unreleased**
   in the changelog. The maintainer assigns release versions.
3. With Node.js 24 installed, run:

   ```sh
   node --check dist/timer-panel-card.js
   node scripts/check-release.mjs
   git diff --check
   ```

There is no `npm install` or build step. For documentation changes, check relative links and
paste changed card examples into Home Assistant's card editor with your own entity IDs.
Do not include personal dashboard configuration or credentials in the PR.

## Checking a card change

Use a test dashboard and timer helper. Follow the [manual installation steps](docs/troubleshooting.md#manual-installation)
to load your edited JS, using a fresh resource URL query string after each change. Keep one
resource registration; an existing HACS copy can otherwise mask your changes.

Check idle, active, paused, canceled, and finished timer states; a missing timer; header click
and keyboard activation; button targets; and light/dark themes at phone and desktop widths.
Check the browser console for errors. If a behavior was not tested, say so in the PR.

Open a PR describing the problem, resulting behavior, and checks you ran. GitHub runs package
and HACS validation. See [Publishing](docs/publishing.md) for maintainer release instructions.
