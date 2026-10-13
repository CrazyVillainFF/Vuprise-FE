const getReactionUserId = (reaction) => String(reaction?.user?._id || reaction?.user || '');

export const toggleMessageReactionState = (reactions, userId, emoji) => {
  const current = Array.isArray(reactions) ? reactions : [];
  if (userId == null || userId === '') return current;

  const normalizedUserId = String(userId);
  const existing = current.find((reaction) => getReactionUserId(reaction) === normalizedUserId);
  const withoutCurrentUser = current.filter((reaction) => getReactionUserId(reaction) !== normalizedUserId);

  if (existing?.emoji === emoji) return withoutCurrentUser;
  return [...withoutCurrentUser, { user: normalizedUserId, emoji }];
};
