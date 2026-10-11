import axios from 'axios';

export const VIDEO_CHUNK_BYTES = 20 * 1024 * 1024;
const SINGLE_REQUEST_LIMIT = 100 * 1024 * 1024;

const makeUploadBody = (file, authorization) => {
  const body = new FormData();
  body.append('file', file);
  body.append('api_key', authorization.apiKey);
  body.append('timestamp', String(authorization.timestamp));
  body.append('public_id', authorization.publicId);
  body.append('overwrite', String(authorization.overwrite));
  body.append('allowed_formats', authorization.allowed_formats);
  body.append('context', authorization.context);
  body.append('signature', authorization.signature);
  return body;
};

const isRetryable = (error) => !error.response || error.response.status >= 500 || error.response.status === 429;

export const getUploadChunkRanges = (fileSize, chunkSize = VIDEO_CHUNK_BYTES) => {
  if (!Number.isSafeInteger(fileSize) || fileSize <= 0 || !Number.isSafeInteger(chunkSize) || chunkSize < 1) return [];
  const ranges = [];
  for (let start = 0; start < fileSize; start += chunkSize) ranges.push({ start, end: Math.min(fileSize, start + chunkSize) });
  return ranges;
};

const sendChunk = async ({ blob, authorization, url, start, end, total, uploadId, onProgress, signal }) => {
  let attempt = 0;
  while (true) {
    try {
      return await axios.post(url, makeUploadBody(blob, authorization), {
        signal,
        headers: total > SINGLE_REQUEST_LIMIT ? {
          'Content-Range': `bytes ${start}-${end - 1}/${total}`,
          'X-Unique-Upload-Id': uploadId,
        } : undefined,
        onUploadProgress: (event) => {
          const sent = start + Math.min(event.loaded, end - start);
          onProgress(Math.min(99, Math.round((sent / total) * 100)));
        },
        timeout: 180_000,
      });
    } catch (error) {
      if (signal?.aborted || !isRetryable(error) || attempt >= 2) throw error;
      attempt += 1;
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, 400 * (2 ** attempt));
        signal?.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Upload canceled', 'AbortError')); }, { once: true });
      });
    }
  }
};

export const uploadVideoDirectly = async ({ file, authorization, onProgress = () => {}, signal }) => {
  const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(authorization.cloudName)}/video/upload`;
  const uploadId = authorization.uploadId.replace(/[^a-fA-F0-9]/g, '').slice(0, 32) || crypto.randomUUID().replaceAll('-', '');
  let response;
  const chunkBytes = file.size > SINGLE_REQUEST_LIMIT ? VIDEO_CHUNK_BYTES : file.size;
  for (const { start, end } of getUploadChunkRanges(file.size, chunkBytes)) {
    response = await sendChunk({
      blob: file.size > SINGLE_REQUEST_LIMIT ? file.slice(start, end) : file,
      authorization,
      url: endpoint,
      start,
      end,
      total: file.size,
      uploadId,
      onProgress,
      signal,
    });
  }
  onProgress(100);
  return response?.data;
};
