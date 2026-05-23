export type ConnectivitySnapshot = {
  online: boolean;
  lastChangedAt: string;
};

type ConnectivityListener = (snapshot: ConnectivitySnapshot) => void;

const listeners = new Set<ConnectivityListener>();
let installed = false;
let snapshot: ConnectivitySnapshot = {
  online: true,
  lastChangedAt: new Date(0).toISOString(),
};

function readOnlineState() {
  if (typeof navigator === "undefined") return true;
  return typeof navigator.onLine === "boolean" ? navigator.onLine : true;
}

function emit() {
  snapshot = {
    online: readOnlineState(),
    lastChangedAt: new Date().toISOString(),
  };
  listeners.forEach((listener) => listener(snapshot));
}

function install() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  snapshot = {
    online: readOnlineState(),
    lastChangedAt: new Date().toISOString(),
  };
  window.addEventListener("online", emit);
  window.addEventListener("offline", emit);
}

export function getConnectivitySnapshot() {
  if (typeof window !== "undefined") install();
  return {
    ...snapshot,
    online: readOnlineState(),
  };
}

export function isOnline() {
  return getConnectivitySnapshot().online;
}

export function subscribeConnectivity(listener: ConnectivityListener) {
  install();
  listener(getConnectivitySnapshot());
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
