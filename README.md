# Timer Panel Card

[![HACS Default](https://img.shields.io/badge/HACS-Default-41BDF5.svg)](https://github.com/hacs/default/pull/14348)
[![Latest release](https://img.shields.io/github/v/release/JustBeanie/timer-panel-card?display_name=tag&sort=semver)](https://github.com/JustBeanie/timer-panel-card/releases/latest)
[![HACS validation](https://github.com/JustBeanie/timer-panel-card/actions/workflows/hacs.yaml/badge.svg?branch=main)](https://github.com/JustBeanie/timer-panel-card/actions/workflows/hacs.yaml)
[![Commit activity](https://img.shields.io/github/commit-activity/m/JustBeanie/timer-panel-card?label=activity)](https://github.com/JustBeanie/timer-panel-card/commits/main/)
[![Open issues](https://img.shields.io/github/issues/JustBeanie/timer-panel-card)](https://github.com/JustBeanie/timer-panel-card/issues)
[![License](https://img.shields.io/github/license/JustBeanie/timer-panel-card)](LICENSE)

Give your Home Assistant timer a place on your dashboard: preset buttons when idle, a live
countdown and progress bar when running, and the device's status alongside it.

![Timer Panel Card preview: running on the left, idle on the right](docs/card.svg)

[![Open Timer Panel Card in Marketplace](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=JustBeanie&repository=timer-panel-card&category=frontend)

[Quick start](#quick-start) · [Examples](examples/README.md) · [All options](docs/configuration.md) · [Troubleshooting](docs/troubleshooting.md)

Use it for a kitchen timer, a TV sleep timer, or an extractor fan. You choose the button labels,
durations, and actions; the card follows your Home Assistant theme.

**Before you start:** Home Assistant 2024.11 or newer and a `timer.*` helper. Card configuration
uses copy-and-paste YAML; there is no visual configuration editor. Device shutdown and
notifications need separate Home Assistant automations.

## Quick start

### 1. Install the card

Timer Panel Card is included in the default catalog. **Marketplace is built into Home Assistant
2026.11 and newer**; on older versions, use HACS. Click the button above, or:

1. Open **Marketplace** (Home Assistant 2026.11+) or **HACS** on older versions.
2. Search for **Timer Panel Card** and open it.
3. Download the card, then refresh your browser.

Can't find it yet? [Refresh the catalog or add the repository manually](docs/troubleshooting.md#cannot-find-the-card-in-hacs).
For advanced setups that manage JavaScript resources directly, see
[manual resource installation](docs/troubleshooting.md#manual-resource-installation).

### 2. Choose a timer

Already have a `timer.*` helper? Use its entity ID in the next step.

Otherwise, go to **Settings → Devices & services → Helpers → Create helper → Timer**. Give it a
name such as **Kitchen**, save it, and open its settings to find the entity ID, for example
`timer.kitchen`. Copy the ID rather than the display name.

### 3. Add the panel

Edit your dashboard → **Add card → Manual**. Paste this and replace `timer.kitchen` with your
timer's entity ID, then save:

```yaml
type: custom:timer-panel-card
timer: timer.kitchen
idle_buttons:
  - label: 15m
    action:
      action: perform-action
      perform_action: timer.start
      data:
        duration: "00:15:00"
running_buttons:
  - label: Cancel
    style: danger
    action:
      action: perform-action
      perform_action: timer.cancel
```

**Try it:** press **15m**. The countdown and progress bar appear, and the preset becomes **Cancel**.
Tap the header to open Home Assistant's timer controls. Press **Cancel** to return to the preset.

If you see “Custom element doesn't exist” or “Entity not found,” follow the
[troubleshooting steps](docs/troubleshooting.md).

## Make it yours

| I want to… | Change this |
| --- | --- |
| Rename the panel | Add `name: Kitchen timer` below `timer:`. |
| Use a different icon | Add `icon: mdi:timer-outline`. |
| Start a 30-minute timer | Change the button's `label` to `30m` and `duration` to `"00:30:00"`. |
| Offer several durations | Copy the entire `- label:` entry inside `idle_buttons` and change the label and duration. |
| Show my TV or fan's status | Add `device: media_player.living_room_tv` or your own device entity ID. |
| Add controls while running | Add entries to `running_buttons`; [see the button reference](docs/configuration.md#buttons). |

Adding `device` shows its status; it does not connect the timer to device shutdown. Active and
paused timers use the same running buttons. Use the header's timer dialog to pause or resume.

## Ready-to-copy examples

- [Kitchen timer](examples/kitchen-timer.yaml): a 15-minute preset and Cancel.
- [TV sleep timer](examples/tv-sleep-timer.yaml): 30-minute, 1-hour, and 2-hour presets with TV status.
- [Extractor fan](examples/extractor-fan.yaml): 10/30-minute presets and a Fan off action.

The [example guide](examples/README.md) explains which IDs to replace and what each example does.

## Updates and help

Update through Marketplace (HACS on older versions), then reload your dashboard. Manual installs replace the JS file
and update its resource URL's version query. [Update and cache help](docs/troubleshooting.md#the-card-still-looks-like-an-older-version).

- [Troubleshooting](docs/troubleshooting.md): loading problems, missing entities, buttons, and timers.
- [Report a bug or suggest an improvement](https://github.com/JustBeanie/timer-panel-card/issues/new/choose).
- [Changelog](CHANGELOG.md): what changed between releases.
- [Compare other timer cards](docs/alternatives.md): alternatives for different needs.

## Contributing

Documentation fixes, bug reports, and pull requests are welcome. See [Contributing](CONTRIBUTING.md)
for the project layout and checks, and [Publishing](docs/publishing.md) for release instructions.

## License

[MIT](LICENSE)
