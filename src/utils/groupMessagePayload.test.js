import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGroupMessagePayload } from './groupMessagePayload.js';

test('text and emoji group messages use JSON payloads for the deployed API', () => {
  const payload = buildGroupMessagePayload({ text: '❤️', clientMessageId: 'message-12345678' });
  assert.deepEqual(payload, { text: '❤️', clientMessageId: 'message-12345678' });
  assert.equal(payload instanceof FormData, false);
});

test('group image messages use multipart payloads with text and idempotency key', () => {
  const file = new File(['image'], 'photo.png', { type: 'image/png' });
  const payload = buildGroupMessagePayload({ text: 'Caption', clientMessageId: 'message-12345678', file });
  assert.equal(payload instanceof FormData, true);
  assert.equal(payload.get('text'), 'Caption');
  assert.equal(payload.get('clientMessageId'), 'message-12345678');
  assert.equal(payload.get('image').name, 'photo.png');
});
