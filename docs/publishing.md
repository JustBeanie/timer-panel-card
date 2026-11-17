# Publishing and default HACS inclusion

This repository is a HACS **plugin** (called **Dashboard** in the installation UI).
It ships `dist/timer-panel-card.js` directly: that file is both the source and the installable
module. There is no bundler or package installation step.

## Repository requirements

- Keep the repository public, active, with issues enabled, a description, and relevant topics.
- Keep the MIT license, README usage instructions and card image, and root `hacs.json`.
- Keep the manifest's `filename` aligned with the file in `dist/`.
- Run `.github/workflows/hacs.yaml` on pushes, pull requests, and the daily schedule without
  `ignore`. The package job also checks JavaScript syntax and the distribution/version contract.

HACS looks in `dist/` before release assets or the repository root, so a JavaScript release
attachment is convenient but not required for this layout. Release assets are also published
for manual installers. Do not set `content_in_root` or `zip_release` for this layout.

## Release procedure

1. Update `VERSION` in `dist/timer-panel-card.js` and add a dated `CHANGELOG.md` entry.
2. Run these checks from the repository root (replace the example version as appropriate):

   ```sh
   node --check dist/timer-panel-card.js
   node scripts/check-release.mjs v1.0.3
   ```

3. Merge the reviewed changes and wait for HACS Validation to pass on the commit to release.
4. Tag that exact commit and push the tag:

   ```sh
   git tag v1.0.3 <validated-commit-sha>
   git push origin v1.0.3
   ```

5. The Release workflow checks the tag/version/changelog and runs HACS validation again. Its
   dependent publish job creates the GitHub release with the JS file and `SHA256SUMS` only after
   all checks succeed. Do not manually publish a release while those checks are still running.
6. Verify the release is published (not draft/prerelease), download the attachment, and compare
   its checksum with the tagged file. Confirm installation through HACS using the tagged `dist/`.

The release body links to its validation run. A tag without a published release is insufficient
for default-catalog submission. If validation fails, fix the problem and release a new version;
do not move a tag for an already published release.

## Submitting to hacs/default

The repository owner or a major contributor must submit. First confirm the release workflow
above succeeded, no checks were ignored, and the latest release contains the expected JS file,
manifest, README/image, and license.

Fork [hacs/default](https://github.com/hacs/default), branch from its current `master`, and add
exactly this string to the `plugin` JSON array in case-insensitive alphabetical order:

```json
"JustBeanie/timer-panel-card"
```

Check for an existing entry or open submission first. Open the PR from a personal fork, allow
maintainer edits, and use the current upstream PR template. Include links to the published release
and its successful HACS validation run. Mark hassfest as not applicable: it validates integrations,
not dashboard cards. Include the [comparison](alternatives.md) when explaining the card's scope.

The submission must pass upstream JSON/sorting and repository checks. Maintainers control review
and acceptance; a passing action or custom-repository installation does not mean the card is in
the default catalog. Keep the README's custom-repository instructions until inclusion is merged.

## Official references

- [General publishing requirements and manifest keys](https://www.hacs.xyz/docs/publish/start/)
- [Dashboard plugin layout](https://www.hacs.xyz/docs/publish/plugin/)
- [HACS validation action](https://www.hacs.xyz/docs/publish/action/)
- [Default inclusion requirements](https://www.hacs.xyz/docs/publish/include/)
- [Upstream PR template](https://github.com/hacs/default/blob/master/.github/PULL_REQUEST_TEMPLATE.md)
