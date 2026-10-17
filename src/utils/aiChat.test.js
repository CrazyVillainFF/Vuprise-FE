import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AI_CHAT_SUGGESTIONS,
  ATTACHMENT_MAX_BYTES,
  MAX_AI_MESSAGE_LENGTH,
  isSendableMessage,
  looksLikeImageRequest,
  normalizeChatMessage,
  validateAttachmentFile,
} from './aiChat.js';

test('normalizeChatMessage trims whitespace and converts Windows newlines', () => {
  assert.equal(normalizeChatMessage('  hello\r\nworld  '), 'hello\nworld');
  assert.equal(normalizeChatMessage('   '), '');
  assert.equal(normalizeChatMessage(null), '');
  assert.equal(normalizeChatMessage(42), '');
});

test('isSendableMessage enforces the length limit', () => {
  assert.equal(isSendableMessage('hi'), true);
  assert.equal(isSendableMessage('   '), false);
  assert.equal(isSendableMessage('x'.repeat(MAX_AI_MESSAGE_LENGTH)), true);
  assert.equal(isSendableMessage('x'.repeat(MAX_AI_MESSAGE_LENGTH + 1)), false);
});

test('suggestion prompts stay within the sendable limit', () => {
  assert.ok(AI_CHAT_SUGGESTIONS.length > 0);
  for (const suggestion of AI_CHAT_SUGGESTIONS) {
    assert.equal(isSendableMessage(suggestion), true, suggestion);
  }
});

test('looksLikeImageRequest previews image intent for the required prompts without catching ordinary chat', () => {
  assert.equal(looksLikeImageRequest('Create an image of a futuristic office'), true);
  assert.equal(looksLikeImageRequest('Generate a logo for Vuprise'), true);
  assert.equal(looksLikeImageRequest('Make a banner'), true);
  assert.equal(looksLikeImageRequest('Draw a professional networking illustration'), true);
  assert.equal(looksLikeImageRequest('Create a Image For This Vuprise Website'), true);
  assert.equal(looksLikeImageRequest('What is in this image?'), false);
  assert.equal(looksLikeImageRequest('Draft a short outreach message to a potential mentor.'), false);
  assert.equal(looksLikeImageRequest(''), false);
});

test('validateAttachmentFile enforces type and size before upload', () => {
  assert.equal(validateAttachmentFile({ type: 'image/png', size: 1024 }), '');
  assert.equal(validateAttachmentFile({ type: 'image/jpeg', size: ATTACHMENT_MAX_BYTES }), '');
  assert.match(validateAttachmentFile({ type: 'image/gif', size: 1024 }), /JPG, PNG, or WebP/);
  assert.match(validateAttachmentFile({ type: 'image/png', size: ATTACHMENT_MAX_BYTES + 1 }), /5MB or smaller/);
  assert.match(validateAttachmentFile(null), /Choose an image/);
});
