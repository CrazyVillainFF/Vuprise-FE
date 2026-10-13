import test from 'node:test';
import assert from 'node:assert/strict';
import { isVerifiedAccount } from './verification.js';

test('only the designated email receives the verified account badge', () => {
  assert.equal(isVerifiedAccount('vishnubangaru001@gmail.com'), true);
  assert.equal(isVerifiedAccount(' VISHNUBANGARU001@GMAIL.COM '), true);
  assert.equal(isVerifiedAccount('someone@example.com'), false);
  assert.equal(isVerifiedAccount({ isVerifiedAccount: false, email: 'someone@example.com' }), false);
  assert.equal(isVerifiedAccount({ isVerifiedAccount: false, email: 'vishnubangaru001@gmail.com' }), false);
  assert.equal(isVerifiedAccount({ isVerifiedAccount: true, email: 'someone@example.com' }), true);
  assert.equal(isVerifiedAccount(null), false);
});
