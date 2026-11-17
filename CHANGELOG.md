# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

- Reorganize the README around installation, a first working panel, and common customizations.
- Add copyable examples, a configuration reference, troubleshooting, and contributor guidance.
- Add bug report and feature request forms to make asking for help easier.

## [1.0.3] - 2026-11-16

- Validate the distributed JavaScript, manifest filename, version, and changelog before releases.
- Publish the JavaScript download and checksum only after HACS validation passes, with no ignored checks.
- Remove the obsolete `render_readme` manifest option; HACS uses the README automatically.
- Add a minimal setup example, resource troubleshooting, and a sourced comparison with existing timer cards.
- Clarify that device shutdown needs an automation, paused timers share the running controls,
  `timer.change` has duration limits, and only the documented action subset is supported.
- Document the default-catalog submission process. Card behavior is unchanged.

## [1.0.2] - 2026-11-14

- Panel titles now come from `hass.formatEntityName` (Home Assistant 2026.4+), so they match
  the built-in cards under the 2026.11 naming change (device name + entity name). Falls back to
  `friendly_name` on older versions, which Home Assistant plans to deprecate.
- `name` also accepts entity name parts (the `entity_name` selector format), e.g.
  `[{type: area}, {type: entity}]`.
- README: HACS is now the built-in Marketplace from Home Assistant 2026.11.

## [1.0.1] - 2026-08-21

- Guard `customElements.define()` and the `window.customCards` push against a double
  registration. Migrating from a manual `/local/` copy to the HACS install leaves both
  resources registered for one page load, and the unguarded define threw on the second.

## [1.0.0] - 2026-08-21

Initial release.

- One panel per `timer` entity: header, live countdown, drain bar, buttons, optional footer.
- Countdown ticks client-side off `finishes_at`, so it does not depend on state changes the
  timer domain never emits while running.
- Separate `idle_buttons` and `running_buttons`; the running set also covers `paused`, so a
  paused timer keeps its controls.
- Bar and countdown recolour at `caution_seconds` and `warn_seconds`, using theme variables.
- Optional `device` entity drives the second line and tints the icon while it is on.
- Buttons take standard action configs (`perform-action`, `more-info`, `toggle`, `navigate`,
  `url`), defaulting their target to the card's timer.
- `getGridOptions()` so the panel fills its column in a sections view.
