/*! timer-panel-card — one panel per timer: live countdown, drain bar, state-aware controls. MIT. */

const VERSION = "1.1.1";

console.info(
  `%c TIMER-PANEL-CARD %c ${VERSION} `,
  "color: white; background: #03a9f4; font-weight: 700;",
  "color: #03a9f4; background: white; font-weight: 700;"
);

const IDLE = "idle";
const ACTIVE = "active";
const PAUSED = "paused";
const UNAVAILABLE_STATES = new Set(["unavailable", "unknown"]);
const TIMER_PLACEHOLDER = "timer.example";

/* The frontend's own default composition for a full entity name. */
const FULL_NAME = [{ type: "parent_device" }, { type: "device" }, { type: "entity" }];

/* States that mean "this device is not doing anything", whatever its domain. */
const OFF_STATES = new Set(["off", "idle", "standby", "unavailable", "unknown", "closed", "not_home"]);

function capitalise(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

/* "0:30:00" / "1:05:09" / 90 -> seconds. HA hands timers back as H:MM:SS strings. */
function toSeconds(value) {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : null;
  if (typeof value !== "string" || !value.trim()) return null;
  const parts = value.split(":").map((part) => part.trim() ? Number(part) : NaN);
  if (parts.some((part) => !Number.isFinite(part) || part < 0)) return null;
  const seconds = parts.reduce((total, part) => total * 60 + part, 0);
  return Number.isFinite(seconds) ? seconds : null;
}

function formatRemaining(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

function starterButton(group) {
  if (group === "idle_buttons") {
    return {
      label: "15m",
      action: {
        action: "perform-action",
        perform_action: "timer.start",
        data: { duration: "00:15:00" },
      },
    };
  }
  return {
    label: "Cancel",
    style: "danger",
    action: { action: "perform-action", perform_action: "timer.cancel" },
  };
}

class TimerPanelCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._interval = null;
    this._els = null;
  }

  static getStubConfig(hass, entities = [], entitiesFallback = []) {
    const states = hass?.states ?? {};
    const timer = [...entities, ...entitiesFallback, ...Object.keys(states)].find(
      (id) => id.startsWith("timer.") && states[id] && !UNAVAILABLE_STATES.has(states[id].state)
    );
    return {
      timer: timer ?? TIMER_PLACEHOLDER,
      idle_buttons: [starterButton("idle_buttons")],
      running_buttons: [starterButton("running_buttons")],
    };
  }

  static async getConfigElement() {
    // The built-in Tile editor loads ha-form on older Home Assistant frontends.
    if (!customElements.get("ha-form")) {
      await customElements.get("hui-tile-card")?.getConfigElement?.();
    }
    return document.createElement("timer-panel-card-editor");
  }

  setConfig(config) {
    if (!config || typeof config.timer !== "string" || !config.timer) {
      throw new Error("timer-panel-card: a `timer` entity is required");
    }
    if (!config.timer.startsWith("timer.")) {
      throw new Error("timer-panel-card: `timer` must be a timer entity, got " + config.timer);
    }
    this._config = {
      caution_seconds: 300,
      warn_seconds: 60,
      idle_buttons: [],
      running_buttons: [],
      ...config,
    };
    this._buttonList = undefined;
    this._update();
  }

  set hass(hass) {
    this._hass = hass;
    this._update();
  }

  _update() {
    if (!this._config || !this._hass?.states) {
      this._stop();
      return;
    }
    if (!this._els) this._build();
    this._render();
  }

  getCardSize() {
    return 3;
  }

  getGridOptions() {
    // `rows` is intentionally omitted: Home Assistant documents it as a
    // numeric grid value, and omitting it lets the card size itself naturally.
    return { columns: 12, min_columns: 6 };
  }

  connectedCallback() {
    this._update();
  }

  disconnectedCallback() {
    this._stop();
  }

  _stop() {
    if (this._interval !== null) {
      clearInterval(this._interval);
      this._interval = null;
    }
  }

  /* Tick only while a connected card has a valid countdown in progress. */
  _syncCountdown(timer) {
    if (!this._paintCountdown(timer) || !this.isConnected) {
      this._stop();
    } else if (this._interval === null) {
      this._interval = setInterval(() => {
        const current = this._hass?.states?.[this._config.timer];
        if (!this._paintCountdown(current)) this._stop();
      }, 1000);
    }
  }

  _build() {
    const root = this.shadowRoot;
    root.innerHTML = `
      <style>
        ha-card {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 16px;
          box-sizing: border-box;
        }
        .head {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          border-radius: 12px;
          outline: none;
        }
        .head:focus-visible { box-shadow: 0 0 0 2px var(--primary-color); }
        .badge {
          flex: 0 0 auto;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: color-mix(in srgb, var(--panel-color) 18%, transparent);
          color: var(--panel-color);
          transition: background 220ms ease, color 220ms ease;
        }
        .badge ha-icon { --mdc-icon-size: 22px; }
        .text { flex: 1 1 auto; min-width: 0; }
        .name {
          font-size: 15px;
          font-weight: 500;
          color: var(--primary-text-color);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .secondary {
          font-size: 13px;
          color: var(--secondary-text-color);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .time {
          flex: 0 0 auto;
          font-size: 26px;
          font-weight: 500;
          line-height: 1;
          font-variant-numeric: tabular-nums;
          color: var(--panel-color);
          transition: color 220ms ease;
        }
        .time[hidden] { display: none; }
        .track {
          height: 6px;
          border-radius: 999px;
          background: var(--divider-color);
          overflow: hidden;
        }
        .track[hidden] { display: none; }
        .fill {
          height: 100%;
          border-radius: 999px;
          background: var(--panel-color);
          transition: width 1s linear, background 220ms ease;
        }
        .buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .buttons[hidden] { display: none; }
        button {
          font-family: inherit;
          font-size: 14px;
          line-height: 1;
          color: var(--primary-text-color);
          background: none;
          border: 1px solid var(--divider-color);
          border-radius: 999px;
          padding: 0 16px;
          min-height: 38px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          transition: background 160ms ease, border-color 160ms ease, transform 100ms ease;
        }
        button ha-icon { --mdc-icon-size: 18px; }
        button:hover { background: var(--secondary-background-color); }
        button:active { transform: scale(0.96); }
        button:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
        button.danger { color: var(--error-color); border-color: var(--error-color); }
        button.accent { color: var(--primary-color); border-color: var(--primary-color); }
        .footer {
          font-size: 12px;
          color: var(--secondary-text-color);
        }
        .footer[hidden] { display: none; }
        .missing {
          font-size: 14px;
          color: var(--error-color);
        }
      </style>
      <ha-card>
        <div class="head" part="head" role="button" tabindex="0">
          <div class="badge"><ha-icon></ha-icon></div>
          <div class="text">
            <div class="name"></div>
            <div class="secondary"></div>
          </div>
          <div class="time" hidden></div>
        </div>
        <div class="track" hidden><div class="fill"></div></div>
        <div class="buttons"></div>
        <div class="footer" hidden></div>
      </ha-card>
    `;

    this._els = {
      card: root.querySelector("ha-card"),
      head: root.querySelector(".head"),
      icon: root.querySelector(".badge ha-icon"),
      name: root.querySelector(".name"),
      secondary: root.querySelector(".secondary"),
      time: root.querySelector(".time"),
      track: root.querySelector(".track"),
      fill: root.querySelector(".fill"),
      buttons: root.querySelector(".buttons"),
      footer: root.querySelector(".footer"),
    };

    const openTimer = () => this._moreInfo(this._config.timer);
    this._els.head.addEventListener("click", openTimer);
    this._els.head.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        openTimer();
      }
    });
  }

  _render() {
    const cfg = this._config;
    const els = this._els;
    const timer = this._hass.states[cfg.timer];
    const device = this._hass.states[cfg.device];
    const state = timer?.state;
    const unavailable = !timer || UNAVAILABLE_STATES.has(state);
    const running = state === ACTIVE || state === PAUSED;
    els.name.textContent = this._title(timer, device);
    els.icon.setAttribute("icon", cfg.icon || timer?.attributes.icon || "mdi:timer-outline");
    els.secondary.classList.toggle("missing", unavailable);
    if (!timer) {
      els.secondary.textContent = cfg.timer === TIMER_PLACEHOLDER
        ? "Choose a timer helper in the card editor"
        : `Entity not found: ${cfg.timer}`;
    } else if (unavailable) {
      els.secondary.textContent = "Timer unavailable";
    } else {
      els.secondary.textContent = this._secondaryText(timer, device);
    }
    const buttonList = running ? cfg.running_buttons : cfg.idle_buttons;
    this._renderButtons(unavailable ? null : buttonList);

    els.footer.textContent = cfg.footer || "";
    els.footer.hidden = !cfg.footer || unavailable;
    els.time.hidden = !running;
    const deviceOn = !unavailable && device && !OFF_STATES.has(device.state);
    els.card.style.setProperty(
      "--panel-color",
      deviceOn ? "var(--state-active-color, var(--primary-color))" : "var(--secondary-text-color)"
    );
    this._syncCountdown(timer);
  }

  /* Title: a typed `name` wins, then the device's name, then the timer's. Since 2026.11 Home
     Assistant composes display names from the registry (device + entity), so names go through
     hass.formatEntityName (2026.4+) when it exists, and fall back to friendly_name before that. */
  _title(timer, device) {
    const name = this._config.name;
    if (typeof name === "string" && name) return name;
    const subject = device || timer;
    if (!subject) return this._config.timer;
    if (name && typeof name === "object") {
      const formatted = this._entityName(subject, name);
      if (formatted) return formatted;
    }
    return this._entityName(subject) || this._config.timer;
  }

  _entityName(stateObj, parts = FULL_NAME) {
    if (typeof this._hass.formatEntityName === "function") {
      try {
        const formatted = this._hass.formatEntityName(stateObj, parts);
        if (formatted) return formatted;
      } catch {
        /* Malformed name config or an older helper: fall back below. */
      }
    }
    return stateObj.attributes.friendly_name;
  }

  _secondaryText(timer, device) {
    const cfg = this._config;
    if (cfg.secondary) return cfg.secondary;

    const parts = [];
    if (device) {
      parts.push(this._hass.formatEntityState ? this._hass.formatEntityState(device) : device.state);
      const attribute = device.attributes[cfg.device_attribute];
      if (cfg.device_attribute && attribute != null && attribute !== "") {
        parts.push(String(attribute));
      }
    }

    let note = "";
    if (timer.state === PAUSED) note = "paused";
    else if (timer.state === ACTIVE) {
      const finish = Date.parse(timer.attributes.finishes_at);
      note = Number.isFinite(finish) ? "ends " + this._clock(finish) : "finish time unavailable";
    } else if (timer.state === IDLE && (!device || !OFF_STATES.has(device.state))) {
      /* "Off" already says there is nothing running — only add this when it tells you something. */
      note = "no timer set";
    }

    if (note) parts.push(parts.length ? note : capitalise(note));
    return parts.join(" · ");
  }

  _clock(timestamp) {
    const locale = (this._hass.locale && this._hass.locale.language) || navigator.language;
    return new Date(timestamp).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
  }

  _paintCountdown(timer) {
    const els = this._els;
    const state = timer?.state;
    if (state !== ACTIVE && state !== PAUSED) {
      els.track.hidden = true;
      return false;
    }

    const remaining = state === ACTIVE
      ? (Date.parse(timer.attributes.finishes_at) - Date.now()) / 1000
      : toSeconds(timer.attributes.remaining);
    if (!Number.isFinite(remaining)) {
      els.time.textContent = "—";
      els.track.hidden = true;
      return false;
    }

    const positiveRemaining = Math.max(0, remaining);
    const total = toSeconds(timer.attributes.duration) || positiveRemaining || 1;
    const ratio = Math.min(1, positiveRemaining / total);

    let color = "var(--primary-color)";
    if (remaining <= this._config.warn_seconds) color = "var(--error-color)";
    else if (remaining <= this._config.caution_seconds) color = "var(--warning-color)";

    els.card.style.setProperty("--panel-color", color);
    els.time.textContent = formatRemaining(remaining);
    els.track.hidden = false;
    els.fill.style.width = `${(ratio * 100).toFixed(2)}%`;
    return state === ACTIVE && remaining > 0;
  }

  _renderButtons(list) {
    list = Array.isArray(list) ? list : null;
    // Keep the same DOM nodes (and keyboard focus) across unrelated state updates.
    if (list === this._buttonList) return;
    this._buttonList = list;
    const els = this._els;
    const buttons = list?.filter((item) => item && typeof item === "object") ?? [];
    els.buttons.hidden = buttons.length === 0;
    els.buttons.innerHTML = "";

    buttons.forEach((item) => {
      const button = document.createElement("button");
      if (item.style) button.className = item.style;
      button.type = "button";
      button.setAttribute("aria-label", item.label || item.icon || "action");
      if (item.icon) {
        const icon = document.createElement("ha-icon");
        icon.setAttribute("icon", item.icon);
        button.appendChild(icon);
      }
      if (item.label) button.appendChild(document.createTextNode(item.label));
      button.addEventListener("click", (ev) => {
        ev.stopPropagation();
        this._runAction(item.action);
      });
      els.buttons.appendChild(button);
    });
  }

  _runAction(action) {
    if (!action) return;
    const kind = action.action || "perform-action";

    if (kind === "none") return;

    if (kind === "more-info") {
      this._moreInfo(action.entity || this._config.timer);
      return;
    }

    if (kind === "navigate" && action.navigation_path) {
      history.pushState(null, "", action.navigation_path);
      this.dispatchEvent(new CustomEvent("location-changed", { bubbles: true, composed: true }));
      return;
    }

    if (kind === "url" && action.url_path) {
      window.open(action.url_path, action.new_tab === false ? "_self" : "_blank");
      return;
    }

    if (kind === "toggle") {
      this._hass.callService("homeassistant", "toggle", {}, { entity_id: this._config.timer });
      return;
    }

    /* perform-action, plus the legacy call-service spelling. */
    const service = action.perform_action || action.service;
    if (typeof service !== "string" || !service.includes(".")) {
      console.warn("timer-panel-card: button has no usable action", action);
      return;
    }
    const [domain, name] = service.split(".", 2);
    const target = action.target || { entity_id: this._config.timer };
    this._hass.callService(domain, name, action.data || action.service_data || {}, target);
  }

  _moreInfo(entityId) {
    this.dispatchEvent(
      new CustomEvent("hass-more-info", {
        detail: { entityId },
        bubbles: true,
        composed: true,
      })
    );
  }
}

