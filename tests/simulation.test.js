import test from 'node:test';
import assert from 'node:assert/strict';
import {RaceManager} from '../src/game/RaceManager.js';
import {createRoute, TRACKS} from '../src/tracks/TrackData.js';
import {updateKart, collideKarts} from '../src/vehicles/KartPhysics.js';
import {updateCheckpoints} from '../src/systems/CheckpointSystem.js';

function makeRace(options = {}) { return new RaceManager({route: createRoute('valley'), laps: 1, seed: 42, ...options}); }
function run(race, seconds, input = {}) {
  for (let i = 0; i < seconds * 60 && race.state !== 'finished'; i++) { race.update(1 / 60, input); race.consumeEvents(); }
}
function place(r, route, t, lane = 0) {
  const p = route.getPoint(t);
  Object.assign(r, {x: p.x + Math.cos(p.heading) * lane, y: p.y, z: p.z - Math.sin(p.heading) * lane, heading: p.heading, trackT: t, lastT: t, lateral: lane, vx: 0, vz: 0, airborne: false, vy: 0});
}

for (const track of TRACKS) for (const difficulty of ['easy', 'normal', 'hard']) {
  test(`${track.name}: six real-physics drivers finish a two-lap ${difficulty} race`, () => {
    const race = makeRace({route: createRoute(track.id), laps: 2, difficulty});
    race.autopilot = true;
    run(race, 180);
    assert.equal(race.state, 'finished');
    assert.ok(race.racers.every(r => r.finished), JSON.stringify(race.getResults()));
    assert.ok(race.racers.every(r => r.completedLaps === 2 && r.bestLap > 10));
    const results = race.getResults();
    assert.deepEqual(results.map(r => r.position), [1, 2, 3, 4, 5, 6]);
    for (let i = 1; i < results.length; i++) assert.ok(results[i].time >= results[i - 1].time);
  });
}

for (const track of TRACKS) test(`${track.name}: discrete keyboard-style inputs can compete against hard rivals`, () => {
  const race = makeRace({route: createRoute(track.id), laps: 3, difficulty: 'hard', seed: 401});
  // A repeatable driver presses only full on/off controls, sampled every 83 ms.
  // It uses the same kart and rules as the player, with no speed or grip advantage.
  race.ai.get('player').skill = 1.12;
  let input = {};
  for (let frame = 0; frame < 180 * 60 && race.state !== 'finished'; frame++) {
    if (frame % 5 === 0) {
      const control = race.getAIInput(race.player, 5 / 60);
      input = {...control, steer: Math.abs(control.steer) > 0.1 ? Math.sign(control.steer) : 0, throttle: control.throttle > 0.1 ? 1 : 0, brake: control.brake > 0.1 ? 1 : 0};
    }
    race.update(1 / 60, input); race.consumeEvents();
  }
  assert.equal(race.state, 'finished'); assert.equal(race.player.completedLaps, 3);
  assert.ok(race.player.position <= 3, `Finished ${race.player.position}`);
});

test('countdown blocks driving and time trial starts with exactly one kart', () => {
  const race = makeRace({mode: 'time'});
  assert.equal(race.racers.length, 1);
  const {x, z} = race.player;
  run(race, 2, {throttle: 1});
  assert.equal(race.time, 0); assert.equal(race.player.x, x); assert.equal(race.player.z, z);
  run(race, 3, {throttle: 1});
  assert.equal(race.state, 'racing'); assert.ok(race.player.speed > 0);
  assert.ok(race.collectibles.every(c => c.type === 'coin'));
});

test('forward acceleration, braking and reverse are gradual and correctly signed', () => {
  const race = makeRace({mode: 'time'}); race.state = 'racing';
  run(race, 0.6, {throttle: 1});
  const accelerated = race.player.speed;
  assert.ok(accelerated > 4 && accelerated < 20);
  run(race, 0.2, {brake: 1});
  assert.ok(race.player.speed < accelerated);
  run(race, 1.5, {brake: 1});
  assert.ok(race.player.speed < -1 && race.player.speed >= -8.5);
});

