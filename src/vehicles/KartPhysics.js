const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const wrapAngle = a => Math.atan2(Math.sin(a), Math.cos(a));
export const wrapDelta = t => t > 0.5 ? t - 1 : t < -0.5 ? t + 1 : t;

/** Lightweight, fixed-step tire model. Heading and velocity are independent while sliding. */
export function updateKart(racer, input, route, dt, emit, sensitivity = 1) {
  const r = racer;
  r.previousX = r.x; r.previousZ = r.z;
  for (const key of ['boost', 'ghost', 'hitTimer', 'immunity', 'slip', 'padCooldown', 'jumpCooldown', 'resetCooldown']) r[key] = Math.max(0, r[key] - dt);
  if (r.shield) {
    r.shieldTime -= dt;
    if (r.shieldTime <= 0) r.shield = false;
  }
  if (r.resetTimer > 0) { r.resetTimer = Math.max(0, r.resetTimer - dt); r.speed *= Math.exp(-9 * dt); r.vx = 0; r.vz = 0; return; }

  const road = route.project(r.x, r.z);
  r.offRoad = Math.abs(road.lateral) > route.width * 0.5 - 0.35;
  const throttle = clamp(input.throttle || 0, 0, 1);
  const brake = clamp(input.brake || 0, 0, 1);
  const steer = clamp((input.steer || 0) * sensitivity, -1, 1);
  r.steer += (steer - r.steer) * (1 - Math.exp(-12 * dt));
  const maxSpeed = r.maxSpeed * (r.boost > 0 ? 1.36 : 1) * (r.offRoad && r.ghost <= 0 ? 0.58 : 1);
  const recovery = r.hitTimer > 0 ? 0.26 : 1;
  if (throttle > 0) r.speed += (r.speed < -0.8 ? 24 : r.accel * recovery) * throttle * dt;
  if (brake > 0) {
    if (r.speed > 0.7) r.speed = Math.max(0, r.speed - 33 * brake * dt);
    else r.speed -= 10 * brake * dt;
  }
  if (throttle === 0 && brake === 0) r.speed *= Math.exp(-(r.offRoad ? 1.1 : 0.28) * dt);
  if (r.speed > maxSpeed) r.speed += (maxSpeed - r.speed) * Math.min(1, dt * (r.offRoad ? 3.2 : 1.5));
  r.speed = clamp(r.speed, -8.5, r.maxSpeed * 1.5);
  if (Math.abs(r.speed) < 0.035) r.speed = 0;

  const canDrift = !r.airborne && !r.offRoad && r.speed > 12 && Math.abs(steer) > 0.12 && r.hitTimer <= 0 && r.slip <= 0;
  if (input.drift && !r.drifting && canDrift) {
    r.drifting = true; r.driftDirection = Math.sign(steer); r.driftCharge = 0;
  }
  if (r.drifting && (!input.drift || r.speed < 9 || r.offRoad || r.hitTimer > 0 || r.slip > 0)) {
    if (!input.drift && r.driftCharge > 0.65 && r.hitTimer <= 0 && !r.offRoad) {
      const level = r.driftCharge > 2.4 ? 3 : r.driftCharge > 1.45 ? 2 : 1;
      r.boost = Math.max(r.boost, [0, 0.85, 1.5, 2.25][level]);
      r.speed = Math.max(r.speed, r.maxSpeed * 0.92);
      emit({type: 'boost', racerId: r.id, level});
    }
    r.drifting = false; r.driftCharge = 0;
  }
  if (r.drifting) {
    r.driftCharge = Math.min(3.6, r.driftCharge + dt * (0.8 + r.driftStat * 0.085));
    r.speed -= dt * (r.driftCharge > 3.25 ? 10 : 1.4);
  }
  const velocityRatio = clamp(Math.abs(r.speed) / 10, 0, 1);
  const yawRate = r.turnRate * (1 - clamp(Math.abs(r.speed) / 85, 0, 0.48));
  let steering = r.steer;
  if (r.drifting) steering = steering * 0.77 + r.driftDirection * 0.18;
  if (r.slip > 0) steering = steering * 0.6 + Math.sin(r.slip * 9 + r.index) * 0.25;
  r.heading = wrapAngle(r.heading + steering * yawRate * velocityRatio * Math.sign(r.speed || 1) * dt);

  // Lateral tire grip preserves momentum during a drift and restores it smoothly afterwards.
  const forwardX = Math.sin(r.heading), forwardZ = Math.cos(r.heading);
  const lateralX = Math.cos(r.heading), lateralZ = -Math.sin(r.heading);
  let lateralSpeed = r.vx * lateralX + r.vz * lateralZ;
  const grip = r.airborne ? 1.8 : r.slip > 0 ? 1.25 : r.drifting ? 2.55 : r.offRoad ? 5.6 : 11.5;
  lateralSpeed *= Math.exp(-grip * dt);
  if (r.drifting) lateralSpeed -= r.driftDirection * r.speed * dt * 0.2;
  lateralSpeed = clamp(lateralSpeed, -11, 11);
  r.vx = forwardX * r.speed + lateralX * lateralSpeed;
  r.vz = forwardZ * r.speed + lateralZ * lateralSpeed;
  r.x += r.vx * dt; r.z += r.vz * dt;

  const surface = route.project(r.x, r.z);
  r.trackT = surface.t; r.lateral = surface.lateral;
  const edge = route.barrierWidth - 1.2;
  if (Math.abs(surface.lateral) > edge) {
    const side = Math.sign(surface.lateral);
    r.x = surface.x + Math.cos(surface.heading) * edge * side;
    r.z = surface.z - Math.sin(surface.heading) * edge * side;
    const normalX = Math.cos(surface.heading) * side, normalZ = -Math.sin(surface.heading) * side;
    const impact = Math.max(0, r.vx * normalX + r.vz * normalZ);
    r.vx -= normalX * impact * 1.25; r.vz -= normalZ * impact * 1.25;
    if (impact > 2 && r.immunity <= 0) {
      r.speed *= r.ghost > 0 ? 0.98 : clamp(1 - impact / 45, 0.48, 0.95);
      r.hitTimer = r.ghost > 0 ? 0 : 0.23;
      r.immunity = 0.4;
      r.drifting = false; r.driftCharge = 0;
      emit({type: 'collision', racerId: r.id, x: r.x, y: r.y, z: r.z, strength: impact / 18});
    }
    // A glancing wall hit nudges the nose along the road without taking control away.
    if (Math.abs(wrapAngle(surface.heading - r.heading)) < 1.4 && r.speed > 0) r.heading += wrapAngle(surface.heading - r.heading) * Math.min(1, dt * 3.2);
  }

  if (!r.airborne && r.jumpCooldown <= 0 && r.speed > 18 && !r.offRoad) {
    for (const ramp of route.ramps || []) {
      if (Math.abs(wrapDelta(surface.t - ramp.t)) * route.length < Math.max(0.7, Math.abs(r.speed) * dt * 1.25)) {
        r.airborne = true; r.vy = 3.8 + r.speed * 0.065; r.jumpCooldown = 2; r.drifting = false; r.driftCharge = 0;
        emit({type: 'jump', racerId: r.id}); break;
      }
    }
  }
  if (r.airborne) {
    r.vy -= 18 * dt; r.y += r.vy * dt;
    if (r.y <= surface.y && r.vy < 0) {
      r.y = surface.y; r.vy = 0; r.airborne = false; r.suspension = 0.22;
      emit({type: 'land', racerId: r.id});
    }
  } else { r.y = surface.y; r.vy = 0; }
  r.suspension *= Math.exp(-9 * dt);
}

