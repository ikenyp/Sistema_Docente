const WARNING_MINUTES = 5;
const WARNING_MS = WARNING_MINUTES * 60 * 1000;

let subscribers = [];
let timers = { warning: null, expiry: null };
let warningShown = false;
let expiryShown = false;

function notifySession(event) {
  subscribers.forEach((fn) => fn(event));
}

function clearTimers() {
  if (timers.warning) clearTimeout(timers.warning);
  if (timers.expiry) clearTimeout(timers.expiry);
  timers = { warning: null, expiry: null };
}

function decodeJwtPayload(token) {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(normalized)
        .split("")
        .map((c) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join(""),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getSessionExpiration(token = localStorage.getItem("token")) {
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return null;
  return payload.exp * 1000;
}

export function clearSessionStorage() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("app_mode");
  localStorage.removeItem("usuario");
}

export function endSession(reason = "expired") {
  clearTimers();
  clearSessionStorage();
  warningShown = false;
  expiryShown = reason === "expired";
  notifySession({ type: "expired", reason });
}

export function scheduleSessionWatch(token = localStorage.getItem("token")) {
  clearTimers();
  warningShown = false;
  expiryShown = false;

  const expiresAt = getSessionExpiration(token);
  if (!expiresAt) return null;

  const now = Date.now();
  const msUntilExpiry = expiresAt - now;

  if (msUntilExpiry <= 0) {
    endSession("expired");
    return expiresAt;
  }

  const msUntilWarning = msUntilExpiry - WARNING_MS;

  if (msUntilWarning <= 0) {
    warningShown = true;
    notifySession({
      type: "warning",
      expiresAt,
      remainingMs: msUntilExpiry,
      warningMinutes: WARNING_MINUTES,
    });
  } else {
    timers.warning = setTimeout(() => {
      warningShown = true;
      notifySession({
        type: "warning",
        expiresAt,
        remainingMs: Math.max(0, expiresAt - Date.now()),
        warningMinutes: WARNING_MINUTES,
      });
    }, msUntilWarning);
  }

  timers.expiry = setTimeout(() => {
    endSession("expired");
  }, msUntilExpiry);

  return expiresAt;
}

export function getSessionWatchState() {
  return { warningShown, expiryShown };
}

export function markSessionWarningHandled() {
  warningShown = false;
}

export function subscribeSession(fn) {
  subscribers.push(fn);
  return () => {
    subscribers = subscribers.filter((item) => item !== fn);
  };
}