test('forward steering moves toward the facing direction and reverses naturally', () => {
  const race = makeRace({mode: 'time'}), r = race.player;
  const route = {width: 200, barrierWidth: 110, ramps: [], project: (x, z) => ({x: 0, z, y: 0, heading: 0, t: z / 10000, lateral: x})};
  Object.assign(r, {x: 0, z: 0, y: 0, heading: 0, speed: 20, vx: 0, vz: 20});
  for (let i = 0; i < 30; i++) updateKart(r, {throttle: 0.5, steer: 0.5}, route, 1 / 60, () => {});
  assert.ok(r.heading > 0.2 && r.x > 1 && r.z > 7);
  Object.assign(r, {heading: 0, speed: -5, vx: 0, vz: -5, steer: 0});
  for (let i = 0; i < 30; i++) updateKart(r, {brake: 0.5, steer: 0.5}, route, 1 / 60, () => {});
  assert.ok(r.heading < 0);
});

test('finish line shuttling and checkpoint skipping cannot manufacture laps', () => {
  const race = makeRace(), r = race.player, route = race.route;
  r.started = true; r.speed = 32;
  for (let i = 0; i < 10; i++) {
    place(r, route, 0.0004); r.lastT = 0.9995; updateCheckpoints(r, race, 1 / 60);
    place(r, route, 0.9995); r.lastT = 0.0004; updateCheckpoints(r, race, 1 / 60);
  }
  assert.equal(r.completedLaps, 0); assert.equal(r.nextCheckpoint, 1);
  place(r, route, 2 / 12 + 0.001); r.lastT = 2 / 12 - 0.001; updateCheckpoints(r, race, 1 / 60);
  assert.equal(r.nextCheckpoint, 1);
  for (let gate = 1; gate <= 12; gate++) {
    const t = (gate / 12 + 0.001) % 1;
    place(r, route, t); r.lastT = gate / 12 - 0.001; r.lapTime = 30;
    updateCheckpoints(r, race, 1 / 60);
  }
  assert.equal(r.completedLaps, 1); assert.equal(r.finished, true);
});

test('reset returns to the latest valid gate with a delay and invalidates the lap', () => {
  const race = makeRace({mode: 'time'}); race.state = 'racing';
  const r = race.player; r.safeT = 0.252; r.started = true; r.nextCheckpoint = 4;
  place(r, race.route, 0.4); r.speed = 30;
  assert.equal(race.requestReset(), true);
  assert.equal(race.requestReset(), false);
  assert.ok(r.resetTimer > 1 && r.lapInvalid);
  run(race, 1);
  assert.ok(r.resetTimer > 0);
  run(race, 1);
  assert.ok(Math.abs(r.trackT - 0.252) < 0.01);
  assert.equal(r.nextCheckpoint, 4); assert.ok(r.immunity > 0);
});

test('a recovered time-trial lap cannot become a personal best', () => {
  const race = makeRace({mode: 'time', laps: 2}); const r = race.player; race.state = 'racing';
  r.started = true; r.nextCheckpoint = 0; r.safeT = 11 / 12 + 0.002; r.lapTime = 21; r.speed = 35;
  race.requestReset(); run(race, 2);
  place(r, race.route, 0.0006); r.lastT = 0.9994; r.speed = 35;
  updateCheckpoints(r, race, 1 / 60);
  assert.equal(r.completedLaps, 1); assert.equal(r.bestLap, null);
  assert.equal(r.lapInvalid, false); assert.equal(r.nextCheckpoint, 1);
  r.nextCheckpoint = 0; r.lapTime = 25;
  place(r, race.route, 0.0006); r.lastT = 0.9994;
  updateCheckpoints(r, race, 1 / 60);
  assert.ok(r.bestLap >= 25 && r.bestLap < 25.1); assert.ok(r.finished);
});

test('drifting builds charge and releases a finite boost with lateral momentum', () => {
  const race = makeRace(), r = race.player;
  const route = {width: 400, barrierWidth: 210, ramps: [], project: (x, z) => ({x: 0, z, y: 0, heading: 0, t: z / 10000, lateral: x})};
  Object.assign(r, {x: 0, z: 0, y: 0, speed: 28, vx: 0, vz: 28, heading: 0});
  const events = [];
  for (let i = 0; i < 95; i++) updateKart(r, {throttle: 1, steer: 0.35, drift: true}, route, 1 / 60, e => events.push(e));
  assert.ok(r.drifting && r.driftCharge > 1);
  assert.ok(Math.abs(r.vx * Math.cos(r.heading) - r.vz * Math.sin(r.heading)) > 0.5);
  updateKart(r, {throttle: 1, steer: 0}, route, 1 / 60, e => events.push(e));
  assert.ok(!r.drifting && r.boost > 0 && r.boost < 3);
  assert.ok(events.some(e => e.type === 'boost'));
});