/** Separation and equal/opposite impulses; the ghost state suppresses physical contact. */
export function collideKarts(racers, emit) {
  for (let i = 0; i < racers.length; i++) for (let j = i + 1; j < racers.length; j++) {
    const a = racers[i], b = racers[j];
    if (a.ghost > 0 || b.ghost > 0 || a.resetTimer > 0 || b.resetTimer > 0 || Math.abs(a.y - b.y) > 2.2) continue;
    const dx = b.x - a.x, dz = b.z - a.z, sq = dx * dx + dz * dz;
    if (sq >= 2.65 * 2.65) continue;
    const distance = Math.sqrt(sq) || 0.001, nx = distance < 0.01 ? 1 : dx / distance, nz = distance < 0.01 ? 0 : dz / distance;
    const penetration = (2.65 - distance) * 0.52;
    const weight = a.weight + b.weight;
    a.x -= nx * penetration * b.weight / weight * 2; a.z -= nz * penetration * b.weight / weight * 2;
    b.x += nx * penetration * a.weight / weight * 2; b.z += nz * penetration * a.weight / weight * 2;
    const closing = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
    if (closing > 0) {
      const impulse = Math.min(12, closing * 0.65);
      a.vx -= nx * impulse * b.weight / weight; a.vz -= nz * impulse * b.weight / weight;
      b.vx += nx * impulse * a.weight / weight; b.vz += nz * impulse * a.weight / weight;
      a.speed = a.vx * Math.sin(a.heading) + a.vz * Math.cos(a.heading);
      b.speed = b.vx * Math.sin(b.heading) + b.vz * Math.cos(b.heading);
      if (closing > 3.5) for (const r of [a, b]) if (r.immunity <= 0) {
        r.immunity = 0.48; r.driftCharge = Math.max(0, r.driftCharge - 0.6);
        emit({type: 'collision', racerId: r.id, x: r.x, y: r.y, z: r.z, strength: Math.min(1, closing / 18)});
      }
    }
  }
}
