import test from 'node:test';
import assert from 'node:assert/strict';
import { feedConnectionStatus, isConnectedTo } from './connectionState.js';

test('uses the signed-in profile connection list before a feed response supplies connectionStatus', () => {
  const viewer = { _id: 'viewer', connections: [{ _id: 'pradeep' }, 'thanush'] };
  assert.equal(isConnectedTo(viewer.connections, 'pradeep'), true);
  assert.equal(feedConnectionStatus({ author: { _id: 'pradeep' } }, viewer), 'connected');
  assert.equal(feedConnectionStatus({ author: { _id: 'thanush' } }, viewer), 'connected');
  assert.equal(feedConnectionStatus({ author: { _id: 'new-user' } }, viewer), 'none');
});

test('prefers the API status and never renders a connection action for the viewer', () => {
  const viewer = { _id: 'viewer', connections: [] };
  assert.equal(feedConnectionStatus({ author: { _id: 'viewer' } }, viewer), 'self');
  assert.equal(feedConnectionStatus({ author: { _id: 'other' }, connectionStatus: 'pending_sent' }, viewer), 'pending_sent');
});
