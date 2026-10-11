import test from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import { getUploadChunkRanges, uploadVideoDirectly, VIDEO_CHUNK_BYTES } from './cloudinaryVideoUpload.js';

test('large browser videos are split into bounded direct-to-provider chunks', () => {
  const ranges = getUploadChunkRanges(VIDEO_CHUNK_BYTES * 2 + 17);
  assert.deepEqual(ranges, [
    { start: 0, end: VIDEO_CHUNK_BYTES },
    { start: VIDEO_CHUNK_BYTES, end: VIDEO_CHUNK_BYTES * 2 },
    { start: VIDEO_CHUNK_BYTES * 2, end: VIDEO_CHUNK_BYTES * 2 + 17 },
  ]);
  assert.ok(ranges.every(({ start, end }) => end - start <= VIDEO_CHUNK_BYTES));
});

test('chunk range generation rejects invalid sizes and handles a single small video', () => {
  assert.deepEqual(getUploadChunkRanges(0), []);
  assert.deepEqual(getUploadChunkRanges(-1), []);
  assert.deepEqual(getUploadChunkRanges(Number.MAX_SAFE_INTEGER + 1), []);
  assert.deepEqual(getUploadChunkRanges(1024, 10_000), [{ start: 0, end: 1024 }]);
});

test('video bytes are posted to Cloudinary directly with the scoped server signature', async () => {
  const originalPost = axios.post;
  const calls = [];
  axios.post = async (url, body, config) => {
    calls.push({ url, body, config });
    config.onUploadProgress({ loaded: 4, total: 4 });
    return { data: { secure_url: 'https://media.example/video.mp4' } };
  };
  try {
    const progress = [];
    const result = await uploadVideoDirectly({
      file: new Blob(['clip']),
      authorization: {
        cloudName: 'test-cloud', uploadId: '65aabbccddeeff0011223344', apiKey: 'public-key',
        timestamp: 123, publicId: 'nexora/posts/videos/user/unique', overwrite: false,
        allowed_formats: 'mp4,webm,mov,m4v', context: 'user_id=user|upload_session=session', signature: 'scoped-signature',
      },
      onProgress: (value) => progress.push(value),
    });
    assert.equal(result.secure_url, 'https://media.example/video.mp4');
    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /^https:\/\/api\.cloudinary\.com\/v1_1\/test-cloud\/video\/upload$/);
    assert.equal(calls[0].body.get('signature'), 'scoped-signature');
    assert.equal(calls[0].body.get('api_key'), 'public-key');
    assert.equal(calls[0].body.get('file').size, 4);
    assert.deepEqual(progress, [99, 100]);
  } finally {
    axios.post = originalPost;
  }
});

test('interrupted provider requests retry only a bounded number of times', async () => {
  const originalPost = axios.post;
  let attempts = 0;
  axios.post = async () => {
    attempts += 1;
    throw new Error('network interrupted');
  };
  try {
    await assert.rejects(uploadVideoDirectly({
      file: new Blob(['clip']),
      authorization: { cloudName: 'test-cloud', uploadId: '65aabbccddeeff0011223344' },
    }), /network interrupted/);
    assert.equal(attempts, 3);
  } finally {
    axios.post = originalPost;
  }
});
