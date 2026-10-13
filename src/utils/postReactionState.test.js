import test from 'node:test';
import assert from 'node:assert/strict';
import { togglePostReactionState } from './postReactionState.js';

test('adds a reaction while preserving other users reactions', () => {
  assert.deepEqual(togglePostReactionState([{ user: 'user-2', emoji: '💡' }], 'user-1', '🎉'), [
    { user: 'user-2', emoji: '💡' },
    { user: 'user-1', emoji: '🎉' },
  ]);
});

test('selecting the current reaction removes it', () => {
  assert.deepEqual(togglePostReactionState([{ user: 'user-1', emoji: '🎉' }], 'user-1', '🎉'), []);
});

test('selecting another reaction replaces the current users reaction', () => {
  assert.deepEqual(togglePostReactionState([
    { user: { _id: 'user-1' }, emoji: '🎉' },
    { user: 'user-2', emoji: '❤️' },
  ], 'user-1', '💡'), [
    { user: 'user-2', emoji: '❤️' },
    { user: 'user-1', emoji: '💡' },
  ]);
});
