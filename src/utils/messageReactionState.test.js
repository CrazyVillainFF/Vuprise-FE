import test from 'node:test';
import assert from 'node:assert/strict';
import { toggleMessageReactionState } from './messageReactionState.js';

test('adds a reaction for a user without changing other users reactions', () => {
  const existing = [{ user: 'user-2', emoji: '❤️' }];
  assert.deepEqual(toggleMessageReactionState(existing, 'user-1', '👍'), [
    { user: 'user-2', emoji: '❤️' },
    { user: 'user-1', emoji: '👍' },
  ]);
});

test('clicking the users current reaction removes it', () => {
  const existing = [{ user: 'user-1', emoji: '👍' }, { user: 'user-2', emoji: '😂' }];
  assert.deepEqual(toggleMessageReactionState(existing, 'user-1', '👍'), [
    { user: 'user-2', emoji: '😂' },
  ]);
});

test('choosing another emoji replaces the users previous reaction', () => {
  const existing = [{ user: { _id: 'user-1' }, emoji: '👍' }, { user: 'user-2', emoji: '❤️' }];
  assert.deepEqual(toggleMessageReactionState(existing, 'user-1', '😂'), [
    { user: 'user-2', emoji: '❤️' },
    { user: 'user-1', emoji: '😂' },
  ]);
});

test('does not modify reactions when the current user is unavailable', () => {
  const existing = [{ user: 'user-2', emoji: '🙏' }];
  assert.equal(toggleMessageReactionState(existing, null, '👍'), existing);
});
