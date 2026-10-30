import test from 'node:test';
import assert from 'node:assert/strict';
import {SaveManager} from '../src/systems/SaveManager.js';

function memoryStorage() {
  const values = new Map();
  return {getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value)};
}

test('race rewards, valid lap records and unlocked-win progress survive reloading', () => {
  const storage = memoryStorage(), save = new SaveManager(storage);
  save.selection({trackId: 'city', kartId: 'manta', paint: '#56bfd4'});
  save.settings({quality: 'low', steeringSensitivity: 0.9});
  save.recordRace('city', {bestLap: 32.5, time: 104, coins: 12, position: 1, finished: true}, 'quick');
  save.recordRace('city', {bestLap: 33, time: 105, coins: 4, position: 3, finished: true}, 'quick');
  const reloaded = new SaveManager(storage);
  assert.equal(reloaded.data.selection.trackId, 'city');
  assert.equal(reloaded.data.settings.quality, 'low');
  assert.equal(reloaded.data.settings.steeringSensitivity, 0.9);
  assert.equal(reloaded.data.records.city.bestLap, 32.5);
  assert.equal(reloaded.data.coins, 16); assert.equal(reloaded.data.wins, 1);
});

test('solo sessions and unfinished races cannot award race wins', () => {
  const save = new SaveManager(memoryStorage());
  save.recordRace('valley', {bestLap: 25, time: 77, coins: 3, position: 1, finished: true}, 'time');
  save.recordRace('valley', {bestLap: null, time: null, coins: 2, position: 1, finished: false}, 'quick');
  assert.equal(save.data.wins, 0);
  assert.equal(save.data.records.valley.bestLap, 25);
  assert.equal(save.data.records.valley.trialBest, 77);
  assert.equal(save.data.records.valley.bestRace, undefined);
});

test('championship records prefer finishing position, then points for an equal place', () => {
  const save = new SaveManager(memoryStorage());
  save.recordChampionship(3, 38); save.recordChampionship(2, 42); save.recordChampionship(4, 44);
  assert.deepEqual(save.data.gpBest, {position: 2, points: 42});
  save.recordChampionship(2, 43); assert.deepEqual(save.data.gpBest, {position: 2, points: 43});
  save.recordChampionship(1, 60); assert.deepEqual(save.data.gpBest, {position: 1, points: 60});
});

test('unavailable browser storage does not stop racing state from being usable', () => {
  const storage = {getItem() {throw new Error('Blocked storage');}, setItem() {throw new Error('Blocked storage');}};
  const save = new SaveManager(storage);
  assert.equal(save.available, false);
  assert.equal(save.data.selection.kartId, 'comet');
  assert.doesNotThrow(() => save.recordRace('valley', {bestLap: 30, time: 93, coins: 8, position: 1, finished: true}, 'quick'));
  assert.equal(save.data.wins, 1); assert.equal(save.available, false);
});
