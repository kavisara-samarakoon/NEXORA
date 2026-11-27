export type DevicePreferencesSnapshot = {
  compactMode: boolean;
  glassEffects: boolean;
  motionPaused: boolean;
  reducedMotion: boolean;
};

export const DEVICE_PREFERENCE_STORAGE_KEYS = {
  "compact-mode": "nexora.ui.compact-mode",
  "glass-effects": "nexora.ui.glass-effects",
} as const;

export type DevicePreferenceId = keyof typeof DEVICE_PREFERENCE_STORAGE_KEYS;

const MOTION_STORAGE_KEY = "nexora.cinematic.motion.paused";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const storageKeys = { ...DEVICE_PREFERENCE_STORAGE_KEYS, motion: MOTION_STORAGE_KEY };
const DEFAULT_SNAPSHOT: DevicePreferencesSnapshot = {
  compactMode: false,
  glassEffects: true,
  motionPaused: false,
  reducedMotion: false,
};

let snapshot = DEFAULT_SNAPSHOT;
// A failed write remains effective for this tab until an authoritative storage change.
const sessionValues = new Map<string, boolean>();
const subscribers = new Set<() => void>();
let reducedMotionMedia: MediaQueryList | undefined;
let stopListening: (() => void) | undefined;

// Static script with no interpolation of user data. Apply the same defaults before hydration.
export const INITIAL_DEVICE_PREFERENCES_SCRIPT = `(() => {
  const root = document.documentElement;
  const keys = ${JSON.stringify(storageKeys)};
  const read = (key) => {
    try { return localStorage.getItem(key); } catch { return null; }
  };
  if (read(keys["compact-mode"]) === "true") root.dataset.nxCompact = "true";
  if (read(keys["glass-effects"]) === "false") root.dataset.nxGlass = "reduced";
  root.dataset.nxMotion = read(keys.motion) === "true" ||
    window.matchMedia(${JSON.stringify(REDUCED_MOTION_QUERY)}).matches ? "paused" : "running";
})();`;

export function isDevicePreferenceId(id: string): id is DevicePreferenceId {
  return id === "compact-mode" || id === "glass-effects";
}

function readStorageBoolean(key: string, defaultValue: boolean, fallback: boolean): boolean {
  const sessionValue = sessionValues.get(key);
  if (sessionValue !== undefined) return sessionValue;
  try {
    const raw = window.localStorage.getItem(key);
    return defaultValue ? raw !== "false" : raw === "true";
  } catch {
    return fallback;
  }
}

export function applyDevicePreferenceAttributes(preferences: DevicePreferencesSnapshot): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (preferences.compactMode) root.dataset.nxCompact = "true";
  else delete root.dataset.nxCompact;
  if (!preferences.glassEffects) root.dataset.nxGlass = "reduced";
  else delete root.dataset.nxGlass;
  root.dataset.nxMotion = preferences.motionPaused || preferences.reducedMotion ? "paused" : "running";
}

export function readStoredDevicePreferencesSnapshot(): DevicePreferencesSnapshot {
  if (typeof window === "undefined") return DEFAULT_SNAPSHOT;
  const next = {
    compactMode: readStorageBoolean(storageKeys["compact-mode"], false, snapshot.compactMode),
    glassEffects: readStorageBoolean(storageKeys["glass-effects"], true, snapshot.glassEffects),
    motionPaused: readStorageBoolean(storageKeys.motion, false, snapshot.motionPaused),
    reducedMotion: (reducedMotionMedia ?? window.matchMedia?.(REDUCED_MOTION_QUERY))?.matches ?? false,
  };
  if (next.compactMode !== snapshot.compactMode || next.glassEffects !== snapshot.glassEffects ||
      next.motionPaused !== snapshot.motionPaused || next.reducedMotion !== snapshot.reducedMotion) {
    snapshot = next;
  }
  return snapshot;
}

export function getServerDevicePreferencesSnapshot(): DevicePreferencesSnapshot {
  return DEFAULT_SNAPSHOT;
}

function synchronize(): DevicePreferencesSnapshot {
  const current = readStoredDevicePreferencesSnapshot();
  applyDevicePreferenceAttributes(current);
  subscribers.forEach((notify) => notify());
  return current;
}

export function subscribeDevicePreferences(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  subscribers.add(onStoreChange);
  if (!stopListening) {
    reducedMotionMedia = window.matchMedia?.(REDUCED_MOTION_QUERY);
    const handleStorage = (event: StorageEvent) => {
      if (event.key === null) sessionValues.clear();
      else if (Object.values(storageKeys).some((key) => key === event.key)) sessionValues.delete(event.key);
      else return;
      synchronize();
    };
    window.addEventListener("storage", handleStorage);
    reducedMotionMedia?.addEventListener("change", synchronize);
    stopListening = () => {
      window.removeEventListener("storage", handleStorage);
      reducedMotionMedia?.removeEventListener("change", synchronize);
      reducedMotionMedia = undefined;
      stopListening = undefined;
    };
  }
  applyDevicePreferenceAttributes(readStoredDevicePreferencesSnapshot());
  return () => {
    subscribers.delete(onStoreChange);
    if (!subscribers.size) stopListening?.();
  };
}

function savePreference(key: string, enabled: boolean) {
  if (typeof window === "undefined") return { preferences: DEFAULT_SNAPSHOT, persisted: false };
  let persisted = false;
  try {
    const serialized = String(enabled);
    window.localStorage.setItem(key, serialized);
    persisted = window.localStorage.getItem(key) === serialized;
  } catch {
    // Preserve the setting for this tab and let the caller report the failed write.
  }
  if (persisted) sessionValues.delete(key);
  else sessionValues.set(key, enabled);
  return { preferences: synchronize(), persisted };
}

export function setDevicePreferenceFlag(id: DevicePreferenceId, enabled: boolean) {
  return savePreference(storageKeys[id], enabled);
}

export function toggleDeviceMotionPause(): boolean {
  return savePreference(storageKeys.motion, !readStoredDevicePreferencesSnapshot().motionPaused).persisted;
}

export function resetDevicePreferencesCacheForTests(): void {
  snapshot = DEFAULT_SNAPSHOT;
  sessionValues.clear();
}
