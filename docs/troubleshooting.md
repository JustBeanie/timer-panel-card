# Troubleshooting

[Quick start](../README.md#quick-start) · [Configuration](configuration.md) · [Examples](../examples/README.md)

## “Custom element doesn't exist: timer-panel-card”

The browser has not loaded the card's JavaScript.

1. Confirm **Timer Panel Card** is downloaded in HACS/Marketplace, not only added as a repository.
2. Open **Settings → Dashboards → Resources**. Enable Advanced mode in your profile if Resources
   is hidden. For HACS, check for this URL with type **JavaScript module**:

   ```text
   /hacsfiles/timer-panel-card/timer-panel-card.js
   ```

3. If missing, add it. Keep one resource entry; remove an old `/local/timer-panel-card.js` entry
   after switching from manual installation to HACS.
4. Reload the dashboard. If needed, hard-refresh with Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R
   (macOS). In the Companion app, use **Settings → Reset frontend cache**.

If you manage dashboard resources in YAML, add the URL to your existing resources list with
`type: module` instead of adding a UI resource. Do not add a second `resources:` section.

## “Entity not found” or “a timer entity is required”

The `timer:` value must be an existing **entity ID** beginning with `timer.`, such as
`timer.kitchen`. It cannot be a friendly name or a media player ID. Find the ID under
**Settings → Devices & services → Helpers** and copy it into the card.

If the helper shows `unavailable` or `unknown` in Home Assistant, resolve that helper state
first. The card cannot start an unavailable timer.

## The card has no buttons

Both button lists default to empty. Start with the [complete kitchen example](../examples/kitchen-timer.yaml).
`idle_buttons` appears while idle; `running_buttons` appears while active **or paused**.
Check that the lists are indented like the example. The timer must be idle to see its presets.

## A button does nothing or reports an error

- Use `timer.start`, `timer.pause`, or `timer.cancel` explicitly. Timers have no toggle service.
- Timer actions default to the panel's timer. For another entity, set `target.entity_id`; copying
  the fan example requires replacing the target as well as the displayed `device`.
- For a script that takes entity IDs in its data fields, set `target: {}` and pass those fields
  in `data`. The reference's `script.add_time` is a placeholder for your own script.
- Active and paused timers share buttons. A displayed button is not necessarily valid while paused.
- Check the action and target in Home Assistant's **Tools → Actions** (called **Developer Tools**
  on older versions). For a custom script, check its trace for an error.

See the [supported action types](configuration.md#buttons). Confirmation dialogs, hold actions,
double taps, and Assist are not implemented by this card.

## “Add time” does not work

[`timer.change`](https://www.home-assistant.io/actions/timer.change/) works only on an active
timer and cannot extend the remaining time past the duration used when starting it. Open the
header's timer dialog to resume a paused timer. For a larger new duration, use `timer.start`
with that duration or a script that implements your intended adjustment.

## The timer ended, but my device is still on

The card does not create a shutdown automation. Add one that responds to the timer finishing
and turns off your device; see the [example guide](../examples/README.md#what-happens-when-the-timer-ends).
Canceling a timer does not fire its finished event, so a finish-triggered automation will not
run when you press Cancel.

## The countdown looks wrong or stops updating

Tap the header and compare with Home Assistant's timer dialog. A paused timer correctly stays
at the same remaining time. For an active timer, enable automatic date/time synchronization on
both your browser's device and the Home Assistant host: the display uses the browser's clock
and the timer's finish time. Background tabs may throttle screen updates; return to the dashboard
or reload it. This does not pause the timer running in Home Assistant.

## The card still looks like an older version

Update or redownload the card in HACS/Marketplace, then hard-refresh the browser or reset the
Companion app's frontend cache. Check that there is only one resource loading this card.

For a manual installation, replace the file and change the resource URL's query string, for
example `/local/timer-panel-card.js?v=1.0.3`. Change the query again for each future version.
The browser's developer console prints `TIMER-PANEL-CARD` followed by the loaded version.

## Manual installation

1. Download `timer-panel-card.js` from the [latest release](https://github.com/JustBeanie/timer-panel-card/releases/latest).
2. Copy it to your Home Assistant configuration directory's `www` folder, creating that folder
   if needed. The resulting path is `<config>/www/timer-panel-card.js`.
3. Under **Settings → Dashboards → Resources**, add `/local/timer-panel-card.js?v=1.0.3` as a
   **JavaScript module**. Use the downloaded release's version in the query string.
4. Refresh the dashboard and follow [Add the panel](../README.md#3-add-the-panel).

No Node.js installation, build command, or custom integration is needed to use the card.

## Still stuck?

[Open a bug report](https://github.com/JustBeanie/timer-panel-card/issues/new?template=bug_report.yml)
with your card version, Home Assistant version, installation method, card YAML, and what you
expected to happen. A screenshot or browser console error can help. Remove passwords, tokens,
private URLs, and other personal information before sharing.
