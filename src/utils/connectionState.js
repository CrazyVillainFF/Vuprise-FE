const idOf = (value) => String(value?._id || value || '');

export const isConnectedTo = (connections, userId) => {
  const targetId = idOf(userId);
  return Boolean(targetId && Array.isArray(connections) && connections.some((connection) => idOf(connection) === targetId));
};

export const feedConnectionStatus = (post, viewer) => {
  const authorId = idOf(typeof post?.author === 'object' ? post.author?._id : post?.author);
  const viewerId = idOf(viewer);
  if (viewerId && authorId === viewerId) return 'self';
  if (post?.connectionStatus) return post.connectionStatus;
  return isConnectedTo(viewer?.connections, authorId) ? 'connected' : 'none';
};
