// Public accounts can receive messages from members they are not connected to.
// The inbox must therefore show every conversation the API returned, not only
// the accepted connections, or those messages stay invisible to the recipient.
export const buildInboxPeers = (contacts, conversations) => {
  const peers = new Map((contacts || []).map((contact) => [String(contact._id), contact]));
  (conversations || []).forEach((conversation) => {
    const peer = conversation?.peer;
    if (!peer?._id || conversation.isOfficialBroadcast) return;
    const key = String(peer._id);
    if (!peers.has(key)) peers.set(key, peer);
  });
  return sortContactsByRecentConversations([...peers.values()], conversations);
};

export const sortContactsByRecentConversations = (contacts, conversations) => {
  const recentPositions = new Map();
  conversations.forEach((conversation, index) => {
    const peerId = conversation.peer?._id;
    if (peerId != null && !recentPositions.has(String(peerId))) {
      recentPositions.set(String(peerId), index);
    }
  });

  return contacts
    .map((contact, originalPosition) => ({ contact, originalPosition }))
    .sort((left, right) => {
      const leftPosition = recentPositions.get(String(left.contact._id)) ?? Number.MAX_SAFE_INTEGER;
      const rightPosition = recentPositions.get(String(right.contact._id)) ?? Number.MAX_SAFE_INTEGER;
      return leftPosition - rightPosition || left.originalPosition - right.originalPosition;
    })
    .map(({ contact }) => contact);
};
