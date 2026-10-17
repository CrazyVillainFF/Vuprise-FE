// Shared helpers for the AI chat page. Kept framework-free so they can be
// unit-tested without a DOM.

export const MAX_AI_MESSAGE_LENGTH = 2000;

// Normalizes typed input: converts Windows newlines and trims surrounding
// whitespace. Returns '' for anything that is not a usable string.
export const normalizeChatMessage = (value) => (
  typeof value === 'string' ? value.replace(/\r\n/g, '\n').trim() : ''
);

export const isSendableMessage = (value) => {
  const normalized = normalizeChatMessage(value);
  return normalized.length > 0 && normalized.length <= MAX_AI_MESSAGE_LENGTH;
};

// Suggested prompts shown in the empty state.
export const AI_CHAT_SUGGESTIONS = [
  'Draft a short outreach message to a potential mentor.',
  'Create an image of a futuristic office.',
  'Give me three post ideas about a project I just shipped.',
  'How should I prepare for a networking event this week?'
];

// ---- Attachments -----------------------------------------------------------

export const ATTACHMENT_MAX_COUNT = 4;
export const ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;
export const ATTACHMENT_ACCEPT = 'image/jpeg,image/png,image/webp';
export const ATTACHMENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Frontend pre-validation. The backend re-checks MIME type, size, and count
// (including magic bytes) - this only keeps obviously invalid files out early.
export const validateAttachmentFile = (file) => {
  if (!file) return 'Choose an image to attach.';
  if (!ATTACHMENT_TYPES.includes(file.type)) return 'Attachments must be JPG, PNG, or WebP images.';
  if (file.size > ATTACHMENT_MAX_BYTES) return 'Each attachment must be 5MB or smaller.';
  return '';
};

// UI-only preview heuristic: decides whether to show the "Generating image..."
// bubble immediately while the backend's LLM classifier makes the real call.
// Never used as the actual routing decision.
export const looksLikeImageRequest = (value) => {
  const text = normalizeChatMessage(value).toLowerCase();
  if (!text) return false;
  const action = /(create|generate|make|draw|design|render|produce|paint|illustrate)/.test(text);
  const subject = /(image|picture|photo|logo|banner|poster|illustration|graphic|artwork|icon|wallpaper|scene)/.test(text);
  return action && subject;
};
