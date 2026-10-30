import {wrapDelta} from '../vehicles/KartPhysics.js';

/** Each checkpoint is a directed gate. A lap requires every gate in order. */
export function updateCheckpoints(racer, race, dt) {
  const r = racer, route = race.route;
  const t = route.project(r.x, r.z).t;
  const delta = wrapDelta(t - r.lastT);
  r.trackT = t;
  r.lapTime += dt;
  const gateCount = route.checkpoints || 12;
  // Reject discontinuities (respawns, teleports and shortcuts) and reverse gate crossings.
  const plausibleStep = Math.max(4, Math.abs(r.speed) * dt * 3 + 2) / route.length;
  if (delta > 0 && delta < plausibleStep) {
    if (!r.started && r.lastT > 0.85 && t < 0.15) r.started = true;
    const gate = r.nextCheckpoint / gateCount;
    let toGate = gate - r.lastT;
    if (toGate < -0.0000001) toGate += 1;
    if (toGate <= delta + 0.0000001 && r.started) {
      if (r.nextCheckpoint === 0) {
        r.completedLaps += 1;
        const lapTime = r.lapTime;
        if (!r.lapInvalid && lapTime > 3) r.bestLap = r.bestLap == null ? lapTime : Math.min(r.bestLap, lapTime);
        race.emit({type: 'lap', racerId: r.id, lap: r.completedLaps, time: lapTime, valid: !r.lapInvalid});
        r.lapTime = 0; r.lapInvalid = false; r.nextCheckpoint = 1; r.safeT = 0.006;
        if (r.completedLaps >= race.laps && !r.finished) {
          r.finished = true; r.finishTime = race.time; r.lap = race.laps;
          race.emit({type: 'finish', racerId: r.id, time: r.finishTime});
        } else r.lap = r.completedLaps + 1;
      } else {
        r.safeT = gate + Math.min(0.005, 2 / route.length);
        r.nextCheckpoint = (r.nextCheckpoint + 1) % gateCount;
      }
    }
  }
  r.lastT = t;
  if (!r.started) r.progress = t > 0.5 ? t - 1 : 0;
  else {
    const previousGate = r.nextCheckpoint === 0 ? (gateCount - 1) / gateCount : (r.nextCheckpoint - 1) / gateCount;
    const nextGate = r.nextCheckpoint === 0 ? 1 : r.nextCheckpoint / gateCount;
    r.progress = r.completedLaps + Math.max(previousGate, Math.min(nextGate, t));
  }
  if (r.finished) r.progress = Math.max(r.progress, race.laps);
}
