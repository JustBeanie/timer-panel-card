/*! timer-panel-card — one panel per timer: live countdown, drain bar, state-aware controls. MIT. */

const VERSION = "1.0.1";

console.info(
  `%c TIMER-PANEL-CARD %c ${VERSION} `,
  "color: white; background: #03a9f4; font-weight: 700;",
  "color: #03a9f4; background: white; font-weight: 700;"
);

const IDLE = "idle";
const ACTIVE = "active";
const PAUSED = "paused";

/* States that mean "this device is not doing anything", whatever its domain. */
const OFF_STATES = new Set(["off", "idle", "standby", "unavailable", "unknown", "closed", "not_home"]);

function capitalise(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

/* "0:30:00" / "1:05:09" / 90 -> seconds. HA hands timers back as H:MM:SS strings. */
function toSeconds(value) {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  const parts = String(value).split(":").map(Number);
  if (parts.some(Number.isNaN)) return 0;
  return parts.reduce((total, part) => total * 60 + part, 0);
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
    const timer = Object.keys(hass.states).find((id) => id.startsWith("timer."));
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
    this._els = null;
    if (this.shadowRoot) this.shadowRoot.innerHTML = "";
  }

  set hass(hass) {
    this._hass = hass;
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
    this._sync();
  }

  disconnectedCallback() {
    this._stop();
  }

  _stop() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
  }

  /* Tick once a second only while a timer is actually counting down. */
  _sync() {
    const state = this._timerState();
    if (state === ACTIVE && !this._interval) {
      this._interval = setInterval(() => this._paint(), 1000);
    } else if (state !== ACTIVE) {
      this._stop();
    }
  }

  _timerState() {
    const obj = this._hass && this._hass.states[this._config.timer];
    return obj ? obj.state : IDLE;
  }

  _remaining() {
    const obj = this._hass.states[this._config.timer];
    if (!obj) return 0;
    if (obj.state === ACTIVE && obj.attributes.finishes_at) {
      return (new Date(obj.attributes.finishes_at).getTime() - Date.now()) / 1000;
    }
    if (obj.state === PAUSED) return toSeconds(obj.attributes.remaining);
    return 0;
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

    if (!timer) {
      els.name.textContent = cfg.name || cfg.timer;
      els.secondary.textContent = `Entity not found: ${cfg.timer}`;
      els.secondary.classList.add("missing");
      els.time.hidden = true;
      els.track.hidden = true;
      els.buttons.hidden = true;
      return;
    }

    els.secondary.classList.remove("missing");

    const device = cfg.device ? this._hass.states[cfg.device] : null;
    const state = timer.state;
    const running = state === ACTIVE || state === PAUSED;

    els.name.textContent =
      cfg.name ||
      (device && device.attributes.friendly_name) ||
      timer.attributes.friendly_name ||
      cfg.timer;

    els.icon.setAttribute("icon", cfg.icon || timer.attributes.icon || "mdi:timer-outline");
    els.secondary.textContent = this._secondaryText(timer, device);

    this._renderButtons(running ? cfg.running_buttons : cfg.idle_buttons);

    els.footer.textContent = cfg.footer || "";
    els.footer.hidden = !cfg.footer;

    els.time.hidden = !running;
    els.track.hidden = !running;

    this._paint();
    this._sync();
  }

  _secondaryText(timer, device) {
    const cfg = this._config;
    if (cfg.secondary) return cfg.secondary;

    const parts = [];
    if (device) {
      parts.push(this._hass.formatEntityState ? this._hass.formatEntityState(device) : device.state);
      if (cfg.device_attribute && device.attributes[cfg.device_attribute]) {
        parts.push(String(device.attributes[cfg.device_attribute]));
      }
    }

    let note = "";
    if (timer.state === PAUSED) note = "paused";
    else if (timer.state === ACTIVE && timer.attributes.finishes_at) {
      note = "ends " + this._clock(timer.attributes.finishes_at);
    } else if (timer.state === IDLE && (!device || !OFF_STATES.has(device.state))) {
      /* "Off" already says there is nothing running — only add this when it tells you something. */
      note = "no timer set";
    }

    if (note) parts.push(parts.length ? note : capitalise(note));
    return parts.join(" · ");
  }

  _clock(isoString) {
    const locale = (this._hass.locale && this._hass.locale.language) || navigator.language;
    return new Date(isoString).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
  }

  /* Colour is the only thing that reports urgency, so it is derived, never configured per state. */
  _paint() {
    const els = this._els;
    if (!els || !this._hass) return;
    const timer = this._hass.states[this._config.timer];
    if (!timer) return;

    const state = timer.state;
    if (state === IDLE) {
      const device = this._config.device ? this._hass.states[this._config.device] : null;
      const deviceOn = device && !OFF_STATES.has(device.state);
      els.card.style.setProperty(
        "--panel-color",
        deviceOn ? "var(--state-active-color, var(--primary-color))" : "var(--secondary-text-color)"
      );
      return;
    }

    const remaining = this._remaining();
    const total = toSeconds(timer.attributes.duration) || remaining || 1;
    const ratio = Math.max(0, Math.min(1, remaining / total));

    let color = "var(--primary-color)";
    if (remaining <= this._config.warn_seconds) color = "var(--error-color)";
    else if (remaining <= this._config.caution_seconds) color = "var(--warning-color)";

    els.card.style.setProperty("--panel-color", color);
    els.time.textContent = formatRemaining(remaining);
    els.fill.style.width = `${(ratio * 100).toFixed(2)}%`;

    if (remaining <= 0 && state === ACTIVE) {
      this._stop();
    }
  }

  _renderButtons(list) {
    const els = this._els;
    const buttons = Array.isArray(list) ? list : [];
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
    if (!service || !service.includes(".")) {
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
