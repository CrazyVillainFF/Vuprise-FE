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
  const precisionSlack = Number.EPSILON * Math.max(1, Math.abs(end), Math.abs(sourceDuration)) * 4;
  return end - sourceDuration <= epsilon + precisionSlack ? sourceDuration : null;
}

// Normalize only the range's representational edge. Interior trim choices are
// kept as selected; invalid starts, reversed ranges, and materially overlong
// endpoints remain invalid for the server to reject as well.
export function normalizeTrimRange(trimStart, trimEnd, duration, epsilon = VIDEO_DURATION_EPSILON_SECONDS) {
  const start = Number(trimStart);
  const sourceDuration = Number(duration);
  if (!Number.isFinite(start) || !Number.isFinite(sourceDuration) || sourceDuration <= 0
    || start < 0 || start >= sourceDuration) return null;
  const end = clampTrimEndToDuration(trimEnd, sourceDuration, epsilon);
  if (!Number.isFinite(end) || end <= start) return null;
  return { start, end };
}

// Keep a trim endpoint attached to source EOF when browsers refine duration
// metadata after the first loadedmetadata event. A user-selected interior end
// remains unchanged (unless a shorter duration requires clamping it).
export function updateTrimEndForDuration(trimEnd, previousDuration, duration, trimStart = 0, maxClipSeconds = 35, epsilon = VIDEO_DURATION_EPSILON_SECONDS) {
  const end = Number(trimEnd);
  const previous = Number(previousDuration);
  const nextDuration = Number(duration);
  const start = Number(trimStart);
  if (!Number.isFinite(nextDuration) || nextDuration <= 0) return end;
  if (!Number.isFinite(end) || end <= 0 || !Number.isFinite(previous) || previous <= 0) {
    return Math.min(nextDuration, Math.max(0, start) + maxClipSeconds);
  }
  const endTrackedSource = Math.abs(end - previous) <= epsilon;
  if (endTrackedSource && nextDuration > previous) {
    return Math.min(nextDuration, Math.max(0, start) + maxClipSeconds);
  }
  return Math.min(end, nextDuration);
}
