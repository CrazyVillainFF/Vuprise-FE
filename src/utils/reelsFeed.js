export const isPlayableVideoPost = (post) => post?.mediaType === 'video' && Boolean(post?.videoUrl);

export const composeReelFeed = (feedPosts = [], selectedPost = null, selectedId = '') => {
  const playablePosts = feedPosts.filter(isPlayableVideoPost);
  const reelPosts = playablePosts.filter((post) => post.videoPresentation === 'reel');
  const requested = playablePosts.find((post) => String(post._id) === String(selectedId))
    || (isPlayableVideoPost(selectedPost) && String(selectedPost._id) === String(selectedId) ? selectedPost : null);

  if (!requested) return reelPosts;
  return [requested, ...reelPosts.filter((post) => String(post._id) !== String(requested._id))];
};

export const mergeReelFeedPosts = (current = [], incoming = []) => {
  const known = new Set(current.map((post) => String(post._id)));
  return [...current, ...incoming.filter((post) => !known.has(String(post._id)))];
};