const ENTITY_FIELDS = [
  { name: "timer", required: true, selector: { entity: { filter: { domain: "timer" } } } },
  { name: "device", selector: { entity: {} } },
];
const DISPLAY_FIELDS = [
  { name: "name", selector: { text: {} } },
  { name: "icon", selector: { icon: {} } },
  { name: "secondary", selector: { text: {} } },
  { name: "device_attribute", selector: { text: {} } },
  { name: "footer", selector: { text: {} } },
  { name: "caution_seconds", selector: { number: { min: 0, mode: "box", unit_of_measurement: "s" } } },
  { name: "warn_seconds", selector: { number: { min: 0, mode: "box", unit_of_measurement: "s" } } },
];
const UI_ACTIONS = ["perform-action", "more-info", "navigate", "url", "none"];
const BUTTON_STYLES = [
  { value: "outline", label: "Outline" },
  { value: "accent", label: "Accent" },
  { value: "danger", label: "Danger" },
];
const BUTTON_FIELDS = [
  { name: "label", selector: { text: {} } },
  { name: "icon", selector: { icon: {} } },
  { name: "style", selector: { select: { mode: "dropdown", options: BUTTON_STYLES } } },
  { name: "action", selector: { ui_action: { actions: UI_ACTIONS, default_action: "none" } } },
];
const MORE_INFO_FIELDS = [
  ...BUTTON_FIELDS,
  { name: "more_info_entity", selector: { entity: {} } },
];
const URL_FIELDS = [
  ...BUTTON_FIELDS,
  { name: "same_tab", selector: { boolean: {} } },
];
const FIELD_LABELS = {
  timer: "Timer helper",
  device: "Companion entity (optional)",
  name: "Panel title",
  icon: "Icon",
  secondary: "Subtitle override",
  device_attribute: "Device attribute",
  footer: "Footer",
  caution_seconds: "Caution threshold",
  warn_seconds: "Warning threshold",
  label: "Button label",
  style: "Button style",
  action: "Button action",
  more_info_entity: "Entity to open (optional)",
  same_tab: "Open in this tab",
};
const FIELD_HELP = {
  device: "Show this entity’s status on the panel.",
  caution_seconds: "Defaults to 300 seconds.",
  warn_seconds: "Defaults to 60 seconds.",
  action: "Timer actions use the card’s timer when no target is set.",
  more_info_entity: "Leave empty to open the card’s timer.",
};

