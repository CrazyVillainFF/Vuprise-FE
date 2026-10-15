export const formatLastSeen = (value, now = Date.now()) => {
  if (!value) return '';
  const date = new Date(value);
  const timestamp = date.getTime();
  if (!Number.isFinite(timestamp) || timestamp > now) return '';
  const elapsed = Math.floor((now - timestamp) / 60_000);
  if (elapsed < 1) return 'Last seen just now';
  if (elapsed < 60) return `Last seen ${elapsed} ${elapsed === 1 ? 'minute' : 'minutes'} ago`;
  const hours = Math.floor(elapsed / 60);
  if (hours < 24) return `Last seen ${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
  const days = Math.floor((new Date(now).setHours(0, 0, 0, 0) - new Date(timestamp).setHours(0, 0, 0, 0)) / 86_400_000);
  if (days === 1) return `Last seen yesterday at ${time}`;
  return `Last seen ${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)} at ${time}`;
};
