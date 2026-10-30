import {KARTS} from '../vehicles/KartCatalog.js';
import {updateKart, collideKarts} from '../vehicles/KartPhysics.js';
import {AIDriver} from '../ai/AIDriver.js';
import {updateCheckpoints} from '../systems/CheckpointSystem.js';
import {ItemSystem} from '../systems/ItemSystem.js';

const RIVAL_NAMES = ['Pip Circuit', 'Nova Spark', 'Rocco Roll', 'Mika Drift', 'Bolt Bumble'];
const RIVAL_COLORS = ['#fc7057', '#a58bfa', '#56d1d1', '#ffbf47', '#f795c4'];
const IDLE_INPUT = Object.freeze({throttle: 0, brake: 0, steer: 0, drift: false, item: false, reset: false});

export class RaceManager {
  constructor({route, mode = 'quick', laps = 3, difficulty = 'normal', kartId = 'comet', customization = {}, seed = 481516}) {
    if (!route?.getPoint || !route?.project || route.length <= 0) throw new Error('A valid closed racing route is required.');
    this.route = route; this.mode = mode; this.laps = Math.max(1, Math.min(9, Math.round(laps))); this.difficulty = difficulty;
    this.state = 'countdown'; this.countdown = 3; this.time = 0; this.events = []; this.hazards = [];
    this._countdownTime = 3.6; this._lastCount = 3; this._finishGrace = 0; this._seed = seed >>> 0;
    this.autopilot = false; this.steeringSensitivity = 1; this.racers = []; this.ai = new Map();
    const count = mode === 'time' ? 1 : 6;
    for (let i = 0; i < count; i++) {
      const player = i === 0, kart = KARTS.find(k => k.id === (player ? kartId : KARTS[(i + 1) % KARTS.length].id)) || KARTS[0];
      const gridRow = player ? 2 : Math.floor((i - 1) / 2);
      const gridSide = player ? -1 : i % 2 ? -1 : 1;
      const behind = 8 + gridRow * 5 + (i === 5 ? 5 : 0);
      const t = (1 - behind / route.length + 1) % 1, p = route.getPoint(t);
      const lane = count === 1 ? 0 : gridSide * 2.8;
      const r = {
        id: player ? 'player' : `rival-${i}`, index: i, name: player ? 'You' : RIVAL_NAMES[i - 1], isPlayer: player,
        kartId: kart.id, color: player ? customization.paint || kart.color : RIVAL_COLORS[i - 1], customization: player ? customization : {},
        x: p.x + Math.cos(p.heading) * lane, y: p.y, z: p.z - Math.sin(p.heading) * lane, heading: p.heading,
        previousX: p.x, previousZ: p.z, speed: 0, vx: 0, vy: 0, vz: 0, steer: 0,
        maxSpeed: 33 + kart.speed * 2.2, accel: 10 + kart.acceleration * 2.2, turnRate: 1.65 + kart.handling * 0.18,
        weight: 1 + kart.weight * 0.25, driftStat: kart.drift,
        drifting: false, driftDirection: 0, driftCharge: 0, boost: 0, shield: false, shieldTime: 0, ghost: 0, hitTimer: 0,
        immunity: 0, slip: 0, airborne: false, suspension: 0, padCooldown: 0, jumpCooldown: 0,
        lap: 1, completedLaps: 0, nextCheckpoint: 1, progress: -behind / route.length, position: count,
        coins: 0, item: null, lapTime: 0, bestLap: null, finishTime: null, finished: false,
        resetTimer: 0, resetCooldown: 0, trackT: t, lastT: t, safeT: t, lateral: lane, offRoad: false, started: false, lapInvalid: false,
        _resetPending: false, _lastItemPressed: false, _lastResetPressed: false
      };
      this.racers.push(r); this.ai.set(r.id, new AIDriver(i, player ? difficulty : difficulty));
    }
    this.player = this.racers[0]; this.items = new ItemSystem(this); this.collectibles = this.items.createCollectibles();
    this.updatePositions(); this.emit({type: 'countdown', value: 3});
  }
  random() { this._seed = (1664525 * this._seed + 1013904223) >>> 0; return this._seed / 4294967296; }
  emit(event) { this.events.push(event); }
  consumeEvents() { const events = this.events; this.events = []; return events; }
  getAIInput(racer, dt = 1 / 60) { return this.ai.get(racer.id).update(racer, this, dt); }
  useItem(racer = this.player) { return this.items.use(racer); }
  requestReset(racer = this.player) {
    if (racer.resetCooldown > 0 || racer.resetTimer > 0 || racer.finished) return false;
    racer.resetTimer = 1.8; racer.resetCooldown = 4; racer._resetPending = true;
    racer.drifting = false; racer.driftCharge = 0; racer.boost = 0; racer.lapInvalid = true;
    this.emit({type: 'reset', racerId: racer.id, delay: 1.8}); return true;
  }
  completeReset(racer) {
    const p = this.route.getPoint(racer.safeT), lane = racer.index % 2 ? 1.6 : -1.6;
    racer.x = p.x + Math.cos(p.heading) * lane; racer.z = p.z - Math.sin(p.heading) * lane; racer.y = p.y;
    racer.heading = p.heading; racer.speed = 0; racer.vx = 0; racer.vz = 0; racer.vy = 0; racer.airborne = false;
    racer.trackT = racer.safeT % 1; racer.lastT = racer.trackT; racer.immunity = 2.3; racer.ghost = Math.max(racer.ghost, 1.2);
    racer.slip = 0; racer.hitTimer = 0; racer._resetPending = false;
    this.emit({type: 'respawn', racerId: racer.id});
  }
  update(dt, input = IDLE_INPUT) {
    if (!Number.isFinite(dt) || dt <= 0 || this.state === 'finished' || this.state === 'paused') return;
    dt = Math.min(dt, 1 / 30);
    if (this.state === 'countdown') {
      this._countdownTime -= dt; this.countdown = Math.max(0, Math.ceil(this._countdownTime - 0.6));
      if (this.countdown !== this._lastCount) {
        this._lastCount = this.countdown;
        if (this.countdown > 0) this.emit({type: 'countdown', value: this.countdown});
      }
      if (this._countdownTime <= 0) { this.state = 'racing'; this.countdown = 0; this.emit({type: 'go'}); }
      return;
    }
    this.time += dt;
    for (const r of this.racers) {
      const control = !r.isPlayer || r.finished || this.autopilot ? this.getAIInput(r, dt) : input;
      const resetPressed = !!control.reset;
      const itemPressed = !!control.item;
      if (resetPressed && !r._lastResetPressed) this.requestReset(r);
      if (itemPressed && !r._lastItemPressed && !r.finished) this.items.use(r);
      r._lastResetPressed = resetPressed; r._lastItemPressed = itemPressed;
      updateKart(r, control, this.route, dt, event => this.emit(event), r.isPlayer && !this.autopilot && !r.finished ? this.steeringSensitivity : 1);
      if (r._resetPending && r.resetTimer <= 0) this.completeReset(r);
      if (r.y < this.route.getPoint(r.trackT).y - 8 || !Number.isFinite(r.x + r.y + r.z)) this.requestReset(r);
      if (!r.finished && r.resetTimer <= 0) updateCheckpoints(r, this, dt);
      else if (!r.finished) r.lapTime += dt;
    }
    collideKarts(this.racers, event => this.emit(event));
    this.updatePositions(); this.items.update(dt);
    if (this.player.finished && this.state !== 'finishing') { this.state = 'finishing'; this._finishGrace = 15; }
    if (this.state === 'finishing') {
      this._finishGrace -= dt;
      const allFinished = this.racers.every(r => r.finished);
      if ((allFinished && this._finishGrace < 13.5) || this._finishGrace <= 0) {
        this.state = 'finished'; this.emit({type: 'results'});
      }
    }
  }
  updatePositions() {
    const sorted = [...this.racers].sort((a, b) => a.finished && b.finished ? a.finishTime - b.finishTime : a.finished ? -1 : b.finished ? 1 : b.progress - a.progress);
    sorted.forEach((r, i) => {
      const next = i + 1;
      if (r.isPlayer && r.position !== next && this.time > 2) this.emit({type: 'position', racerId: r.id, position: next, previous: r.position});
      r.position = next;
    });
  }
  getResults() {
    this.updatePositions();
    return [...this.racers].sort((a, b) => a.position - b.position).map(r => ({
      id: r.id, name: r.name, isPlayer: r.isPlayer, position: r.position, completedLaps: r.completedLaps,
      time: r.finishTime, bestLap: r.bestLap, coins: r.coins, finished: r.finished
    }));
  }
}
