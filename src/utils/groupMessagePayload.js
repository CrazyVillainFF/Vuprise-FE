export const buildGroupMessagePayload = ({ text, clientMessageId, file }) => {
  if (!file) return { text, clientMessageId };

  const payload = new FormData();
  payload.append('text', text);
  payload.append('clientMessageId', clientMessageId);
  payload.append('image', file);
  return payload;
};
