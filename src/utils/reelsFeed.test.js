import test from 'node:test';
import assert from 'node:assert/strict';
import { composeReelFeed, isPlayableVideoPost, mergeReelFeedPosts } from './reelsFeed.js';

const image = { _id: 'image', mediaType: 'image', videoUrl: '' };
const ordinaryVideo = { _id: 'video-post', mediaType: 'video', videoUrl: 'ordinary.mp4', videoPresentation: 'post' };
const reelA = { _id: 'reel-a', mediaType: 'video', videoUrl: 'a.mp4', videoPresentation: 'reel' };
const reelB = { _id: 'reel-b', mediaType: 'video', videoUrl: 'b.mp4', videoPresentation: 'reel' };

test('Reels feed only contains playable video records marked as Reels', () => {
  assert.equal(isPlayableVideoPost(image), false);
  assert.deepEqual(composeReelFeed([image, ordinaryVideo, reelA, reelB]), [reelA, reelB]);
});

test('a Home video tap opens that exact ordinary video before subsequent Reels', () => {
  assert.deepEqual(composeReelFeed([image, reelA, ordinaryVideo, reelB], ordinaryVideo, 'video-post'), [ordinaryVideo, reelA, reelB]);
});

test('a selected Reel is not duplicated in the feed', () => {
  assert.deepEqual(composeReelFeed([reelA, reelB], reelA, 'reel-a'), [reelA, reelB]);
});

test('loading another page merges posts without duplicate records', () => {
  assert.deepEqual(mergeReelFeedPosts([reelA, reelB], [reelB, ordinaryVideo]), [reelA, reelB, ordinaryVideo]);
});
