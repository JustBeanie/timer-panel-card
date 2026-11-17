# Configuration reference

[Back to the quick start](../README.md#quick-start) · [Examples](../examples/README.md) · [Troubleshooting](troubleshooting.md)

Edit these options in the dashboard card’s YAML editor. Start with a working example, then add
only the options you need. Button lists default to empty; omitting them gives a display-only card.

## Card options


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
| `caution_seconds` | number | `300` | At or below this many seconds, the bar and countdown turn `--warning-color` |
| `warn_seconds` | number | `60` | At or below this many seconds, they turn `--error-color` |
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

The `script.add_time` action above is an example of calling **your own script**; that script is
not included with the card. For simple adjustments, a running button can call `timer.change`:

```yaml
running_buttons:
  - label: "+5m"
    action:
      action: perform-action
      perform_action: timer.change
      data:
        duration: "00:05:00"
```

This works only while the timer is active and only if the resulting remaining time is no greater
than the duration used to start it. The button stays visible while paused. See
[adjustment limits](troubleshooting.md#add-time-does-not-work) before using it.

## Display behavior


- **Colours are theme variables**, never hard-coded: `--primary-color`, `--warning-color`,
  `--error-color`, `--divider-color`, `--secondary-text-color`. The card renders a real `<ha-card>`,
  so it inherits whatever your theme does to cards.
- **The bar is proportional to the timer's `duration` attribute**, so a service that extends a
  running timer rescales the bar instead of overflowing it.
- In a **sections** view the panel requests 12 columns by default and a minimum of 6 columns.
- The second line is derived: the device's state, then `ends 10:42 PM` while running, `paused` when
  paused, or `no timer set` when the timer is idle and the device is on. `secondary` overrides all
  of it.
