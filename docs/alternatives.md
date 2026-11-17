# Timer card comparison

Reviewed 2026-11-16 against the projects' published documentation and the
[HACS default plugin list](https://github.com/hacs/default/blob/master/plugin).
This is a documentation comparison, not an installation or performance benchmark.

**Yes, other cards already cover much of this card's behavior.** A live countdown, draining bar,
presets, and state-dependent actions are not unique features. Timer Panel Card is a small,
YAML-configured presentation of one existing timer and an optional companion entity.

| Option | Overlap and strengths | When to choose it |
| --- | --- | --- |
| [Home Assistant Tile card](https://www.home-assistant.io/dashboards/features/#timer-actions) | Native timer start, pause, cancel, finish, and [presets](https://www.home-assistant.io/dashboards/features/#timer-presets); valid actions depend on state. Availability depends on your HA version. | Start here for ordinary timer controls without a custom card. |
| [Simple Timer Card](https://github.com/eyalgal/simple-timer-card) | Countdown/progress, presets, native and other timer sources, visual editor. Its [custom action buttons](https://github.com/eyalgal/simple-timer-card/blob/main/CONFIGURATION.md#-custom-action-buttons) accept HA actions, add/reduce time, default to the timer target, and use `show_when` to select states. | The closest functional alternative for presets plus configurable state-dependent timer actions, especially with multiple timers or voice sources. |
| [Switch and Timer Bar Card](https://github.com/cataseven/Switch-and-Timer-Bar-Card) | Device plus timer progress, domain-aware start/stop, duration editing, sensor context, visual editor, and an automation-linked mode. Its optional direct-control mode needs an open browser for timely auto-off. | The closest device-control alternative when its start/stop workflow fits. |
| [Timer Bar Card](https://github.com/rianadon/timer-bar-card) | Countdown/progress, multiple timer-like integrations, tap/hold/double-tap actions, threshold styling, and optional Paper Buttons Row controls. | Flexible timer displays or an existing dashboard composed from several cards. Additional cards/templates can approximate this panel. |
| [TimeFlow Card](https://github.com/Rishi8078/TimeFlow-Card) | Countdown/count-up displays, circular progress and several display styles. | A time-focused display with more visual customization. |
| Timer Panel Card | One native timer, optional companion state/attribute, labeled `idle_buttons` and `running_buttons`, and theme-based urgency colors. One JS module with no runtime dependencies or build step. | A compact device panel with an explicit, short YAML configuration and existing backend automations. |

Simple Timer Card, Switch and Timer Bar Card, Timer Bar Card, and TimeFlow Card were all present
in `hacs/default` on the review date. Timer Panel Card was not.

## What distinguishes this project

The useful distinction is the combination of a companion device header, labeled button groups,
and a small single-purpose implementation. It is not an exclusive feature claim. In particular,
Simple Timer Card's state-filtered action buttons already cover much of the same control logic.
Someone happy with that card may have no reason to switch.

Timer Panel Card has no visual editor, multi-timer discovery, local timers, MQTT timer storage,
or notifications. It also does not create the automation that shuts down a device. Active and
paused timers share one button group, and service validity remains the configuration author's
responsibility. Its action handler implements only the subset documented in the README.

## Default HACS eligibility

The [published inclusion rules](https://www.hacs.xyz/docs/publish/include/) require a valid,
public, maintained repository, passing validation without ignored checks, a subsequent release,
and an owner/contributor submission. They do not list "no similar card exists" as an automated
eligibility condition. Overlap should still be disclosed honestly; meeting the technical checks
does not guarantee that maintainers will accept a submission.
