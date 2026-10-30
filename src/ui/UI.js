import { TRACKS, createRoute } from "../tracks/TrackData.js";
import {
  KARTS,
  DRIVERS,
  PAINTS,
  WHEELS,
  ACCESSORIES,
} from "../vehicles/KartCatalog.js";
import "../styles/main.css";

const ICONS = {
  flag: '<path d="M5 21V3m0 1c5-4 9 4 14 0v10c-5 4-9-4-14 0"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  back: '<path d="m14 5-7 7 7 7"/>',
  bolt: '<path d="m13 2-9 12h7l-1 8 10-13h-7z"/>',
  cup: '<path d="M8 3h8v6a4 4 0 0 1-8 0V3Zm0 1H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4m-4 2v6m-4 2h8"/>',
  clock: '<circle cx="12" cy="13" r="8"/><path d="M12 8v5l3 2M9 2h6"/>',
  kart: '<path d="m6 15 2-7h8l2 7M5 11h14M4 16h16M9 8l1-4h4l1 4"/><rect x="2" y="13" width="4" height="7" rx="1"/><rect x="18" y="13" width="4" height="7" rx="1"/>',
  map: '<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16"/>',
  settings:
    '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="16" cy="17" r="3"/>',
  gamepad:
    '<path d="M7 7h10c3 0 4 4 4 9 0 4-4 1-6-1H9c-2 2-6 5-6 1 0-5 1-9 4-9Z"/><path d="M6 11h4m-2-2v4m8-2h.01M18 13h.01"/>',
  sound:
    '<path d="M4 9h4l5-5v16l-5-5H4V9Zm12-2a8 8 0 0 1 0 10m3-13a12 12 0 0 1 0 16"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/>',
  pause: '<path d="M8 5v14m8-14v14"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10m-3-8h6m-6 6h6"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/>',
  oil: '<path d="M12 3S5 10 5 15a7 7 0 0 0 14 0c0-5-7-12-7-12Z"/>',
  pulse:
    '<circle cx="12" cy="12" r="3"/><path d="M6 6a8 8 0 0 0 0 12M18 6a8 8 0 0 1 0 12M3 3a13 13 0 0 0 0 18M21 3a13 13 0 0 1 0 18"/>',
  spark: '<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/>',
  ghost:
    '<path d="M5 21V10a7 7 0 0 1 14 0v11l-4-3-3 3-3-3-4 3Zm4-11v2m6-2v2"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
  rotate: '<path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/>',
  fullscreen: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
};
const icon = (name, cls = "") =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.spark}</svg>`;
const safe = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const num = (v, fallback = 0) =>
  Number.isFinite(Number(v)) ? Number(v) : fallback;
const fmt = (seconds) =>
  Number.isFinite(seconds) && seconds > 0
    ? `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${(seconds % 60).toFixed(3).padStart(6, "0")}`
    : "—";
const keyName = (code) =>
  ({
    Space: "SPACE",
    ArrowUp: "↑",
    ArrowDown: "↓",
    ArrowLeft: "←",
    ArrowRight: "→",
    ShiftLeft: "SHIFT",
    ShiftRight: "SHIFT",
    Enter: "ENTER",
  })[code] ||
  String(code)
    .replace(/^Key|^Digit/, "")
    .toUpperCase();
const ITEMS = {
  boost: {
    name: "Boost Orb",
    icon: "bolt",
    description: "A quick burst of speed. Best used on an open straight.",
  },
  oil: {
    name: "Oil Slick",
    icon: "oil",
    description:
      "Drop a slippery patch behind your kart to disrupt a rival’s grip.",
  },
  shield: {
    name: "Shield",
    icon: "shield",
    description: "Absorb one incoming item hit and keep your momentum.",
  },
  pulse: {
    name: "Pulse Blast",
    icon: "pulse",
    description: "A short-range shockwave slows nearby rivals.",
  },
  spark: {
    name: "Homing Spark",
    icon: "spark",
    description:
      "Chase the nearest rival ahead. Shields and evasive movement can defeat it.",
  },
  ghost: {
    name: "Ghost Mode",
    icon: "ghost",
    description:
      "Slip past rivals with reduced collision effects for a short time.",
  },
};
const DEFAULT_KEYS = {
  accelerate: "KeyW",
  brake: "KeyS",
  left: "KeyA",
  right: "KeyD",
  drift: "Space",
  item: "KeyE",
  reset: "KeyR",
};
const DEFAULT_SETTINGS = {
  master: 0.7,
  music: 0.22,
  sfx: 0.7,
  muted: false,
  quality: "medium",
  shadows: true,
  cameraSensitivity: 1,
  steeringSensitivity: 1,
  invertCamera: false,
  shake: true,
  reducedEffects: false,
  keys: DEFAULT_KEYS,
};

/** All menus and race overlays share one delegated listener set. */
export class UI {
  constructor({ root, callbacks = {}, save = {} }) {
    this.root = root;
    this.callbacks = callbacks;
    this.save = save;
    const mergedSettings = {
      ...DEFAULT_SETTINGS,
      ...save.settings,
      keys: { ...DEFAULT_KEYS, ...save.settings?.keys },
    };
    save.settings ||= {};
    Object.assign(save.settings, mergedSettings);
    save.selection = {
      trackId: "valley",
      kartId: KARTS[0]?.id || "comet",
      driverId: DRIVERS[0]?.id,
      paint: PAINTS[0]?.hex || "#ef7754",
      accent: "#f6efd7",
      wheels: WHEELS[0]?.id,
      accessory: ACCESSORIES[0]?.id,
      ...save.selection,
    };
    save.records ||= {};
    this.config = { mode: "quick", difficulty: "normal", laps: 3 };
    this.screen = "";
    this.returnScreen = "menu";
    this.notices = [];
    this.lastHUD = {};
    this.routeMaps = new Map();
    this._click = this.onClick.bind(this);
    this._change = this.onChange.bind(this);
    this._key = this.onKey.bind(this);
    this._pointerDown = this.onPointerDown.bind(this);
    this._pointerMove = this.onPointerMove.bind(this);
    this._pointerUp = () => {
      this.dragging = null;
    };
    root.addEventListener("click", this._click);
    root.addEventListener("change", this._change);
    root.addEventListener("input", this._change);
    root.addEventListener("pointerdown", this._pointerDown);
    window.addEventListener("pointermove", this._pointerMove);
    window.addEventListener("pointerup", this._pointerUp);
    document.addEventListener("keydown", this._key);
  }

  call(name, ...args) {
    return this.callbacks[name]?.(...args);
  }
  get track() {
    return (
      TRACKS.find((t) => t.id === this.save.selection.trackId) || TRACKS[0]
    );
  }
  get kart() {
    return KARTS.find((k) => k.id === this.save.selection.kartId) || KARTS[0];
  }
  customization() {
    const { driverId, paint, accent, wheels, accessory } = this.save.selection;
    return { driverId, paint, accent, wheels, accessory };
  }
  unlocked(kart) {
    return (
      !kart.unlockWins ||
      num(this.save.wins) >= kart.unlockWins ||
      this.save.unlocked?.includes(kart.id)
    );
  }

  transition(screen, html, { navigate = true } = {}) {
    this.screen = screen;
    this.root.className = `ui-root screen-${screen}`;
    this.root.innerHTML = html;
    document.body.dataset.screen = screen;
    this.captureKey = null;
    if (navigate) this.call("navigate", screen);
  }

  brand(small = false) {
    return `<div class="brand ${small ? "brand-small" : ""}"><span class="brand-mark">${icon("flag")}</span><span>KART<span class="brand-light">RUSH</span><sup>3D</sup></span></div>`;
  }

  header(title, subtitle = "", back = true) {
    return `<header class="app-header">${back ? `<button class="back-button" data-action="back" title="Back">${icon("back")}<span>BACK</span></button>` : this.brand(true)}<div class="header-title">${safe(title)}${subtitle ? `<span>${safe(subtitle)}</span>` : ""}</div><div class="wallet">${icon("coin")}<span>${num(this.save.coins).toLocaleString()}</span></div></header>`;
  }

  showMenu() {
    this.returnScreen = "menu";
    this.transition(
      "menu",
      `
      <div class="menu-shade"></div>
      ${this.header("", "", false)}
      <main class="home-main">
        <div class="eyebrow"><span class="live-dot"></span> SMALL KARTS. BIG ADVENTURES.</div>
        <h1 class="hero-logo"><span>KART</span><span>RUSH<span class="logo-3d">3D</span></span></h1>
        <p class="hero-copy">Take the scenic route.<br><strong>Just take it fast.</strong></p>
        <button class="button primary hero-play" data-action="play"><span>${icon("flag")} LET’S RACE</span>${icon("arrow")}</button>
        <div class="mode-shortcuts" aria-label="Race modes">
          <button data-action="mode" data-mode="quick">${icon("bolt")}<span>Quick Race</span></button>
          <button data-action="mode" data-mode="gp">${icon("cup")}<span>Grand Prix</span></button>
          <button data-action="mode" data-mode="time">${icon("clock")}<span>Time Trial</span></button>
        </div>
        <nav class="home-nav" aria-label="Main menu">
          <button data-action="screen" data-screen="garage">${icon("kart")}<span>Kart garage</span><span class="nav-count">${KARTS.filter((k) => this.unlocked(k)).length}/${KARTS.length}</span>${icon("arrow")}</button>
          <button data-action="screen" data-screen="tracks">${icon("map")}<span>Explore tracks</span><span class="nav-count">04</span>${icon("arrow")}</button>
          <button data-action="screen" data-screen="settings">${icon("settings")}<span>Settings</span>${icon("arrow")}</button>
        </nav>
      </main>
      <aside class="scene-card"><span class="eyebrow">YOUR NEXT ADVENTURE</span><div class="scene-card-title">${safe(this.track.name)}<span class="tiny-arrow">↗</span></div><div class="scene-meta"><span class="live-dot"></span>${safe(this.track.tagline || "A fresh circuit. A new challenge.")}<button data-action="screen" data-screen="tracks" aria-label="Choose another track">${icon("map")}</button></div></aside>
      <div class="scene-stamp"><span>4 CIRCUITS</span><i></i><span>6 ORIGINAL KARTS</span><i></i><span>ENDLESS GOOD TIMES</span></div>
      <footer class="app-footer"><button data-action="screen" data-screen="controls">${icon("gamepad")} Controls & how to play</button><span class="footer-note">BUILT FOR THE JOY OF THE RACE</span><button data-action="screen" data-screen="credits">Credits <span class="version">v1.0</span></button></footer>
    `,
    );
  }

  showScreen(name) {
    if (name === "settings" || name === "controls" || name === "credits")
      this.returnScreen =
        this.screen === "pause" || this.returnScreen === "pause"
          ? "pause"
          : "menu";
    const methods = {
      menu: "showMenu",
      setup: "showSetup",
      garage: "showGarage",
      tracks: "showTracks",
      settings: "showSettings",
      controls: "showControls",
      credits: "showCredits",
      pause: "showPause",
    };
    if (methods[name]) this[methods[name]]();
  }

  showSetup() {
    const mode = this.config.mode;
    const label = { quick: "QUICK RACE", gp: "GRAND PRIX", time: "TIME TRIAL" }[
      mode
    ];
    this.transition(
      "setup",
      `
      <div class="menu-shade setup-shade"></div>${this.header("MAKE IT YOUR RACE", "A little friendly competition.")}
      <main class="setup-panel glass-panel">
        <div class="section-kicker">01 / PICK YOUR PACE</div>
        <div class="mode-tabs" role="group" aria-label="Race mode">${[
          ["quick", "bolt", "Quick Race"],
          ["gp", "cup", "Grand Prix"],
          ["time", "clock", "Time Trial"],
        ]
          .map(
            ([id, ico, name]) =>
              `<button class="${mode === id ? "selected" : ""}" data-action="setup-mode" data-mode="${id}" aria-pressed="${mode === id}">${icon(ico)}${name}</button>`,
          )
          .join("")}</div>
        <p class="mode-description">${mode === "gp" ? "Four circuits. One champion. Earn points across every race and climb the championship standings." : mode === "time" ? "Just you, the circuit, and the clock. Find the perfect line and set a new personal best." : "Line up with five original rivals. Pick your circuit, tune the challenge, and chase the checkered flag."}</p>
        <div class="section-heading"><span class="section-kicker">02 / ${mode === "gp" ? "THE FOUR-RACE TOUR" : "CHOOSE YOUR CIRCUIT"}</span>${mode !== "gp" ? '<button class="text-button" data-action="screen" data-screen="tracks">Explore all ↗</button>' : ""}</div>
        <div class="setup-tracks ${mode === "gp" ? "gp-route" : ""}">${TRACKS.map((t, i) => `<button class="mini-track ${this.save.selection.trackId === t.id && mode !== "gp" ? "selected" : ""}" data-action="select-track" data-id="${t.id}" ${mode === "gp" ? "disabled" : ""} aria-pressed="${this.save.selection.trackId === t.id}" style="--track-color:${t.color || "#cafa69"}">${this.mapSVG(t.id)}<span><small>${mode === "gp" ? `ROUND 0${i + 1}` : `CIRCUIT 0${i + 1}`}</small>${safe(t.name)}</span>${mode !== "gp" && this.save.selection.trackId === t.id ? icon("check") : ""}</button>`).join("")}</div>
        <div class="setup-options"><label class="field"><span>DIFFICULTY</span><select data-config="difficulty" ${mode === "time" ? "disabled" : ""}>${["easy", "normal", "hard"].map((id) => `<option value="${id}" ${this.config.difficulty === id ? "selected" : ""}>${id[0].toUpperCase() + id.slice(1)}</option>`).join("")}</select></label><label class="field"><span>LAPS PER RACE</span><select data-config="laps">${[1, 2, 3, 5].map((n) => `<option value="${n}" ${this.config.laps === n ? "selected" : ""}>${n} ${n === 1 ? "lap" : "laps"}</option>`).join("")}</select></label></div>
        <div class="selected-kart-row"><span class="kart-chip" style="--kart-color:${this.save.selection.paint || this.kart.color}">${icon("kart")}</span><div><small>YOUR RIDE</small><strong>${safe(this.kart.name)}</strong></div><button class="text-button" data-action="screen" data-screen="garage">Customize ↗</button></div>
        <button class="button primary start-race" data-action="start"><span>${icon(mode === "gp" ? "cup" : "flag")} START ${label}</span>${icon("arrow")}</button>
        <div class="subtle-note">${icon("gamepad")} Keyboard, gamepad & touch ready. Escape to pause.</div>
      </main>
      <aside class="setup-scene-label"><span class="pill">${mode === "gp" ? "CHAMPIONSHIP OPENER" : "CIRCUIT PREVIEW"}</span><h2>${safe(mode === "gp" ? TRACKS[0].name : this.track.name)}</h2><p>${safe(mode === "gp" ? TRACKS[0].description : this.track.description)}</p></aside>
    `,
    );
  }

  showTracks() {
    this.transition(
      "tracks",
      `<div class="panel-shade"></div>${this.header("FOUR WORLDS. YOUR PLAYGROUND.", "Pick a place to leave your rivals behind.")}<main class="track-selection"><div class="section-heading"><span class="section-kicker">THE CIRCUITS / ALL OPEN FROM DAY ONE</span><span class="muted">A different road. A different rhythm.</span></div><div class="track-grid">${TRACKS.map((t, i) => `<button class="track-card ${this.save.selection.trackId === t.id ? "selected" : ""}" data-action="select-track" data-id="${t.id}" style="--track-color:${t.color || "#ccfa69"}" aria-pressed="${this.save.selection.trackId === t.id}"><div class="track-art track-art-${t.id}"><div class="track-number">0${i + 1}</div>${this.mapSVG(t.id)}<span class="track-weather">${{ valley: "☀ MEADOW DAYS", coast: "☀ GOLDEN HOUR", city: "✦ AFTER DARK", lava: "▲ WILD ALTITUDE" }[t.id]}</span>${this.save.selection.trackId === t.id ? `<span class="selected-badge">${icon("check")} SELECTED</span>` : ""}</div><div class="track-card-body"><div class="eyebrow">${safe(t.tagline || "THE NEXT ADVENTURE")}</div><h2>${safe(t.name)}</h2><p>${safe(t.description)}</p><div class="track-card-meta"><span>${safe(t.difficulty || "Arcade circuit")}</span><span>${safe(t.lengthLabel || `${Math.round(createRoute(t.id).length)} m`)}</span></div><div class="track-best">${icon("clock")} PERSONAL BEST <strong>${fmt(this.recordBest(t.id))}</strong></div></div></button>`).join("")}</div><div class="track-footer"><span>${icon("map")} Every circuit has its own racing line, scenery, and secrets.</span><button class="button primary" data-action="race-selected"><span>RACE ${safe(this.track.name)}</span>${icon("arrow")}</button></div></main>`,
    );
  }

  recordBest(id) {
    const r = this.save.records[id];
    return typeof r === "number"
      ? r
      : (r?.bestLap ?? r?.timeTrialBest ?? r?.lap ?? null);
  }

  showGarage() {
    const previousScroll =
      this.screen === "garage"
        ? this.root.querySelector(".garage-panel")?.scrollTop || 0
        : 0;
    const kart = this.kart;
    const selection = this.save.selection;
    const paintChoices = PAINTS.some((p) => p.hex === selection.paint)
      ? PAINTS
      : [...PAINTS, { name: "Custom", hex: selection.paint }];
    const accentChoices = [
      ...new Set([
        "#f6efd7",
        "#152d39",
        "#cafa69",
        "#ffca61",
        "#c89eff",
        "#5cdddc",
        selection.accent,
      ]),
    ];
    this.transition(
      "garage",
      `<div class="garage-shade"></div>${this.header("GOOD LOOKS. GREAT LAPS.", "Make this little machine your own.")}<main class="garage-panel glass-panel"><div class="section-heading"><span class="section-kicker">YOUR GARAGE</span><span class="muted">${num(this.save.wins)} ${num(this.save.wins) === 1 ? "win" : "wins"} · ${KARTS.filter((k) => this.unlocked(k)).length}/${KARTS.length} unlocked</span></div><div class="kart-grid">${KARTS.map(
        (k, i) => {
          const unlocked = this.unlocked(k);
          return `<button class="kart-choice ${selection.kartId === k.id ? "selected" : ""} ${!unlocked ? "locked" : ""}" data-action="select-kart" data-id="${k.id}" ${!unlocked ? "disabled" : ""} title="${safe(unlocked ? k.description : `Win ${k.unlockWins} races to unlock`)}" aria-pressed="${selection.kartId === k.id}" style="--kart-color:${k.color}"><span class="kart-choice-art">${icon(unlocked ? "kart" : "lock")}<small>0${i + 1}</small></span><strong>${safe(k.name)}</strong><span>${unlocked ? (selection.kartId === k.id ? "YOUR CURRENT RIDE" : "TAKE IT FOR A SPIN") : `WIN ${k.unlockWins} RACES`}</span></button>`;
        },
      ).join(
        "",
      )}</div><div class="garage-kart-title"><h2>${safe(kart.name)}</h2><span class="pill">${safe(kart.description)}</span></div><div class="stat-grid">${[
        ["speed", "Top speed"],
        ["acceleration", "Acceleration"],
        ["handling", "Handling"],
        ["drift", "Drift"],
        ["weight", "Weight"],
      ]
        .map(
          ([key, name]) =>
            `<div class="stat"><span>${name}</span><div class="stat-bars" role="meter" aria-label="${name}" aria-valuemin="0" aria-valuemax="5" aria-valuenow="${num(kart[key], 3)}">${[1, 2, 3, 4, 5].map((n) => `<i class="${num(kart[key], 3) >= n ? "filled" : ""}"></i>`).join("")}</div><b>${num(kart[key], 3)}/5</b></div>`,
        )
        .join(
          "",
        )}</div>${this.comparisonTable()}<div class="paint-rows"><div><label class="section-kicker">BODY COLOR</label><div class="swatches">${paintChoices.map((p) => `<button class="swatch ${selection.paint === p.hex ? "selected" : ""}" style="--swatch:${p.hex}" data-action="paint" data-color="${p.hex}" data-part="paint" title="${safe(p.name)}" aria-label="Body color: ${safe(p.name)}" aria-pressed="${selection.paint === p.hex}">${selection.paint === p.hex ? icon("check") : ""}</button>`).join("")}</div></div><div><label class="section-kicker">ACCENT</label><div class="swatches">${accentChoices.map((hex) => `<button class="swatch ${selection.accent === hex ? "selected" : ""}" style="--swatch:${hex}" data-action="paint" data-color="${hex}" data-part="accent" title="Accent ${hex}" aria-label="Accent ${hex}" aria-pressed="${selection.accent === hex}">${selection.accent === hex ? icon("check") : ""}</button>`).join("")}</div></div></div><div class="cosmetics-grid">${[
        ["driverId", "DRIVER", DRIVERS],
        ["wheels", "WHEEL STYLE", WHEELS],
        ["accessory", "ACCESSORY", ACCESSORIES],
      ]
        .map(
          ([key, label, list]) =>
            `<label class="field"><span>${label}</span><select data-selection="${key}">${list.map((x) => `<option value="${x.id}" ${selection[key] === x.id ? "selected" : ""}>${safe(x.name)}</option>`).join("")}</select></label>`,
        )
        .join(
          "",
        )}</div><button class="button primary" data-action="garage-done"><span>${icon("check")} LOOKING GOOD. LET’S GO.</span>${icon("arrow")}</button><div class="subtle-note">Selections saved automatically on this device.</div></main><aside class="garage-viewer" data-preview="true" aria-label="Drag to rotate kart preview"><div class="viewer-kicker"><span class="pill">LIVE 3D PREVIEW</span><span>BUILT TO STAND OUT.</span></div><div class="viewer-floor-label"><span class="viewer-model">${safe(kart.name)}</span><div class="viewer-controls"><button class="icon-button" data-action="rotate" data-delta="-0.45" aria-label="Rotate kart left">↶</button><span>${icon("rotate")} DRAG TO ROTATE</span><button class="icon-button" data-action="rotate" data-delta="0.45" aria-label="Rotate kart right">↷</button></div></div></aside>`,
    );
    this.root.querySelector(".garage-panel").scrollTop = previousScroll;
    this.call("previewKart", selection.kartId, this.customization());
  }

  comparisonTable() {
    return `<details class="stats-comparison"><summary>Compare all six karts</summary><div><table><thead><tr><th>Kart</th><th>Speed</th><th>Accel.</th><th>Handling</th><th>Drift</th><th>Weight</th></tr></thead><tbody>${KARTS.map((k) => `<tr class="${k.id === this.save.selection.kartId ? "current" : ""}"><td>${this.unlocked(k) ? "" : icon("lock")}${safe(k.name)}</td>${["speed", "acceleration", "handling", "drift", "weight"].map((stat) => `<td>${k[stat]}/5</td>`).join("")}</tr>`).join("")}</tbody></table></div><p>Light karts accelerate and corner quickly. Heavy karts hold their line through contact. No one kart wins every category.</p></details>`;
  }

  showSettings() {
    const s = this.save.settings;
    const range = (key, label, min, max, step, format = "percent") =>
      `<label class="setting range-setting"><span><strong>${label}</strong></span><div class="range-control"><input type="range" data-setting="${key}" min="${min}" max="${max}" step="${step}" value="${s[key]}" aria-label="${label}"><output data-output="${key}">${format === "percent" ? `${Math.round(s[key] * 100)}%` : `${s[key].toFixed(1)}×`}</output></div></label>`;
    const toggle = (key, label, detail) =>
      `<label class="setting"><span><strong>${label}</strong>${detail ? `<small>${detail}</small>` : ""}</span><input class="toggle" type="checkbox" data-setting="${key}" ${s[key] ? "checked" : ""}></label>`;
    this.transition(
      "settings",
      `<div class="panel-shade"></div>${this.header("FIND YOUR SWEET SPOT", "Applied instantly. Saved automatically.")}<main class="settings-panel"><div class="settings-column"><section class="settings-section"><h2>${icon("sound")} SOUND</h2>${range("master", "Master volume", 0, 1, 0.01)}${range("music", "Music", 0, 1, 0.01)}${range("sfx", "Sound effects", 0, 1, 0.01)}${toggle("muted", "Mute all audio", "A little quiet on the circuit.")}</section><section class="settings-section"><h2>${icon("spark")} PICTURE & PERFORMANCE</h2><label class="setting"><span><strong>Graphics quality</strong><small>Lower quality helps integrated graphics.</small></span><select data-setting="quality">${["low", "medium", "high"].map((v) => `<option value="${v}" ${s.quality === v ? "selected" : ""}>${v[0].toUpperCase() + v.slice(1)}</option>`).join("")}</select></label>${toggle("shadows", "Dynamic shadows")}${toggle("reducedEffects", "Reduce visual effects", "Fewer sparks and boost particles.")}<div class="setting"><span><strong>Fullscreen</strong><small>Your browser may require a direct click.</small></span><button class="button secondary small" data-action="fullscreen">${icon("fullscreen")} Toggle</button></div></section></div><div class="settings-column"><section class="settings-section"><h2>${icon("kart")} CAMERA & HANDLING</h2>${range("cameraSensitivity", "Camera response", 0.5, 2, 0.1, "scale")}${range("steeringSensitivity", "Steering sensitivity", 0.5, 1.5, 0.1, "scale")}${toggle("invertCamera", "Invert camera control", "Reverse the garage preview rotation.")}${toggle("shake", "Camera shake", "Subtle feedback from speed and collisions.")}</section><section class="settings-section"><h2>${icon("gamepad")} KEYBOARD MAPPING</h2><p class="settings-help">Select a key, then press its replacement. Arrow keys always work for driving. Escape always pauses.</p><div class="key-mapping">${Object.entries(
        {
          accelerate: "Accelerate",
          brake: "Brake / reverse",
          left: "Steer left",
          right: "Steer right",
          drift: "Drift",
          item: "Use item",
          reset: "Reset kart",
        },
      )
        .map(
          ([key, label]) =>
            `<div><span>${label}</span><button class="key-button" data-action="rebind" data-key="${key}" aria-label="Change ${label} key">${keyName(s.keys[key])}</button></div>`,
        )
        .join(
          "",
        )}</div><button class="text-button" data-action="screen" data-screen="controls">Controller & touch guidance ↗</button></section></div><div class="settings-bottom"><span>${icon("check")} SETTINGS ARE SAVED ON THIS DEVICE</span><button class="button secondary" data-action="defaults">Reset to defaults</button><button class="button primary" data-action="back">DONE ${icon("check")}</button></div></main>`,
    );
  }

  showControls() {
    const keys = this.save.settings.keys;
    this.transition(
      "controls",
      `<div class="panel-shade"></div>${this.header("A LITTLE KNOW-HOW. A LOT OF GO.", "Get comfortable. Then get competitive.")}<main class="controls-panel"><div class="controls-columns"><section class="info-panel"><h2>${icon("gamepad")} FIND YOUR CONTROLS</h2><div class="control-table">${[
        ["Accelerate", `${keyName(keys.accelerate)} / ↑`, "RT / R2"],
        ["Brake & reverse", `${keyName(keys.brake)} / ↓`, "LT / L2"],
        [
          "Steer",
          `${keyName(keys.left)} ${keyName(keys.right)} / ← →`,
          "Left stick / D-pad",
        ],
        ["Drift", keyName(keys.drift), "A / Cross"],
        ["Use item", keyName(keys.item), "X / Square"],
        ["Reset to checkpoint", keyName(keys.reset), "Y / Triangle"],
        ["Pause", "ESC", "Start / Options"],
      ]
        .map(
          ([name, key, pad]) =>
            `<div><span>${name}</span><kbd>${safe(key)}</kbd><small>${pad}</small></div>`,
        )
        .join(
          "",
        )}</div><p class="muted">Connect a standard gamepad and press a button to activate it. Touch buttons appear on phones and tablets. In the garage, drag the preview or use the rotation arrows to inspect your kart.</p><button class="text-button" data-action="screen" data-screen="settings">Customize your keyboard ↗</button></section><section class="info-panel"><h2>${icon("flag")} THE RACING LINE</h2><div class="how-step"><b>01</b><div><h3>Hit the road.</h3><p>Accelerate after GO. Brake before a tight corner, then accelerate smoothly out. Grass and shoulders slow you down.</p></div></div><div class="how-step"><b>02</b><div><h3>Let it slide.</h3><p>Hold drift while steering at speed. Build charge, then release for a mini-turbo. Hold too long or hit a barrier and you’ll lose the reward.</p></div></div><div class="how-step"><b>03</b><div><h3>Make your move.</h3><p>Collect coins and item boxes. Use one held item at a time. Hit boost pads for extra speed, and watch for warning signals.</p></div></div><div class="how-step"><b>04</b><div><h3>Earn the checkered flag.</h3><p>Pass every checkpoint in order to complete a lap. Finish races to earn rewards and win races to unlock more karts. Resetting adds a short recovery delay.</p></div></div></section></div><section class="item-guide"><div class="section-heading"><span class="section-kicker">SIX WAYS TO SHAKE UP THE RACE</span><span class="muted">Original items. Real effects.</span></div><div class="item-guide-grid">${Object.values(
        ITEMS,
      )
        .map(
          (item) =>
            `<article>${icon(item.icon)}<div><h3>${item.name}</h3><p>${item.description}</p></div></article>`,
        )
        .join("")}</div></section></main>`,
    );
  }

  showCredits() {
    this.transition(
      "credits",
      `<div class="panel-shade"></div>${this.header("MADE FOR ONE MORE LAP.")}<main class="credits-panel glass-panel">${this.brand()}<div class="eyebrow">AN ORIGINAL LITTLE ARCADE RACER</div><h1>Big joy.<br>Small wheels.</h1><p>Kart Rush 3D is a browser racing game built with original procedural karts, characters, worlds, and synthesized audio.</p><div class="credit-row"><span>3D rendering</span><strong>Three.js · MIT License</strong></div><div class="credit-row"><span>Development</span><strong>Zuhair Mumtaz</strong></div><div class="credit-row"><span>Art & sound</span><strong>Procedural geometry + Web Audio</strong></div><div class="credit-row"><span>Racing inspiration</span><strong>The joy of arcade racing</strong></div><p class="muted">All characters, vehicles, circuits, and item names are original. No external media or paid services are required. Progress is stored locally in this browser.</p><button class="button primary" data-action="back">BACK TO THE GOOD STUFF ${icon("arrow")}</button></main>`,
    );
  }

  showLoading(progress = 0, message = "Building your next adventure…") {
    if (this.screen !== "loading")
      this.transition(
        "loading",
        `<div class="loading-screen">${this.brand()}<div class="loading-track"><span class="loading-kart">${icon("kart")}</span></div><span class="eyebrow">THE ROAD IS CALLING</span><h1>Almost on the grid.</h1><p id="loading-message"></p><div class="loading-bar"><span id="loading-fill"></span></div><small id="loading-percent"></small></div>`,
      );
    this.root.querySelector("#loading-message").textContent = message;
    const percentage = Math.round(
      Math.min(1, Math.max(0, progress > 1 ? progress / 100 : progress)) * 100,
    );
    this.root.querySelector("#loading-fill").style.width = `${percentage}%`;
    this.root.querySelector("#loading-percent").textContent = `${percentage}%`;
  }

  showHUD(config = {}) {
    this.raceConfig = { ...this.raceConfig, ...config };
    const mode = this.raceConfig.mode || "quick";
    this.lastHUD = {};
    this.transition(
      "race",
      `<div class="race-vignette"></div><div class="hud-top"><div class="hud-group"><div class="position-card"><span class="hud-label">${mode === "time" ? "TIME TRIAL" : "POSITION"}</span><div><strong data-hud="position">01</strong><span data-hud="racers">/ 06</span></div></div><div class="lap-card"><span class="hud-label">LAP</span><div><strong data-hud="lap">1</strong><span>/ ${num(this.raceConfig.laps, 3)}</span></div><span class="race-track-label">${safe(TRACKS.find((t) => t.id === this.raceConfig.trackId)?.name || this.track.name)}</span></div></div><div class="race-center-status" aria-live="polite"><span class="pill" data-hud="status">ON THE GRID</span></div><div class="hud-group hud-right"><div class="timing-card"><div><span class="hud-label">RACE TIME</span><strong data-hud="time">00:00.000</strong></div><div><span class="hud-label">CURRENT LAP</span><span data-hud="lapTime">00:00.000</span></div><div><span class="hud-label">BEST LAP</span><span data-hud="bestLap">—</span></div></div><button class="hud-pause" data-action="pause" title="Pause race (Escape)" aria-label="Pause race">${icon("pause")}</button></div></div><div class="hud-notifications" aria-live="polite"></div><div class="countdown-overlay" aria-live="assertive" hidden><span class="countdown-title">READY WHEN YOU ARE</span><strong id="countdown-value">3</strong><span class="countdown-subtitle">${safe(TRACKS.find((t) => t.id === this.raceConfig.trackId)?.name || this.track.name)}</span></div><div class="finish-ribbon" hidden><span class="eyebrow">THAT’S A WRAP</span><strong>FINISH!</strong><span>Rivals are racing to the line…</span></div><div class="hud-bottom"><div class="minimap-card"><canvas id="minimap" width="380" height="260" aria-label="Circuit minimap and racer positions"></canvas><div><span class="live-dot"></span><span>YOU</span><span class="map-rivals-dot"></span><span>RIVALS</span><span class="hud-coins">${icon("coin")}<b data-hud="coins">0</b></span></div></div><div class="speed-cluster"><div class="speed-readout"><strong data-hud="speed">0</strong><span>KM/H</span></div><div class="drift-indicator"><div class="drift-label"><span data-hud="driftLabel">HOLD ${keyName(this.save.settings.keys.drift)} TO DRIFT</span><b data-hud="boostLabel"></b></div><div class="drift-bar"><span data-hud="driftFill"></span></div></div></div><div class="item-cluster"><div class="effect-badges" data-hud="effects"></div><button class="item-card" data-control="item" title="Use held item"><span class="item-icon" data-hud="itemIcon">?</span><span class="item-content"><small>HELD ITEM</small><strong data-hud="itemName">Find an item box</strong><span data-hud="itemHint">One good pickup changes everything.</span></span><kbd>${keyName(this.save.settings.keys.item)}</kbd></button><button class="reset-hint" data-control="reset" title="Reset to last checkpoint"><kbd>${keyName(this.save.settings.keys.reset)}</kbd> Reset kart</button></div></div><div class="race-progress"><span data-hud="progressFill"></span></div><div class="touch-controls" aria-label="Touch driving controls"><div class="touch-steering"><button data-control="left" aria-label="Steer left">←</button><button data-control="right" aria-label="Steer right">→</button></div><div class="touch-actions"><button class="touch-drift" data-control="drift">DRIFT</button><button class="touch-brake" data-control="brake">BRAKE</button><button class="touch-throttle" data-control="throttle" aria-label="Accelerate">${icon("arrow")}<span>GO</span></button></div></div>`,
      { navigate: false },
    );
    this.hud = Object.fromEntries(
      [...this.root.querySelectorAll("[data-hud]")].map((el) => [
        el.dataset.hud,
        el,
      ]),
    );
    this.minimap = this.root.querySelector("#minimap");
    this.mapRoute = null;
  }

  setHUD(key, value) {
    if (this.lastHUD[key] === value || !this.hud?.[key]) return;
    this.lastHUD[key] = value;
    this.hud[key].textContent = value;
  }

  updateHUD(race) {
    if (this.screen !== "race" || !race?.player) return;
    const p = race.player;
    this.setHUD("position", String(p.position || 1).padStart(2, "0"));
    this.setHUD("racers", `/ ${String(race.racers.length).padStart(2, "0")}`);
    this.setHUD(
      "lap",
      Math.min(p.lap || 1, this.raceConfig.laps || race.laps || 3),
    );
    this.setHUD("time", fmt(race.time) === "—" ? "00:00.000" : fmt(race.time));
    this.setHUD(
      "lapTime",
      fmt(p.lapTime) === "—" ? "00:00.000" : fmt(p.lapTime),
    );
    this.setHUD("bestLap", fmt(p.bestLap ?? this.recordBest(race.route.id)));
    this.setHUD("coins", p.coins || 0);
    this.setHUD("speed", Math.round(Math.abs(num(p.speed)) * 3.6));
    this.setHUD(
      "status",
      p.resetTimer > 0
        ? `RECOVERING · ${p.resetTimer.toFixed(1)}s`
        : p.finished
          ? "FINISHED"
          : p.boost > 0
            ? "TURBO ACTIVE"
            : p.hitTimer > 0
              ? "KEEP IT TOGETHER"
              : p.airborne
                ? "AIR TIME"
                : race.state === "countdown"
                  ? "ON THE GRID"
                  : this.raceConfig.mode === "time"
                    ? "CHASE YOUR BEST"
                    : "MAKE EVERY CORNER COUNT",
    );
    this.hud.status.classList.toggle("turbo", p.boost > 0);
    const charge = Math.max(0, Math.min(1, num(p.driftCharge) / 2.4));
    this.hud.driftFill.style.width = `${charge * 100}%`;
    this.hud.driftFill.classList.toggle("charged", p.driftCharge > 0.65);
    this.setHUD(
      "driftLabel",
      p.drifting
        ? p.driftCharge > 3.25
          ? "TOO HOT · LOSING SPEED"
          : p.driftCharge > 2.4
            ? "RELEASE FOR SUPER TURBO"
            : p.driftCharge > 0.65
              ? "RELEASE FOR MINI TURBO"
              : "BUILDING DRIFT CHARGE"
        : p.boost > 0
          ? "LET IT FLY"
          : `HOLD ${keyName(this.save.settings.keys.drift)} TO DRIFT`,
    );
    this.setHUD(
      "boostLabel",
      p.boost > 0
        ? `${p.boost.toFixed(1)}s`
        : p.drifting
          ? `${Math.round(charge * 100)}%`
          : "",
    );
    const item = ITEMS[p.item];
    const itemKey = p.item || "";
    if (this.lastHUD.item !== itemKey) {
      this.lastHUD.item = itemKey;
      this.hud.itemIcon.innerHTML = item ? icon(item.icon) : "?";
      this.setHUD("itemName", item?.name || "Find an item box");
      this.setHUD(
        "itemHint",
        item
          ? "Ready when you are. Use it wisely."
          : "One good pickup changes everything.",
      );
      this.hud.itemIcon
        .closest(".item-card")
        .classList.toggle("has-item", !!item);
    }
    const effects = `${p.shield ? (p.shieldTime > 0 ? `SHIELD ${p.shieldTime.toFixed(1)}s` : "SHIELD READY") : ""}${p.shield && p.ghost > 0 ? " · " : ""}${p.ghost > 0 ? `GHOST ${p.ghost.toFixed(1)}s` : ""}`;
    this.setHUD("effects", effects);
    this.hud.progressFill.style.width = `${Math.min(100, Math.max(0, (num(p.progress) / (this.raceConfig.laps || race.laps || 3)) * 100))}%`;
    this.root.querySelector(".finish-ribbon").hidden = !p.finished;
    this.drawMinimap(race);
  }

  drawMinimap(race) {
    if (!this.minimap) return;
    if (this.mapRoute !== race.route) {
      this.mapRoute = race.route;
      const points = Array.from({ length: 160 }, (_, i) =>
        race.route.getPoint(i / 160),
      );
      const minX = Math.min(...points.map((p) => p.x)),
        maxX = Math.max(...points.map((p) => p.x));
      const minZ = Math.min(...points.map((p) => p.z)),
        maxZ = Math.max(...points.map((p) => p.z));
      const scale = Math.min(320 / (maxX - minX), 205 / (maxZ - minZ));
      this.mapTransform = {
        scale,
        offsetX: 190 - ((minX + maxX) * scale) / 2,
        offsetZ: 127 - ((minZ + maxZ) * scale) / 2,
      };
      this.mapBase = document.createElement("canvas");
      this.mapBase.width = 380;
      this.mapBase.height = 260;
      const ctx = this.mapBase.getContext("2d");
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      points.forEach((p, i) => {
        const m = this.mapPoint(p);
        i ? ctx.lineTo(m.x, m.y) : ctx.moveTo(m.x, m.y);
      });
      ctx.closePath();
      ctx.strokeStyle = "#49626d";
      ctx.lineWidth = 19;
      ctx.stroke();
      ctx.strokeStyle = "#afc1b7";
      ctx.lineWidth = 9;
      ctx.stroke();
      const start = this.mapPoint(points[0]);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(start.x - 5, start.y - 5, 10, 10);
    }
    const ctx = this.minimap.getContext("2d");
    ctx.clearRect(0, 0, 380, 260);
    ctx.drawImage(this.mapBase, 0, 0);
    for (const r of [...race.racers.filter((r) => !r.isPlayer), race.player]) {
      const p = this.mapPoint(r);
      ctx.beginPath();
      ctx.arc(p.x, p.y, r.isPlayer ? 9 : 6, 0, Math.PI * 2);
      ctx.fillStyle = r.isPlayer ? "#d2ff78" : r.color || "#ff936e";
      ctx.fill();
      ctx.strokeStyle = "#142b35";
      ctx.lineWidth = 3;
      ctx.stroke();
      if (r.isPlayer) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(-r.heading);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.moveTo(0, 11);
        ctx.lineTo(-4, 4);
        ctx.lineTo(4, 4);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  mapPoint(p) {
    return {
      x: p.x * this.mapTransform.scale + this.mapTransform.offsetX,
      y: p.z * this.mapTransform.scale + this.mapTransform.offsetZ,
    };
  }

  mapSVG(id) {
    if (this.routeMaps.has(id)) return this.routeMaps.get(id);
    const route = createRoute(id),
      points = Array.from({ length: 100 }, (_, i) => route.getPoint(i / 100));
    const minX = Math.min(...points.map((p) => p.x)),
      maxX = Math.max(...points.map((p) => p.x)),
      minZ = Math.min(...points.map((p) => p.z)),
      maxZ = Math.max(...points.map((p) => p.z));
    const scale = Math.min(220 / (maxX - minX), 120 / (maxZ - minZ));
    const path =
      points
        .map(
          (p, i) =>
            `${i ? "L" : "M"}${(130 + (p.x - (minX + maxX) / 2) * scale).toFixed(1)},${(80 + (p.z - (minZ + maxZ) / 2) * scale).toFixed(1)}`,
        )
        .join(" ") + "Z";
    const p = points[0],
      x = 130 + (p.x - (minX + maxX) / 2) * scale,
      y = 80 + (p.z - (minZ + maxZ) / 2) * scale;
    const svg = `<svg class="track-route" viewBox="0 0 260 160" fill="none" aria-hidden="true"><path class="route-shadow" d="${path}"/><path class="route-line" d="${path}"/><circle cx="${x}" cy="${y}" r="5" fill="currentColor"/><circle cx="${x}" cy="${y}" r="2" fill="#152d39"/></svg>`;
    this.routeMaps.set(id, svg);
    return svg;
  }

  setCountdown(value) {
    const overlay = this.root.querySelector(".countdown-overlay");
    if (!overlay) return;
    overlay.hidden = false;
    const text =
      typeof value === "string" && !Number.isFinite(Number(value))
        ? value
        : Number(value) > 0
          ? String(Math.ceil(value))
          : "GO!";
    const el = overlay.querySelector("#countdown-value");
    if (el.textContent !== text) {
      el.textContent = text;
      el.classList.remove("countdown-pop");
      void el.offsetWidth;
      el.classList.add("countdown-pop");
    }
    overlay.classList.toggle("go", text === "GO!");
  }
  hideCountdown() {
    const el = this.root.querySelector(".countdown-overlay");
    if (el) el.hidden = true;
  }

  notify(message, tone = "info") {
    let holder = this.root.querySelector(".hud-notifications");
    if (!holder) {
      holder = document.createElement("div");
      holder.className = "hud-notifications";
      this.root.append(holder);
    }
    const note = document.createElement("div");
    note.className = `toast toast-${tone}`;
    note.textContent = message;
    holder.append(note);
    while (holder.children.length > 3) holder.firstChild.remove();
    const timeout = setTimeout(() => {
      note.remove();
      this.notices = this.notices.filter((t) => t !== timeout);
    }, 3200);
    this.notices.push(timeout);
  }

  showPause() {
    this.returnScreen = "pause";
    this.transition(
      "pause",
      `<div class="pause-shade"></div><main class="pause-panel glass-panel"><span class="eyebrow">TAKE A BREATHER</span><h1>Good things<br>can wait.</h1><p>Your race is paused. The road will be here.</p><button class="button primary" data-action="resume"><span>${icon("flag")} RESUME RACE</span>${icon("arrow")}</button><button class="button secondary" data-action="restart">${icon("rotate")} Restart race</button><button class="button secondary" data-action="screen" data-screen="settings">${icon("settings")} Settings</button><button class="button quiet" data-action="quit">Quit to main menu</button><span class="subtle-note"><kbd>ESC</kbd> TO RESUME</span></main>`,
      { navigate: false },
    );
  }

  showResults(results, context = {}) {
    this.resultsContext = context;
    const player = results.find((r) => r.isPlayer) || results[0] || {};
    const won = player.position === 1;
    const isTime = context.mode === "time";
    const reward = context.reward ?? player.coins ?? 0;
    this.transition(
      "results",
      `<div class="results-shade"></div>${this.header("THE CHECKERED FLAG", "Every finish is a reason to go again.", false)}<main class="results-layout"><section class="results-celebration"><span class="pill">${isTime ? "TIME TRIAL COMPLETE" : won ? "WINNER’S CIRCLE" : "RACE COMPLETE"}</span><h1>${isTime ? "YOUR TIME.<br>YOUR LINE." : won ? "THAT’S<br>YOUR RACE." : "WHAT<br>A RIDE."}</h1><div class="results-position"><strong>${String(player.position || 1).padStart(2, "0")}</strong><span>${isTime ? "PERSONAL CHALLENGE" : `OF ${results.length} RACERS`}</span></div><div class="results-reward">${icon("coin")}<span>+${safe(reward)}<small>COINS EARNED</small></span>${won ? `<i></i>${icon("cup")}<span>+1<small>RACE WIN</small></span>` : ""}</div><p>${context.mode === "gp" ? `CHAMPIONSHIP · ROUND ${num(context.gpRound, 1)} OF 4` : safe(TRACKS.find((t) => t.id === context.trackId)?.name || this.track.name)}</p></section><section class="results-board glass-panel"><div class="section-heading"><span class="section-kicker">${isTime ? "YOUR SESSION" : "FINAL STANDINGS"}</span>${icon(isTime ? "clock" : "flag")}</div><div class="result-stats"><div><small>RACE TIME</small><strong>${fmt(player.time)}</strong></div><div><small>BEST LAP</small><strong>${fmt(player.bestLap)}</strong></div><div><small>LAPS</small><strong>${player.completedLaps || 0}/${context.laps || this.raceConfig?.laps || 3}</strong></div></div><div class="leaderboard"><div class="leaderboard-head"><span>POS</span><span>RACER</span><span>TIME</span></div>${results.map((r, i) => `<div class="leaderboard-row ${r.isPlayer ? "is-player" : ""}"><span>${String(r.position || i + 1).padStart(2, "0")}</span><span>${safe(r.name)}${r.isPlayer ? "<small>YOU</small>" : ""}</span><span>${r.finished === false ? "DNF" : fmt(r.time)}</span></div>`).join("")}</div><div class="results-actions">${context.mode === "gp" ? `<button class="button primary" data-action="continue-gp">${context.gpRound >= 4 ? "CHAMPIONSHIP RESULTS" : "CONTINUE CHAMPIONSHIP"} ${icon("arrow")}</button>` : `<button class="button primary" data-action="restart">${icon("rotate")} RACE AGAIN</button>`}<button class="button secondary" data-action="quit">Main menu</button></div><div class="subtle-note">${isTime ? "Valid lap records are saved on this device." : "Rivals marked DNF did not finish before the time limit."}</div></section></main>`,
      { navigate: false },
    );
  }

  showGP(standings, final = false) {
    const sorted = [...standings].sort((a, b) => b.points - a.points);
    const place = sorted.findIndex((r) => r.isPlayer) + 1;
    this.transition(
      "gp",
      `<div class="results-shade"></div>${this.header(final ? "THE GRAND FINALE" : "THE CHAMPIONSHIP CONTINUES", "Four circuits. One unforgettable tour.", false)}<main class="championship-panel glass-panel"><span class="championship-cup">${icon("cup")}</span><span class="eyebrow">${final ? "CHAMPIONSHIP COMPLETE" : "CUMULATIVE STANDINGS"}</span><h1>${final ? (place === 1 ? "A TOUR DE FORCE." : "WHAT A JOURNEY.") : "EVERY POINT COUNTS."}</h1><p>${final ? `You finished ${place}${place === 1 ? "st" : place === 2 ? "nd" : place === 3 ? "rd" : "th"} in the Grand Prix.` : "Get ready for the next circuit."}</p><div class="leaderboard"><div class="leaderboard-head"><span>POS</span><span>RACER</span><span>POINTS</span></div>${sorted.map((r, i) => `<div class="leaderboard-row ${r.isPlayer ? "is-player" : ""}"><span>${String(i + 1).padStart(2, "0")}</span><span>${safe(r.name)}${r.isPlayer ? "<small>YOU</small>" : ""}</span><strong>${r.points}</strong></div>`).join("")}</div><div class="results-actions">${final ? `<button class="button primary" data-action="quit">BACK TO MAIN MENU ${icon("arrow")}</button>` : `<button class="button primary" data-action="continue-gp">NEXT RACE ${icon("arrow")}</button><button class="button secondary" data-action="quit">Main menu</button>`}</div>${final ? '<span class="subtle-note">Your best championship result is saved on this device.</span>' : ""}</main>`,
      { navigate: false },
    );
  }

  selectTrack(id) {
    if (!TRACKS.some((t) => t.id === id)) return;
    this.save.selection.trackId = id;
    this.call("selectionChanged", this.save.selection);
    this.call("previewTrack", id);
    if (this.screen === "tracks") this.showTracks();
    else if (this.screen === "setup") this.showSetup();
  }

  onClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button || button.disabled) return;
    const { action } = button.dataset;
    this.call("menuSound");
    if (action === "screen") {
      if (button.dataset.screen === "garage")
        this.garageReturn = this.screen === "setup" ? "setup" : "menu";
      if (button.dataset.screen === "tracks")
        this.tracksReturn = this.screen === "setup" ? "setup" : "menu";
      this.showScreen(button.dataset.screen);
    } else if (action === "back") {
      if (this.screen === "garage")
        this.showScreen(this.garageReturn || "menu");
      else if (this.screen === "tracks")
        this.showScreen(this.tracksReturn || "menu");
      else if (
        this.screen === "settings" ||
        this.screen === "controls" ||
        this.screen === "credits"
      )
        this.showScreen(this.returnScreen);
      else this.showMenu();
    } else if (action === "play" || action === "mode") {
      this.config.mode = button.dataset.mode || "quick";
      this.showSetup();
      if (this.config.mode === "gp") this.call("previewTrack", TRACKS[0].id);
    } else if (action === "setup-mode") {
      this.config.mode = button.dataset.mode;
      this.showSetup();
      this.call(
        "previewTrack",
        this.config.mode === "gp" ? TRACKS[0].id : this.save.selection.trackId,
      );
    } else if (action === "select-track") this.selectTrack(button.dataset.id);
    else if (action === "race-selected") {
      if (this.tracksReturn !== "setup") this.config.mode = "quick";
      this.showSetup();
    } else if (action === "start") {
      this.call("startRace", {
        ...this.config,
        trackId:
          this.config.mode === "gp"
            ? TRACKS[0].id
            : this.save.selection.trackId,
        kartId: this.save.selection.kartId,
        customization: this.customization(),
      });
    } else if (action === "select-kart") {
      const kart = KARTS.find((k) => k.id === button.dataset.id);
      if (!kart || !this.unlocked(kart)) return;
      this.save.selection.kartId = kart.id;
      this.call("selectionChanged", this.save.selection);
      this.showGarage();
    } else if (action === "paint") {
      this.save.selection[button.dataset.part] = button.dataset.color;
      this.call("selectionChanged", this.save.selection);
      this.call(
        "previewKart",
        this.save.selection.kartId,
        this.customization(),
      );
      this.root.querySelectorAll('[data-action="paint"]').forEach((el) => {
        const selected =
          this.save.selection[el.dataset.part] === el.dataset.color;
        el.classList.toggle("selected", selected);
        el.setAttribute("aria-pressed", String(selected));
        el.innerHTML = selected ? icon("check") : "";
      });
    } else if (action === "rotate")
      this.call("rotatePreview", Number(button.dataset.delta));
    else if (action === "garage-done")
      this.showScreen(this.garageReturn || "setup");
    else if (action === "pause") this.call("pause");
    else if (action === "resume") this.call("resume");
    else if (action === "restart") this.call("restart");
    else if (action === "quit") {
      this.returnScreen = "menu";
      this.call("quit");
    } else if (action === "fullscreen") this.call("fullscreen");
    else if (action === "continue-gp") this.call("continueGP");
    else if (action === "defaults") {
      const defaults = { ...DEFAULT_SETTINGS, keys: { ...DEFAULT_KEYS } };
      this.call("settingsChanged", defaults);
      Object.assign(this.save.settings, defaults);
      this.showSettings();
      this.notify("Settings restored to defaults.");
    } else if (action === "rebind") {
      this.captureKey = button.dataset.key;
      button.textContent = "PRESS A KEY…";
      button.classList.add("listening");
    }
  }

  onChange(event) {
    const target = event.target;
    // Ranges update continuously; other form controls commit once on change.
    if ((event.type === "input") !== (target.type === "range")) return;
    if (target.dataset.setting) {
      const key = target.dataset.setting;
      const changed = {
        ...this.save.settings,
        [key]:
          target.type === "checkbox"
            ? target.checked
            : target.type === "range"
              ? Number(target.value)
              : target.value,
      };
      const output = this.root.querySelector(`[data-output="${key}"]`);
      if (output)
        output.textContent = ["master", "music", "sfx"].includes(key)
          ? `${Math.round(Number(target.value) * 100)}%`
          : `${Number(target.value).toFixed(1)}×`;
      this.call("settingsChanged", changed);
      Object.assign(this.save.settings, changed);
    } else if (target.dataset.config) {
      this.config[target.dataset.config] =
        target.dataset.config === "laps" ? Number(target.value) : target.value;
    } else if (target.dataset.selection && event.type === "change") {
      this.save.selection[target.dataset.selection] = target.value;
      this.call("selectionChanged", this.save.selection);
      this.call(
        "previewKart",
        this.save.selection.kartId,
        this.customization(),
      );
    }
  }

  onKey(event) {
    if (this.captureKey) {
      event.preventDefault();
      event.stopPropagation();
      if (
        event.code !== "Escape" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !["Tab", "CapsLock"].includes(event.code)
      ) {
        const keys = this.save.settings.keys,
          old = keys[this.captureKey];
        const duplicate = Object.keys(keys).find(
          (key) => key !== this.captureKey && keys[key] === event.code,
        );
        if (duplicate) keys[duplicate] = old;
        keys[this.captureKey] = event.code;
        this.call("settingsChanged", this.save.settings);
      }
      this.captureKey = null;
      this.showSettings();
      return;
    }
    if (["race", "pause", "loading", "results", "gp"].includes(this.screen))
      return;
    if (event.code === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      this.root.querySelector('[data-action="back"]')?.click();
      return;
    }
    if (
      !["ArrowDown", "ArrowUp"].includes(event.code) ||
      ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName)
    )
      return;
    const controls = [
      ...this.root.querySelectorAll("button:not(:disabled),select,input"),
    ].filter((el) => el.offsetParent !== null);
    const at = controls.indexOf(document.activeElement);
    const next =
      at < 0
        ? event.code === "ArrowDown"
          ? 0
          : controls.length - 1
        : (at + (event.code === "ArrowDown" ? 1 : -1) + controls.length) %
          controls.length;
    if (controls[next]) {
      event.preventDefault();
      controls[next].focus();
    }
  }

  onPointerDown(event) {
    if (
      this.screen !== "garage" ||
      !event.target.closest("[data-preview]") ||
      event.target.closest("button")
    )
      return;
    this.dragging = { x: event.clientX };
    event.preventDefault();
  }
  onPointerMove(event) {
    if (!this.dragging) return;
    this.call("rotatePreview", (event.clientX - this.dragging.x) * 0.012);
    this.dragging.x = event.clientX;
  }
  destroy() {
    this.root.removeEventListener("click", this._click);
    this.root.removeEventListener("change", this._change);
    this.root.removeEventListener("input", this._change);
    this.root.removeEventListener("pointerdown", this._pointerDown);
    window.removeEventListener("pointermove", this._pointerMove);
    window.removeEventListener("pointerup", this._pointerUp);
    document.removeEventListener("keydown", this._key);
    this.notices.forEach(clearTimeout);
  }
}

export default UI;
