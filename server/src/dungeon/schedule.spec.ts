import assert from 'node:assert/strict';

import { raidPayout } from './rewards.js';
import { goldenHourAt } from './schedule.js';

/** 29 Oct 2026 at an ICT clock time, expressed as a UTC instant. */
function ict(hour: number, minute = 0): Date {
  return new Date(Date.UTC(2026, 9, 29, hour - 7, minute, 0, 0));
}

assert.equal(goldenHourAt(ict(9, 59)).active, false);
assert.equal(goldenHourAt(ict(10, 0)).active, true);
assert.equal(goldenHourAt(ict(11, 59)).active, true);
assert.equal(goldenHourAt(ict(12, 0)).active, false);
assert.equal(goldenHourAt(ict(14, 59)).active, false);
assert.equal(goldenHourAt(ict(15, 0)).active, true);
assert.equal(goldenHourAt(ict(16, 0)).active, true);
assert.equal(goldenHourAt(ict(17, 0)).active, false);
assert.equal(goldenHourAt(ict(19, 0)).active, true);
assert.equal(goldenHourAt(ict(20, 59)).active, true);
assert.equal(goldenHourAt(ict(21, 0)).active, false);

const morning = goldenHourAt(ict(10, 15));
assert.equal(morning.windowId, '2026-10-29-10');
assert.equal(morning.endsAt, Date.UTC(2026, 9, 29, 5, 0, 0, 0));

const always = raidPayout(10, () => 0);
const never = raidPayout(10, () => 0.99);
assert.equal(always.exp, (8 + 10 * 3) * 3);
assert.deepEqual(always.drops, [
  { itemId: 'evo-shard', qty: 10 },
  { itemId: 'might-blade', qty: 1 },
]);
assert.deepEqual(never.drops, []);

console.log('dungeon schedule ok');
