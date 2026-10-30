import {wrapAngle, wrapDelta} from '../vehicles/KartPhysics.js';
export const ITEMS = ['boost', 'oil', 'shield', 'pulse', 'spark', 'ghost'];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class ItemSystem {
  constructor(race) { this.race = race; this.serial = 0; }
  createCollectibles() {
    const {route, mode} = this.race, collectibles = [];
    for (let section = 0; section < 10; section++) {
      for (let n = 0; n < 3; n++) {
        const t = ((section + 0.48) / 10 + n * 4 / route.length) % 1;
        const p = route.getPoint(t), lane = Math.sin(section * 2) * 3;
        collectibles.push({id: `coin-${section}-${n}`, type: 'coin', t, x: p.x + Math.cos(p.heading) * lane, y: p.y + 1.1, z: p.z - Math.sin(p.heading) * lane, active: true, respawn: 0});
      }
    }
    if (mode !== 'time') for (let section = 0; section < 4; section++) for (let lane = -1; lane <= 1; lane++) {
      const t = (section + 0.62) / 4, p = route.getPoint(t);
      collectibles.push({id: `box-${section}-${lane}`, type: 'box', t, x: p.x + Math.cos(p.heading) * lane * 4.1, y: p.y + 1.35, z: p.z - Math.sin(p.heading) * lane * 4.1, active: true, respawn: 0});
    }
    return collectibles;
  }
  hit(target, source, strength = 0.55) {
    if (target.ghost > 0 || target.immunity > 0 || target.resetTimer > 0) return false;
    if (target.shield) {
      target.shield = false; target.shieldTime = 0; target.immunity = 1.2;
      this.race.emit({type: 'shieldHit', racerId: target.id, x: target.x, y: target.y, z: target.z}); return false;
    }
    target.speed *= strength; target.hitTimer = 0.65; target.immunity = 1.3; target.drifting = false; target.driftCharge = 0;
    this.race.emit({type: 'collision', racerId: target.id, source, x: target.x, y: target.y, z: target.z, strength: 0.8}); return true;
  }
  use(racer) {
    const r = racer, race = this.race, item = r.item;
    if (!item || r.resetTimer > 0 || r.hitTimer > 0) return false;
    r.item = null;
    race.emit({type: 'itemUse', racerId: r.id, item, x: r.x, y: r.y, z: r.z});
    if (item === 'boost') {
      r.boost = Math.max(r.boost, 2.7); r.speed = Math.max(r.speed, r.maxSpeed * 0.97);
      race.emit({type: 'boost', racerId: r.id, level: 3});
    } else if (item === 'shield') { r.shield = true; r.shieldTime = 15; }
    else if (item === 'ghost') { r.ghost = 5; r.slip = 0; r.hitTimer = 0; }
    else if (item === 'oil') {
      const x = r.x - Math.sin(r.heading) * 4, z = r.z - Math.cos(r.heading) * 4;
      race.hazards.push({id: ++this.serial, type: 'oil', owner: r.id, x, y: race.route.project(x, z).y + 0.04, z, life: 14, radius: 2.4, age: 0});
    } else if (item === 'pulse') {
      race.hazards.push({id: ++this.serial, type: 'pulse', owner: r.id, x: r.x, y: r.y + 0.5, z: r.z, life: 0.7, radius: 0, age: 0});
      for (const target of race.racers) if (target !== r && Math.hypot(target.x - r.x, target.z - r.z) < 17) this.hit(target, 'pulse', 0.5);
    } else if (item === 'spark') {
      const target = race.racers.filter(other => other !== r && !other.finished && other.progress > r.progress && other.ghost <= 0).sort((a, b) => Math.hypot(a.x - r.x, a.z - r.z) - Math.hypot(b.x - r.x, b.z - r.z))[0];
      if (target) {
        race.hazards.push({id: ++this.serial, type: 'spark', owner: r.id, target: target.id, x: r.x + Math.sin(r.heading) * 3, y: r.y + 1.1, z: r.z + Math.cos(r.heading) * 3, heading: r.heading, life: 4.8, age: 0, radius: 0.65});
        race.emit({type: 'warning', racerId: target.id, item: 'spark', message: 'Homing spark incoming — drift, shield or evade!'});
      } else race.emit({type: 'notice', racerId: r.id, message: 'No rival ahead to target'});
    }
    return true;
  }
  update(dt) {
    const race = this.race;
    for (const collectible of race.collectibles) {
      if (!collectible.active) { collectible.respawn -= dt; if (collectible.respawn <= 0) collectible.active = true; continue; }
      for (const r of race.racers) {
        if (r.finished || r.resetTimer > 0 || Math.abs(r.y + 1 - collectible.y) > 2.7) continue;
        if (Math.hypot(r.x - collectible.x, r.z - collectible.z) > (collectible.type === 'box' ? 2.5 : 2)) continue;
        if (collectible.type === 'box' && r.item) continue;
        collectible.active = false; collectible.respawn = collectible.type === 'coin' ? 9 : 11;
        if (collectible.type === 'coin') {
          r.coins++; race.emit({type: 'coin', racerId: r.id, x: collectible.x, y: collectible.y, z: collectible.z});
        } else {
          const pool = r.position === 1 ? ['oil', 'shield', 'boost', 'ghost', 'pulse'] : ITEMS;
          r.item = pool[Math.floor(race.random() * pool.length)];
          race.emit({type: 'itemPickup', racerId: r.id, item: r.item, x: collectible.x, y: collectible.y, z: collectible.z});
        }
        break;
      }
    }
    for (const r of race.racers) {
      if (r.padCooldown > 0 || r.resetTimer > 0 || r.airborne) continue;
      for (const pad of race.route.boostPads || []) if (Math.abs(wrapDelta(r.trackT - pad.t)) * race.route.length < 3.4 && Math.abs(r.lateral - (pad.lane || 0)) < 2.5) {
        r.padCooldown = 1.6; r.boost = Math.max(r.boost, 1.3); r.speed = Math.max(r.speed, r.maxSpeed * 0.92);
        race.emit({type: 'boost', racerId: r.id, level: 2}); break;
      }
    }
    for (const hazard of race.hazards) {
      hazard.life -= dt; hazard.age += dt;
      if (hazard.type === 'oil') {
        for (const r of race.racers) if (r.id !== hazard.owner && !r.airborne && Math.abs(r.y - hazard.y) < 2 && Math.hypot(r.x - hazard.x, r.z - hazard.z) < 3.1) {
          if (this.hit(r, 'oil', 0.67)) { r.slip = 2.1; r.vx += Math.cos(r.heading) * (r.index % 2 ? 5 : -5); r.vz -= Math.sin(r.heading) * (r.index % 2 ? 5 : -5); }
        }
      } else if (hazard.type === 'pulse') hazard.radius = hazard.age / 0.7 * 17;
      else if (hazard.type === 'spark') {
        const target = race.racers.find(r => r.id === hazard.target);
        if (!target || target.ghost > 0 || target.finished) { hazard.life = 0; continue; }
        const angle = Math.atan2(target.x - hazard.x, target.z - hazard.z);
        hazard.heading += clamp(wrapAngle(angle - hazard.heading), -2.2 * dt, 2.2 * dt);
        const speed = 47;
        hazard.x += Math.sin(hazard.heading) * speed * dt; hazard.z += Math.cos(hazard.heading) * speed * dt;
        hazard.y += (target.y + 1 - hazard.y) * Math.min(1, dt * 4);
        if (hazard.age > 0.45 && Math.hypot(target.x - hazard.x, target.z - hazard.z) < 2.25 && Math.abs(target.y + 1 - hazard.y) < 2.1) { this.hit(target, 'spark', 0.42); hazard.life = 0; }
      }
    }
    for (let i = race.hazards.length - 1; i >= 0; i--) if (race.hazards[i].life <= 0) race.hazards.splice(i, 1);
  }
}
