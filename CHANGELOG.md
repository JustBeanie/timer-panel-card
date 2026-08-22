# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