test('road shoulders slow a kart, walls confine it, and kart overlaps separate', () => {
  const race = makeRace(); const r = race.player;
  place(r, race.route, 0.06, race.route.width / 2 + 2); r.speed = r.maxSpeed;
  for (let i = 0; i < 30; i++) updateKart(r, {throttle: 1}, race.route, 1 / 60, () => {});
  assert.ok(r.offRoad && r.speed < r.maxSpeed * 0.9);
  place(r, race.route, 0.06, race.route.barrierWidth + 5);
  updateKart(r, {throttle: 1}, race.route, 1 / 60, () => {});
  assert.ok(Math.abs(race.route.project(r.x, r.z).lateral) <= race.route.barrierWidth - 1.1);
  const other = race.racers[1]; Object.assign(other, {x: r.x + 0.1, y: r.y, z: r.z, ghost: 0});
  collideKarts([r, other], () => {});
  assert.ok(Math.hypot(r.x - other.x, r.z - other.z) > 2.5);
});

test('all six items have single-use effects, shield absorbs a hit and ghost ignores one', () => {
  const race = makeRace(); race.state = 'racing'; const r = race.player, opponent = race.racers[1];
  r.item = 'boost'; assert.ok(race.useItem()); assert.equal(r.item, null); assert.ok(r.boost > 2); assert.equal(race.useItem(), false);
  r.item = 'shield'; race.useItem(); assert.ok(r.shield);
  r.immunity = 0; const speed = r.speed; race.items.hit(r, 'test'); assert.equal(r.shield, false); assert.equal(r.speed, speed);
  r.item = 'ghost'; race.useItem(); r.immunity = 0; assert.ok(r.ghost > 0); assert.equal(race.items.hit(r, 'test'), false);
  r.item = 'oil'; race.useItem(); const oil = race.hazards.find(h => h.type === 'oil'); assert.ok(oil);
  Object.assign(opponent, {x: oil.x, y: oil.y, z: oil.z, speed: 20, immunity: 0, ghost: 0}); race.items.update(1 / 60);
  assert.ok(opponent.slip > 0 && opponent.speed < 20);
  Object.assign(opponent, {x: r.x + 5, y: r.y, z: r.z, speed: 20, immunity: 0}); r.item = 'pulse'; race.useItem(); assert.ok(opponent.speed < 20);
  for (const other of race.racers.slice(1)) other.progress = r.progress - 1;
  opponent.progress = r.progress + 0.02; r.item = 'spark'; race.useItem();
  assert.ok(race.hazards.some(h => h.type === 'spark' && h.target === opponent.id));
  assert.ok(race.consumeEvents().some(e => e.type === 'warning' && e.racerId === opponent.id));
  for (let i = 0; i < 16 * 60; i++) race.items.update(1 / 60);
  assert.equal(race.hazards.length, 0);
});

test('coins and boxes collect once, then respawn on a real timer', () => {
  const race = makeRace(); race.state = 'racing'; const r = race.player;
  const coin = race.collectibles.find(c => c.type === 'coin');
  Object.assign(r, {x: coin.x, y: coin.y - 1, z: coin.z}); race.items.update(1 / 60);
  assert.equal(r.coins, 1); assert.equal(coin.active, false);
  race.items.update(1 / 60); assert.equal(r.coins, 1);
  r.x += 100; for (let i = 0; i < 10 * 60; i++) race.items.update(1 / 60);
  assert.equal(coin.active, true);
  const box = race.collectibles.find(c => c.type === 'box'); Object.assign(r, {x: box.x, y: box.y - 1, z: box.z});
  race.items.update(1 / 60); assert.ok(r.item); assert.equal(box.active, false);
});

test('a race ends after the finish grace period even when a rival cannot finish', () => {
  const race = makeRace(); race.state = 'racing'; race.player.finished = true; race.player.finishTime = 30; race.player.completedLaps = 1;
  for (const r of race.racers.slice(1)) r.maxSpeed = 0;
  run(race, 16);
  assert.equal(race.state, 'finished'); assert.equal(race.getResults()[0].isPlayer, true);
  assert.ok(race.getResults().slice(1).every(r => !r.finished && r.time === null));
});
