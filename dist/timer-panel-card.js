/*! timer-panel-card — one panel per timer: live countdown, drain bar, state-aware controls. MIT. */

const VERSION = "1.0.5";

console.info(
  `%c TIMER-PANEL-CARD %c ${VERSION} `,
  "color: white; background: #03a9f4; font-weight: 700;",
  "color: #03a9f4; background: white; font-weight: 700;"
);

const IDLE = "idle";
const ACTIVE = "active";
const PAUSED = "paused";
const UNAVAILABLE_STATES = new Set(["unavailable", "unknown"]);

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

class TimerPanelCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._interval = null;
    this._els = null;
  }

  static getStubConfig(hass) {
    const timer = Object.keys(hass?.states ?? {}).find((id) => id.startsWith("timer."));
    return {
      timer: timer || "timer.example",
      idle_buttons: [
        {
          label: "15m",
          action: {
            action: "perform-action",
            perform_action: "timer.start",
            data: { duration: "00:15:00" },
          },
        },
      ],
      running_buttons: [
        { label: "Cancel", style: "danger", action: { action: "perform-action", perform_action: "timer.cancel" } },
      ],
    };
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
      els.secondary.textContent = `Entity not found: ${cfg.timer}`;
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

/* Guarded: someone migrating from a manual /local/ copy to HACS ends up with the module
   registered twice for one page load, and an unguarded define() throws on the second. */
if (!customElements.get("timer-panel-card")) {
  customElements.define("timer-panel-card", TimerPanelCard);
}

window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === "timer-panel-card")) {
  window.customCards.push({
    type: "timer-panel-card",
    name: "Timer Panel Card",
    description: "A timer entity as one panel: live countdown, drain bar, and state-aware controls.",
    preview: false,
    documentationURL: "https://github.com/JustBeanie/timer-panel-card",
  });
}
