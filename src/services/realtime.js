const apiUrl = new URL(import.meta.env.VITE_API_URL || 'http://localhost:5000/api');
const baseUrl = `${apiUrl.origin}${apiUrl.pathname.replace(/\/$/, '')}`;
const listeners = new Set();
const watchedUserIdsByScope = new Map();
let connection = null;

const publish = (event) => listeners.forEach((listener) => listener(event));
const request = (path, body, token, keepalive = false) => fetch(`${baseUrl}${path}`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
  keepalive,
});

const allWatchedUserIds = () => [...new Set([...watchedUserIdsByScope.values()].flatMap((ids) => ids))].slice(0, 100);
const syncPresenceWatches = () => {
  if (!connection?.sessionId) return;
  request('/realtime/watch', { sessionId: connection.sessionId, userIds: allWatchedUserIds() }, connection.token).catch(() => {});
};

export function connectRealtime(token) {
  disconnectRealtime();
  if (!token) return;
  const state = { token, closed: false, running: false, controller: null, sessionId: null, heartbeat: null, retry: 0, beatNow: null };
  connection = state;

  const run = async () => {
    if (state.running || state.closed || document.visibilityState === 'hidden') return;
    state.running = true;
    try {
    while (!state.closed && document.visibilityState !== 'hidden') {
      state.controller = new AbortController();
      try {
        const response = await fetch(`${baseUrl}/realtime/events`, {
          headers: { Authorization: `Bearer ${state.token}`, Accept: 'text/event-stream' },
          signal: state.controller.signal,
          cache: 'no-store',
        });
        if (!response.ok || !response.body) {
          if (response.status === 401) {
            window.dispatchEvent(new Event('auth:unauthorized'));
            return;
          }
          throw new Error('Realtime stream unavailable');
        }
        state.retry = 0;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (!state.closed) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split(/\r?\n\r?\n/);
          buffer = frames.pop() || '';
          for (const frame of frames) {
            let eventName = '';
            let payload = null;
            for (const line of frame.split(/\r?\n/)) {
              if (line.startsWith('event:')) eventName = line.slice(6).trim();
              else if (line.startsWith('data:')) {
                try { payload = JSON.parse(line.slice(5).trim()); } catch { payload = null; }
              }
            }
            if (!payload) continue;
            publish({ type: eventName || 'message', ...payload });
            if (eventName === 'ready') {
              state.sessionId = payload.sessionId;
              state.beatNow = async () => {
                if (state.closed || document.visibilityState === 'hidden' || navigator.onLine === false || !state.sessionId) return;
                try {
                  const beat = await request('/realtime/heartbeat', { sessionId: state.sessionId }, state.token);
                  if (beat.status === 401) state.controller?.abort();
                } catch { /* The stream reconnects; the server expires sessions whose heartbeats stop. */ }
              };
              void state.beatNow();
              state.heartbeat = window.setInterval(async () => {
                await state.beatNow?.();
              }, payload.heartbeatMs || 25_000);
              if (watchedUserIdsByScope.size) syncPresenceWatches();
            }
          }
        }
      } catch {
        if (state.closed) break;
      } finally {
        if (state.heartbeat) window.clearInterval(state.heartbeat);
        state.heartbeat = null;
        state.sessionId = null;
      }
      if (!state.closed) {
        const delay = Math.min(1000 * (2 ** state.retry), 15_000);
        state.retry += 1;
        await new Promise((resolve) => window.setTimeout(resolve, delay));
      }
    }
    } finally {
      state.running = false;
      if (!state.closed && document.visibilityState !== 'hidden') window.setTimeout(run, 0);
    }
  };

  state.onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      if (state.heartbeat) window.clearInterval(state.heartbeat);
      state.heartbeat = null;
      const sessionId = state.sessionId;
      state.sessionId = null;
      if (sessionId) request('/realtime/logout', { sessionId }, state.token, true).catch(() => {});
      state.controller?.abort();
    } else {
      void run();
    }
  };
  state.onOnline = () => { if (document.visibilityState !== 'hidden') void state.beatNow?.(); };
  document.addEventListener('visibilitychange', state.onVisibilityChange);
  window.addEventListener('online', state.onOnline);
  void run();
}

export function disconnectRealtime({ notify = false } = {}) {
  const state = connection;
  connection = null;
  if (!state) return;
  state.closed = true;
  document.removeEventListener('visibilitychange', state.onVisibilityChange);
  window.removeEventListener('online', state.onOnline);
  if (notify && state.sessionId) request('/realtime/logout', { sessionId: state.sessionId }, state.token, true).catch(() => {});
  if (state.heartbeat) window.clearInterval(state.heartbeat);
  state.controller?.abort();
}

export function watchPresence(ids, scope = 'default') {
  watchedUserIdsByScope.set(scope, [...new Set((ids || []).filter(Boolean).map(String))]);
  syncPresenceWatches();
}

export function unwatchPresence(scope = 'default') {
  watchedUserIdsByScope.delete(scope);
  syncPresenceWatches();
}

export function subscribeRealtime(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function sendTyping(scopeType, scopeId, active) {
  if (!connection || !scopeId) return;
  const kind = scopeType === 'group' ? 'groups' : 'conversations';
  request(`/realtime/typing/${kind}/${encodeURIComponent(scopeId)}/${active ? 'start' : 'stop'}`, { active }, connection.token).catch(() => {});
}
