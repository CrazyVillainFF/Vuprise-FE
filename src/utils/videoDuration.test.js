import test from 'node:test';
import assert from 'node:assert/strict';
import { clampTrimEndToDuration, readFiniteVideoDuration, updateTrimEndForDuration } from './videoDuration.js';

test('reads finite browser duration and recovers Infinity from a finite seekable range', () => {
  assert.equal(readFiniteVideoDuration({ duration: 18 }), 18);
  assert.equal(readFiniteVideoDuration({ duration: Infinity, seekable: { length: 1, end: () => 18 } }), 18);
  assert.equal(readFiniteVideoDuration({ duration: NaN, seekable: { length: 0 } }), null);
});

test('accepts 18 seconds and clamps only floating-point endpoint drift', () => {
  assert.equal(clampTrimEndToDuration(18, 18), 18);
  assert.equal(clampTrimEndToDuration(18.0000001, 18), 18);
  assert.equal(clampTrimEndToDuration(18.04, 18), 18);
});

test('preserves fractional duration and rejects a genuinely out-of-range trim', () => {
  assert.equal(clampTrimEndToDuration(18.375, 18.375), 18.375);
  assert.equal(clampTrimEndToDuration(18.5, 18.375), null);
});

test('advances a source-end trim when Android refines duration upward', () => {
  assert.equal(updateTrimEndForDuration(18, 18, 18.42), 18.42);
  assert.equal(updateTrimEndForDuration(18, 18, 36, 0), 35);
});

test('keeps a manually chosen interior trim when duration metadata changes', () => {
  assert.equal(updateTrimEndForDuration(12.5, 18, 18.42), 12.5);
  assert.equal(updateTrimEndForDuration(17.5, 18, 17.25), 17.25);
});
