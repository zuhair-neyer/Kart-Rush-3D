import {wrapAngle, wrapDelta} from '../vehicles/KartPhysics.js';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class AIDriver {
  constructor(index, difficulty = 'normal') {
    this.index = index;
    this.skill = ({easy: 0.68, normal: 0.81, hard: 0.95})[difficulty] || 0.81;
    this.clock = index * 1.37; this.lane = (index % 3 - 1) * 2.6; this.stuck = 0; this.itemClock = 2 + index;
  }
  update(r, race, dt) {
    const route = race.route, projection = route.project(r.x, r.z);
    this.clock += dt; this.itemClock -= dt;
    const lookAhead = 8 + Math.abs(r.speed) * 0.42;
    const aheadT = projection.t + lookAhead / route.length;
    const point = route.getPoint(aheadT);
    const future = route.getPoint(projection.t + (lookAhead + 15) / route.length);
    const curvature = Math.abs(wrapAngle(future.heading - projection.heading));
    let laneTarget = Math.sin(this.clock * 0.14 + this.index * 2) * 2.1;
    // An approaching opponent changes the target racing line, while nearby side traffic is avoided.
    for (const other of race.racers) {
      if (other === r) continue;
      const along = wrapDelta((other.trackT ?? 0) - projection.t) * route.length;
      if (along > 0 && along < 17 && Math.abs(other.lateral - this.lane) < 3) laneTarget = other.lateral > 0 ? -3.5 : 3.5;
      if (Math.abs(along) < 5 && Math.abs(other.lateral - this.lane) < 2.8) laneTarget = other.lateral > this.lane ? -4 : 4;
    }
    for (const pad of route.boostPads || []) {
      const distance = wrapDelta(pad.t - projection.t) * route.length;
      if (distance > 4 && distance < 40 && curvature < 0.45) laneTarget = pad.lane || 0;
    }
    this.lane += (clamp(laneTarget, -route.width * 0.26, route.width * 0.26) - this.lane) * Math.min(1, dt * 1.6);
    const targetX = point.x + Math.cos(point.heading) * this.lane;
    const targetZ = point.z - Math.sin(point.heading) * this.lane;
    const desired = Math.atan2(targetX - r.x, targetZ - r.z);
    const error = wrapAngle(desired - r.heading);
    let steer = clamp(error * (1.8 + 5 / Math.max(7, Math.abs(r.speed))), -1, 1);
    const cornerFactor = clamp(1 - curvature * 0.85, 0.43, 1);
    let targetSpeed = r.maxSpeed * this.skill * cornerFactor;
    targetSpeed *= 0.97 + Math.sin(this.index * 4.17) * 0.025;
    if (r.boost > 0 && curvature < 0.35) targetSpeed *= 1.32;
    if (Math.abs(error) > 0.62) targetSpeed = Math.min(targetSpeed, 18);
    if (Math.abs(projection.lateral) > route.width * 0.46) targetSpeed *= 0.75;
    // Bounded, infrequent concentration lapses are recoverable by the same steering controller.
    if (this.clock % (16 + this.index * 0.6) < 0.45 && this.skill < 0.92) { steer += Math.sin(this.index + 1) * 0.11; targetSpeed *= 0.93; }
    const speedDifference = targetSpeed - r.speed;
    const throttle = speedDifference > 0 ? clamp(speedDifference / 4, 0.18, 1) : 0;
    const brake = speedDifference < -2.5 ? clamp(-speedDifference / 13, 0, 0.7) : 0;
    this.stuck = Math.abs(r.speed) < 2 && race.time > 4 ? this.stuck + dt : 0;
    const reset = this.stuck > 3.1;
    if (reset) this.stuck = 0;
    let item = false;
    if (r.item && this.itemClock <= 0) {
      item = r.item !== 'pulse' || race.racers.some(other => other !== r && Math.hypot(r.x - other.x, r.z - other.z) < 15);
      if (item) this.itemClock = 4.5 + this.index * 0.32;
    }
    const drift = this.skill > 0.85 && r.speed > 19 && curvature > 0.14 && curvature < 0.47 && Math.abs(projection.lateral) < 4 && r.driftCharge < 1.7;
    return {throttle, brake, steer: clamp(steer, -1, 1), drift, item, reset};
  }
}