function applyFields(config, fields, values) {
  const next = { ...config };
  for (const key of fields) {
    if (!Object.hasOwn(values, key)) continue;
    if (values[key] == null || values[key] === "") delete next[key];
    else next[key] = values[key];
  }
  return next;
}

function editorAction(action) {
  let kind = action?.action;
  if (kind === "call-service") kind = "perform-action";
  kind ??= action?.service || action?.perform_action ? "perform-action" : "none";
  return { ...action, action: kind };
}

class TimerPanelCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  setConfig(config) {
    this._config = { ...config };
    this._update();
  }

  set hass(hass) {
    this._hass = hass;
    this._update();
  }

  _update() {
    if (!this._config || !this._hass) return;
    if (!this._forms) this._build();

    const { timer, device, ...display } = this._config;
    const states = this._hass.states;
    const selectedTimer = timer === TIMER_PLACEHOLDER && !states[timer] ? undefined : timer;
    this._setForm(this._forms.entities, { timer: selectedTimer, device });
    const displayData = Object.fromEntries(DISPLAY_FIELDS.map(({ name }) => [name, display[name]]));
    const composedTitle = display.name != null && typeof display.name !== "string";
    if (composedTitle) delete displayData.name;
    this._setForm(this._forms.display, displayData);
    this.shadowRoot.querySelector(".composed-title").hidden = !composedTitle;
    this.shadowRoot.querySelector(".no-timers").hidden = Object.keys(states).some(
      (id) => id.startsWith("timer.")
    );
    this._updateButtons("idle_buttons");
    this._updateButtons("running_buttons");
  }

  _build() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; color: var(--primary-text-color); }
        p { margin: 0 0 12px; color: var(--secondary-text-color); }
        .no-timers { margin-top: 12px; }
        details { border-top: 1px solid var(--divider-color); margin-top: 12px; }
        summary { cursor: pointer; padding: 12px 0; font-weight: 500; overflow-wrap: anywhere; }
        summary small { color: var(--secondary-text-color); font-weight: 400; margin-inline-start: 8px; }
        .button-row { margin-top: 0; }
        .button-row summary { font-weight: 400; }
        .controls { display: flex; flex-wrap: wrap; gap: 4px 8px; margin: 8px 0; }
        button {
          font: inherit;
          color: var(--primary-color);
          background: transparent;
          border: 1px solid var(--divider-color);
          border-radius: 6px;
          padding: 6px 10px;
          min-height: 36px;
          cursor: pointer;
        }
        button:disabled { color: var(--disabled-text-color); cursor: default; }
        button:focus-visible, summary:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
      </style>
      <div class="entities"></div>
      <p class="no-timers" hidden>Create a Timer helper under Settings → Devices &amp; services → Helpers, then select it here.</p>
      <details>
        <summary>Appearance and warnings</summary>
        <p class="composed-title" hidden>A title made of name parts is set in YAML. Enter a title here to replace it.</p>
        <div class="display"></div>
      </details>
      <details data-group="idle_buttons">
        <summary>Idle buttons <small></small></summary>
        <p>Shown before the timer starts and after it finishes.</p>
        <div class="rows"></div>
        <div class="controls"><button type="button">Add idle button</button></div>
      </details>
      <details data-group="running_buttons">
        <summary>Running buttons <small></small></summary>
        <p>Shown while the timer is running or paused.</p>
        <div class="rows"></div>
        <div class="controls"><button type="button">Add running button</button></div>
      </details>
    `;
    this._forms = {
      entities: this._form(ENTITY_FIELDS, (values) => {
        const config = applyFields(this._config, ["timer", "device"], values);
        config.timer ??= TIMER_PLACEHOLDER;
        this._emit(config);
      }),
      display: this._form(DISPLAY_FIELDS, (values) => {
        this._emit(applyFields(this._config, DISPLAY_FIELDS.map(({ name }) => name), values));
      }),
    };
    for (const [key, form] of Object.entries(this._forms)) {
      this.shadowRoot.querySelector(`.${key}`).append(form);
    }
    for (const group of ["idle_buttons", "running_buttons"]) {
      this._group(group).querySelector("button").addEventListener("click", () => {
        const list = this._buttons(group);
        this._emit({ ...this._config, [group]: [...list, starterButton(group)] });
        const row = this._group(group).querySelector(".rows").lastElementChild;
        row.open = true;
        row.querySelector("summary").focus();
      });
    }
  }

  _form(schema, change) {
    const form = document.createElement("ha-form");
    form.schema = schema;
    form.computeLabel = ({ name }) => FIELD_LABELS[name];
    form.computeHelper = ({ name }) => FIELD_HELP[name];
    form.addEventListener("value-changed", (event) => {
      if (event.target !== form || !event.detail?.value) return;
      event.stopPropagation();
      change(event.detail.value);
    });
    return form;
  }

  _setForm(form, data) {
    form.hass = this._hass;
    if (JSON.stringify(form.data) !== JSON.stringify(data)) form.data = data;
  }

  _group(group) {
    return this.shadowRoot.querySelector(`[data-group="${group}"]`);
  }

  _buttons(group) {
    const buttons = this._config[group];
    return Array.isArray(buttons) ? buttons : [];
  }

  _updateButtons(group) {
    const list = this._buttons(group);
    const section = this._group(group);
    const rows = section.querySelector(".rows");
    section.querySelector("small").textContent = String(list.length);
    while (rows.children.length > list.length) rows.lastElementChild.remove();
    list.forEach((button, index) => {
      let row = rows.children[index];
      if (!row) {
        row = this._buttonRow(group, index);
        rows.append(row);
      }
      row.querySelector("summary").textContent = button?.label || button?.icon || `Button ${index + 1}`;
      const form = row.querySelector("ha-form");
      const action = editorAction(button?.action);
      const actionKind = action.action;
      form.schema = actionKind === "more-info"
        ? MORE_INFO_FIELDS
        : actionKind === "url" ? URL_FIELDS : BUTTON_FIELDS;
      const data = { label: button?.label, icon: button?.icon, style: button?.style ?? "outline", action };
      if (actionKind === "more-info") data.more_info_entity = action.entity;
      if (actionKind === "url") data.same_tab = action.new_tab === false;
      row.querySelector(".legacy-action").hidden = UI_ACTIONS.includes(actionKind);
      this._setForm(form, data);
      row.querySelector(".move-up").disabled = index === 0;
      row.querySelector(".move-down").disabled = index === list.length - 1;
    });
  }

  _buttonRow(group, index) {
    const row = document.createElement("details");
    row.className = "button-row";
    row.innerHTML = `
      <summary></summary>
      <p class="legacy-action" hidden>This action comes from YAML. Choose another action to replace it.</p>
      <div class="controls">
        <button type="button" class="move-up">Move up</button>
        <button type="button" class="move-down">Move down</button>
        <button type="button" class="remove">Remove button</button>
      </div>
    `;
    row.querySelector(".controls").before(this._form(BUTTON_FIELDS, (values) => {
      const list = [...this._buttons(group)];
      const previous = list[index];
      const button = applyFields(previous, ["label", "icon", "style"], values);
      if (button.style === "outline") delete button.style;
      const action = values.action ?? { action: "none" };
      const oldAction = previous?.action;
      const before = editorAction(oldAction);
      if (JSON.stringify(action) !== JSON.stringify(before)) {
        button.action = { ...action };
        // Home Assistant emits an empty target for an unselected target.
        // Keep the card's default target for timer actions and preserve explicit YAML targets.
        const service = action.perform_action;
        const explicitEmptyTarget = service === (oldAction?.perform_action ?? oldAction?.service)
          && oldAction?.target && Object.keys(oldAction.target).length === 0;
        if (typeof service === "string" && service.startsWith("timer.") && !explicitEmptyTarget &&
          action.target && Object.keys(action.target).length === 0) {
          delete button.action.target;
        }
      }
      if (action.action === "more-info" && Object.hasOwn(values, "more_info_entity") &&
        values.more_info_entity !== before.entity) {
        button.action = applyFields(button.action, ["entity"], { entity: values.more_info_entity });
      }
      if (action.action === "url" && Object.hasOwn(values, "same_tab") &&
        values.same_tab !== (before.new_tab === false)) {
        button.action = applyFields(button.action, ["new_tab"], { new_tab: values.same_tab ? false : undefined });
      }
      list[index] = button;
      this._emit({ ...this._config, [group]: list });
    }));
    row.querySelector(".move-up").addEventListener("click", () => this._moveButton(group, index, index - 1));
    row.querySelector(".move-down").addEventListener("click", () => this._moveButton(group, index, index + 1));
    row.querySelector(".remove").addEventListener("click", () => {
      const list = this._buttons(group).filter((_, i) => i !== index);
      this._emit({ ...this._config, [group]: list });
      const section = this._group(group);
      const nextRow = section.querySelector(".rows").children[index];
      (nextRow?.querySelector("summary") ?? section.querySelector(":scope > .controls > button")).focus();
    });
    return row;
  }

  _moveButton(group, from, to) {
    const list = [...this._buttons(group)];
    if (to < 0 || to >= list.length) return;
    [list[from], list[to]] = [list[to], list[from]];
    this._emit({ ...this._config, [group]: list });
    const rows = this._group(group).querySelector(".rows").children;
    rows[from].open = false;
    rows[to].open = true;
    rows[to].querySelector("summary").focus();
  }

  _emit(config) {
    if (JSON.stringify(config) === JSON.stringify(this._config)) return;
    this._config = config;
    this._update();
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config },
      bubbles: true,
      composed: true,
    }));
  }
}

/* Guarded: someone migrating from a manual /local/ copy to HACS ends up with the module
   registered twice for one page load, and an unguarded define() throws on the second. */
if (!customElements.get("timer-panel-card")) {
  customElements.define("timer-panel-card", TimerPanelCard);
}
if (!customElements.get("timer-panel-card-editor")) {
  customElements.define("timer-panel-card-editor", TimerPanelCardEditor);
}

window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === "timer-panel-card")) {
  window.customCards.push({
    type: "timer-panel-card",
    name: "Timer Panel Card",
    description: "A timer entity as one panel: live countdown, drain bar, and state-aware controls.",
    preview: true,
    documentationURL: "https://github.com/JustBeanie/timer-panel-card",
  });
}
