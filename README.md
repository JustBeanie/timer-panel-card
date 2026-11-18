# Timer Panel Card

[![HACS Default](https://img.shields.io/badge/HACS-Default-1479A8?style=flat-square&logo=homeassistant)](https://github.com/hacs/default/pull/14348)
[![Latest release](https://img.shields.io/github/v/release/JustBeanie/timer-panel-card?display_name=tag&sort=semver&style=flat-square)](https://github.com/JustBeanie/timer-panel-card/releases/latest)
[![Total card downloads](https://img.shields.io/github/downloads/JustBeanie/timer-panel-card/timer-panel-card.js?label=total%20downloads&displayAssetName=false&style=flat-square&color=1479A8)](https://github.com/JustBeanie/timer-panel-card/releases)
[![Latest release card downloads](https://img.shields.io/github/downloads/JustBeanie/timer-panel-card/latest/timer-panel-card.js?sort=semver&label=latest%20downloads&displayAssetName=false&style=flat-square&color=1479A8)](https://github.com/JustBeanie/timer-panel-card/releases/latest)

[![HACS validation](https://img.shields.io/github/actions/workflow/status/JustBeanie/timer-panel-card/hacs.yaml?branch=main&label=HACS%20validation&style=flat-square)](https://github.com/JustBeanie/timer-panel-card/actions/workflows/hacs.yaml)
[![Commit activity](https://img.shields.io/github/commit-activity/m/JustBeanie/timer-panel-card?label=activity&style=flat-square)](https://github.com/JustBeanie/timer-panel-card/commits/main/)
[![Open issues](https://img.shields.io/github/issues/JustBeanie/timer-panel-card?style=flat-square)](https://github.com/JustBeanie/timer-panel-card/issues)
[![License](https://img.shields.io/github/license/JustBeanie/timer-panel-card?style=flat-square)](LICENSE)

<img src="docs/icon.svg" alt="Timer Panel Card icon" align="middle"> <a href="https://www.buymeacoffee.com/JustBeanie"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy me a coffee" width="144" align="middle"></a>

Give your Home Assistant timer a place on your dashboard: preset buttons when idle, a live
countdown and progress bar when running, and the device's status alongside it.

![Timer Panel Card preview: running on the left, idle on the right](docs/card.svg)

[![Open Timer Panel Card in Marketplace](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=JustBeanie&repository=timer-panel-card&category=frontend)

[Quick start](#quick-start) · [Examples](examples/README.md) · [All options](docs/configuration.md) · [Troubleshooting](docs/troubleshooting.md)

Use it for a kitchen timer, a TV sleep timer, or an extractor fan. You choose the button labels,
durations, and actions; the card follows your Home Assistant theme.

**Before you start:** Home Assistant 2024.11 or newer and a Timer helper. Set up the panel in
the dashboard card picker. Device shutdown and notifications use separate Home Assistant automations.

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

Already have a Timer helper? Select it in the next step.

Otherwise, go to **Settings → Devices & services → Helpers → Create helper → Timer**. Give it a
name such as **Kitchen** and save it.

### 3. Add the panel

1. Edit your dashboard and choose **Add card**. Open **By card** if shown, then search for **Timer Panel Card**.
   Select the card to open its visual editor.

   ![Home Assistant's By card tab with Timer Panel Card in the search results](docs/card-picker.png)

2. Select your **Timer helper**. You can also select a **Companion entity** to show its status.
3. Save the card. The default buttons start a 15-minute timer and cancel it.

   ![Timer Panel Card visual editor with Kitchen timer selected, Idle buttons expanded, a live preview, and the Save button](docs/visual-editor.png)

**Try it:** press **15m**. The countdown and progress bar appear, and the preset becomes **Cancel**.
Tap the header to open Home Assistant's timer controls. Press **Cancel** to return to the preset.

If you see “Custom element doesn't exist” or “Entity not found,” follow the
[troubleshooting steps](docs/troubleshooting.md).

## Make it yours

| I want to… | Where to edit |
| --- | --- |
| Rename the panel or change its icon | Open **Appearance and warnings**. |
| Start a 30-minute timer | Open **Idle buttons → 15m**. Change the label to `30m` and the action duration to 30 minutes. |
| Offer several durations | Select **Add idle button** and set a label and duration for each preset. |
| Show my TV or fan's status | Select it under **Companion entity**. |
| Add controls while running | Open **Running buttons** and select **Add running button**. Choose an action and target. |

Adding `device` shows its status; it does not connect the timer to device shutdown. Active and
paused timers use the same running buttons. Use the header's timer dialog to pause or resume.

## Ready-to-copy examples

- [Kitchen timer](examples/kitchen-timer.yaml): a 15-minute preset and Cancel.
- [TV sleep timer](examples/tv-sleep-timer.yaml): 30-minute, 1-hour, and 2-hour presets with TV status.
- [Extractor fan](examples/extractor-fan.yaml): 10/30-minute presets and a Fan off action.

The [YAML example guide](examples/README.md) explains which IDs to replace and what each example does.
Use **Show code editor** in Home Assistant to edit the YAML directly.

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
