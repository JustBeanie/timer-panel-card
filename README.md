# Timer Panel Card

A Lovelace card that turns a Home Assistant `timer` entity into one self-contained panel: the device
it belongs to, a live countdown, a bar that drains as time runs out, and a set of buttons that
changes with the timer's state.

The point is the two states. **Idle**, the panel is a row of presets — the things you might start.
**Running**, those are replaced by the things you might do to a running timer: adjust it, stop it.
You choose which actions belong in each group. Active and paused timers share the running group;
the card does not automatically disable actions that are invalid for a particular timer state.

![Timer Panel Card, running and idle](docs/card.svg)

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=JustBeanie&repository=timer-panel-card&category=frontend)

## When to use this card

Use Timer Panel Card for one existing `timer.*` helper paired with a device, with labeled preset
buttons while idle and your own action buttons while running or paused. It is a single JavaScript
module with no runtime dependencies or build step. Configuration is YAML-only.

Other cards already provide live countdowns, progress bars, presets, and state-dependent controls.
[Simple Timer Card](https://github.com/eyalgal/simple-timer-card) even supports custom action buttons
with state filters. This card's focus is its compact device-and-timer panel and small configuration
surface, rather than a unique timer capability. See the [comparison with existing cards](docs/alternatives.md).

A timer does not send a new state every second. This card derives the countdown from `finishes_at`
in the browser once a second while active, without polling Home Assistant. Server-side templates
using `now()` refresh once a minute; other frontend timer cards can also update locally.

The companion `device` is display context. The card does **not** create timers, turn devices off
when a timer finishes, or send notifications. Configure those behaviors in Home Assistant
automations so they also work when the dashboard is closed.

## Install

### Marketplace (HACS)

Since Home Assistant 2026.11, HACS is built into core as the **Marketplace**
(Settings → Marketplace). On older versions, use the HACS integration; the steps are the same.

Click the button above, or add it by hand:

1. Marketplace (or HACS) → three-dot menu → **Custom repositories**
2. Repository `JustBeanie/timer-panel-card`, type **Dashboard**
3. Find "Timer Panel Card" and download it
4. Hard-refresh the browser (Ctrl/Cmd + Shift + R)

This is currently a **custom repository**, not a default catalog listing. If the card is not
available after downloading, check **Settings → Dashboards → Resources** (enable Advanced mode
in your profile if needed) for this JavaScript module:

```text
/hacsfiles/timer-panel-card/timer-panel-card.js
```

Keep only one resource entry: remove an old `/local/timer-panel-card.js` entry when moving from
a manual installation to HACS. In YAML resource mode, add the URL above with `type: module` to
your existing dashboard resources configuration instead.

### Manual

Copy `dist/timer-panel-card.js` to `<config>/www/` and add a dashboard resource pointing at
`/local/timer-panel-card.js`, type **JavaScript module**.

### Add a card

Requires Home Assistant **2024.11 or newer** and an existing timer helper. Create one under
**Settings → Devices & services → Helpers → Create helper → Timer** if needed. Then edit a
dashboard, choose **Add card → Manual**, and paste this, replacing `timer.kitchen` with your helper:

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

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `type` | string | — | `custom:timer-panel-card` |
| `timer` | string | **required** | A `timer.*` entity |
| `device` | string | — | Companion entity — the TV, fan or light the timer governs. Any domain. Drives the second line and the idle icon tint |
| `name` | string or name parts | device / timer name | Panel title. A string is used as typed; name parts such as `[{type: area}, {type: entity}]` are composed by Home Assistant (2026.4+). |
| `icon` | string | timer's icon | Any `mdi:` icon |
| `secondary` | string | derived | Replaces the auto-generated second line |
| `device_attribute` | string | — | Non-empty attribute appended to the device state, e.g. `app_name` |
| `footer` | string | — | Small muted caption under the buttons. Good for a caveat you'd otherwise forget |
| `caution_seconds` | number | `300` | Below this, the bar and countdown turn `--warning-color` |
| `warn_seconds` | number | `60` | Below this, they turn `--error-color` |
| `idle_buttons` | list | `[]` | Shown while the timer is idle |
| `running_buttons` | list | `[]` | Shown while the timer is active **or paused** |

Tapping the header opens the timer's more-info dialog, where Home Assistant's own duration editor
lives.

### Buttons

Each entry takes a `label`, an optional `icon`, an optional `style`, and an `action`.

| Key | Description |
|---|---|
| `label` | Button text |
| `icon` | Optional `mdi:` icon, drawn before the label |
| `style` | `danger` (red) or `accent` (themed). Omit for the default outline |
| `action` | A Home Assistant action config |

Supported actions: `perform-action` (also the legacy `call-service` spelling), `more-info`,
`navigate`, `url`, `none`. This is a subset of Home Assistant's action configuration:
`confirmation`, `assist`, hold actions, and double-tap actions are not implemented.
Use explicit `timer.start`, `timer.pause`, or `timer.cancel` actions instead of `toggle`:
the legacy toggle handler calls `homeassistant.toggle` on the timer, which has no toggle service.

**Targets.** A `perform-action` with no `target` targets the card's own `timer` — which is what you
want for `timer.start`, `timer.cancel`, `timer.pause`. When you're calling a script or an entity in
another domain, set the target explicitly, and pass **`target: {}`** for a script that takes entity
IDs as fields rather than as a target:

```yaml
- label: "+15m"
  action:
    action: perform-action
    perform_action: script.add_time      # a script with `timer` and `duration` fields
    target: {}                           # no target — the script gets everything in `data`
    data:
      timer: timer.tv
      duration: { minutes: 15 }
```

## Examples

### A TV sleep timer

This example controls an existing timer. TV shutdown and on-screen warnings need separate
automations; the footer is only descriptive text.

```yaml
type: custom:timer-panel-card
timer: timer.living_room_tv
device: media_player.living_room_tv
name: Living room TV
icon: mdi:television
footer: TV shutdown requires a separate automation
idle_buttons:
  - label: 30m
    action: { action: perform-action, perform_action: timer.start, data: { duration: "00:30:00" } }
  - label: 1h
    action: { action: perform-action, perform_action: timer.start, data: { duration: "01:00:00" } }
  - label: 2h
    action: { action: perform-action, perform_action: timer.start, data: { duration: "02:00:00" } }
running_buttons:
  - label: "−15m"
    action: { action: perform-action, perform_action: timer.change, data: { duration: "-00:15:00" } }
  - label: "+15m"
    action: { action: perform-action, perform_action: timer.change, data: { duration: "00:15:00" } }
  - label: Cancel
    style: danger
    action: { action: perform-action, perform_action: timer.cancel }
```

The `timer.change` buttons work only while active and cannot extend the remaining time past the
duration used to start the timer. They remain visible when paused because the running button
group is shared. Use the header's more-info dialog to resume, or call your own script for more
advanced adjustment behavior. See [Home Assistant's timer.change documentation](https://www.home-assistant.io/actions/timer.change/).

### An extractor fan

Note that stopping the fan and cancelling the timer are different things — here the red button turns
the fan off and leaves the timer alone.

```yaml
type: custom:timer-panel-card
timer: timer.kitchen_exhaust
device: fan.kitchen_exhaust
name: Kitchen exhaust
icon: mdi:fan
caution_seconds: 120
idle_buttons:
  - label: 10m
    action: { action: perform-action, perform_action: timer.start, data: { duration: "00:10:00" } }
  - label: 30m
    action: { action: perform-action, perform_action: timer.start, data: { duration: "00:30:00" } }
running_buttons:
  - label: Fan off
    style: danger
    icon: mdi:fan-off
    action:
      action: perform-action
      perform_action: fan.turn_off
      target: { entity_id: fan.kitchen_exhaust }
```

## Notes

- **Colours are theme variables**, never hard-coded: `--primary-color`, `--warning-color`,
  `--error-color`, `--divider-color`, `--secondary-text-color`. The card renders a real `<ha-card>`,
  so it inherits whatever your theme does to cards.
- **The bar is proportional to the timer's `duration` attribute**, so a service that extends a
  running timer rescales the bar instead of overflowing it.
- In a **sections** view the panel requests 12 columns by default and a minimum of 6 columns.
- The second line is derived: the device's state, then `ends 10:42 PM` while running, `paused` when
  paused, or `no timer set` when the timer is idle and the device is on. `secondary` overrides all
  of it.

## Maintaining and publishing

See the [release and default HACS submission guide](docs/publishing.md). Installation as a custom
repository is available immediately; inclusion in the default catalog requires HACS maintainer review.

## License

MIT
