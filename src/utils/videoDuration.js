export const VIDEO_DURATION_EPSILON_SECONDS = 0.05;

// Android Chrome can expose an unknown duration initially, then update it
// after `durationchange`; some finite seekable ranges also resolve Infinity.
export function readFiniteVideoDuration(video) {
  if (!video) return null;
  if (Number.isFinite(video.duration) && video.duration > 0) return video.duration;
  if (video.duration === Infinity && video.seekable?.length) {
    const seekableEnd = video.seekable.end(video.seekable.length - 1);
    if (Number.isFinite(seekableEnd) && seekableEnd > 0) return seekableEnd;
  }
  return null;
}

export function clampTrimEndToDuration(trimEnd, duration, epsilon = VIDEO_DURATION_EPSILON_SECONDS) {
  const end = Number(trimEnd);
  const sourceDuration = Number(duration);
  if (!Number.isFinite(end) || !Number.isFinite(sourceDuration) || sourceDuration <= 0) return null;
  if (end <= sourceDuration) return end;
  return end - sourceDuration <= epsilon ? sourceDuration : null;
}
