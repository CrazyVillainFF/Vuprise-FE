import test from 'node:test';
import assert from 'node:assert/strict';
import { formatLastSeen } from './presenceTime.js';

const now = Date.parse('2026-10-13T12:00:00.000Z');

test('last seen formatter displays relative minute and hour states', () => {
  assert.equal(formatLastSeen(new Date(now - 20_000), now), 'Active just now');
  assert.equal(formatLastSeen(new Date(now - 2 * 60_000), now), 'Last seen 2 minutes ago');
  assert.equal(formatLastSeen(new Date(now - 2 * 60 * 60_000), now), 'Last seen 2 hours ago');
});

test('last seen formatter handles yesterday, old dates, and invalid values safely', () => {
  assert.match(formatLastSeen(new Date(now - 30 * 60 * 60_000), now), /^Last seen yesterday at /);
  assert.match(formatLastSeen(new Date(now - 3 * 86_400_000), now), /^Last seen (Oct 10|10 Oct) at /);
  assert.equal(formatLastSeen('invalid-date', now), '');
  assert.equal(formatLastSeen(new Date(now + 1000), now), '');
});
