# Choose an example

[Back to the quick start](../README.md#quick-start) · [Configuration](../docs/configuration.md)

Open a YAML file below and use GitHub's copy button to copy its contents. In Home Assistant,
edit your dashboard, choose **Add card → Manual**, paste the configuration, and replace the
example entity IDs before saving. These files are card configurations, not automations; do not
paste them into `configuration.yaml` or the automation editor.

| Example | Replace these IDs | What you get |
| --- | --- | --- |
| [Kitchen timer](kitchen-timer.yaml) | `timer.kitchen` | A 15-minute preset and Cancel button. |
| [TV sleep timer](tv-sleep-timer.yaml) | `timer.living_room_tv`, `media_player.living_room_tv` | Three presets, TV status, timer controls, and Cancel. |
| [Extractor fan](extractor-fan.yaml) | `timer.kitchen_exhaust`, **both** occurrences of `fan.kitchen_exhaust` | Two presets and a button that turns the fan off. |

## What happens when the timer ends?

The panel returns to its idle presets. Turning off a TV or fan, sounding an alarm, or sending
a notification is handled by your own Home Assistant automation. Setting `device:` only adds
status information to the card.

For device shutdown, create an automation in **Settings → Automations & scenes** that responds
to your timer finishing and turns off your device. Follow the
[official timer automation examples](https://www.home-assistant.io/integrations/timer/#timer-automation-examples)
for the controls available in your HA version. A backend automation can run with the browser
closed. If Home Assistant itself is offline when a timer expires, the `timer.finished` event is
not replayed at startup; account for that in automations that need recovery behavior.

## Cancel and Fan off do different things

**Cancel** cancels the timer without firing its finished event. It does not turn off the device.
In the fan example, **Fan off** turns off the fan but leaves the timer running. Choose actions
that fit your existing automations; use a script if one button must perform several actions.

## Add or subtract time

For a running timer, `timer.change` can add or subtract a duration. It cannot raise the remaining
time above the duration used to start the timer, and it does not work while paused. For example,
adding 15 minutes immediately after starting a 30-minute timer exceeds that limit.

The [button reference](../docs/configuration.md#buttons) explains how to call timer actions or
your own script. The starter examples use the timer dialog for adjustments so they also work
when the timer is paused.
