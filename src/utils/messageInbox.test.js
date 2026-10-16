import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInboxPeers, sortContactsByRecentConversations } from './messageInbox.js';

test('recent conversations sort ahead of accepted connections without chats', () => {
  const contacts = [{ _id: 'new' }, { _id: 'older' }, { _id: 'recent' }];
  const conversations = [
    { peer: { _id: 'recent' } },
    { peer: { _id: 'older' } },
  ];

  assert.deepEqual(
    sortContactsByRecentConversations(contacts, conversations).map(({ _id }) => _id),
    ['recent', 'older', 'new'],
  );
});

test('accepted connections without conversations retain their existing order', () => {
  const contacts = [{ _id: 'one' }, { _id: 'two' }, { _id: 'three' }];
  assert.deepEqual(sortContactsByRecentConversations(contacts, []), contacts);
});

test('conversations with non-connected members appear in the inbox', () => {
  const contacts = [{ _id: 'connected' }];
  const conversations = [
    { _id: 'c1', peer: { _id: 'stranger', name: 'Anya' }, lastMessageAt: '2026-10-16T10:00:00.000Z' },
  ];
  assert.deepEqual(buildInboxPeers(contacts, conversations).map(({ _id }) => _id), ['stranger', 'connected']);
});

test('a member who is both a connection and a conversation appears once with connection data', () => {
  const contacts = [{ _id: 'both', name: 'Connected name' }];
  const conversations = [
    { _id: 'c1', peer: { _id: 'both', name: 'Peer name' }, lastMessageAt: '2026-10-16T10:00:00.000Z' },
  ];
  const peers = buildInboxPeers(contacts, conversations);
  assert.equal(peers.length, 1);
  assert.equal(peers[0].name, 'Connected name');
});

test('official broadcasts and missing peers are not treated as inbox members', () => {
  const conversations = [
    { _id: 'official', isOfficialBroadcast: true, peer: { _id: 'vuprise' } },
    { _id: 'orphan', peer: null },
  ];
  assert.deepEqual(buildInboxPeers([], conversations), []);
});

test('non-connected conversations sort ahead of idle connections', () => {
  const contacts = [{ _id: 'idle' }];
  const conversations = [
    { _id: 'c1', peer: { _id: 'sender' }, lastMessageAt: '2026-10-16T10:00:00.000Z' },
  ];
  assert.deepEqual(buildInboxPeers(contacts, conversations).map(({ _id }) => _id), ['sender', 'idle']);
});
