export type DevicePreferencesSnapshot = {
  compactMode: boolean;
  glassEffects: boolean;
};

export const DEVICE_PREFERENCE_STORAGE_KEYS = {
  "compact-mode": "nexora.ui.compact-mode",
  "glass-effects": "nexora.ui.glass-effects",
} as const;

export type DevicePreferenceId = keyof typeof DEVICE_PREFERENCE_STORAGE_KEYS;

export const DEVICE_PREFERENCES_EVENT = "nexora:ui-preferences";

const DEFAULT_SNAPSHOT: DevicePreferencesSnapshot = {
  compactMode: false,
  glassEffects: true,
};

let cachedSnapshot: DevicePreferencesSnapshot = DEFAULT_SNAPSHOT;
let hasInitializedSnapshot = false;

export function isDevicePreferenceId(id: string): id is DevicePreferenceId {
  return id === "compact-mode" || id === "glass-effects";
}

function readStorageBoolean(key: string, defaultValue: boolean, fallback: boolean): boolean {
  if (typeof window === "undefined") {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) {
      return defaultValue;
    }
    return defaultValue ? raw !== "false" : raw === "true";
  } catch {
    return fallback;
  }
}

function writeStorageBoolean(key: string, value: boolean): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    const serialized = String(value);
    window.localStorage.setItem(key, serialized);
    return window.localStorage.getItem(key) === serialized;
  } catch {
    return false;
  }
}

function snapshotsEqual(
  left: DevicePreferencesSnapshot,
  right: DevicePreferencesSnapshot,
): boolean {
  return (
    left.compactMode === right.compactMode &&
    left.glassEffects === right.glassEffects
  );
}

export function applyDevicePreferenceAttributes(
  preferences: DevicePreferencesSnapshot,
): void {
  if (typeof document === "undefined") {
    return;
  }
  const root = document.documentElement;
  if (preferences.compactMode) {
    root.dataset.nxCompact = "true";
  } else {
    delete root.dataset.nxCompact;
  }

  if (!preferences.glassEffects) {
    root.dataset.nxGlass = "reduced";
  } else {
    delete root.dataset.nxGlass;
  }
}

export function readStoredDevicePreferencesSnapshot(): DevicePreferencesSnapshot {
  if (typeof window === "undefined") {
    return DEFAULT_SNAPSHOT;
  }
  const next: DevicePreferencesSnapshot = {
    compactMode: readStorageBoolean(
      DEVICE_PREFERENCE_STORAGE_KEYS["compact-mode"],
      DEFAULT_SNAPSHOT.compactMode,
      cachedSnapshot.compactMode,
    ),
    glassEffects: readStorageBoolean(
      DEVICE_PREFERENCE_STORAGE_KEYS["glass-effects"],
      DEFAULT_SNAPSHOT.glassEffects,
      cachedSnapshot.glassEffects,
    ),
  };
  if (!hasInitializedSnapshot || !snapshotsEqual(cachedSnapshot, next)) {
    cachedSnapshot = next;
    hasInitializedSnapshot = true;
  }
  return cachedSnapshot;
}

export function getServerDevicePreferencesSnapshot(): DevicePreferencesSnapshot {
  return DEFAULT_SNAPSHOT;
}

export function subscribeDevicePreferences(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const syncAndNotify = () => {
    applyDevicePreferenceAttributes(readStoredDevicePreferencesSnapshot());
    onStoreChange();
  };
  const handleStorage = (event: StorageEvent) => {
    if (
      event.key === null ||
      event.key === DEVICE_PREFERENCE_STORAGE_KEYS["compact-mode"] ||
      event.key === DEVICE_PREFERENCE_STORAGE_KEYS["glass-effects"]
    ) {
      syncAndNotify();
    }
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(DEVICE_PREFERENCES_EVENT, syncAndNotify);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(DEVICE_PREFERENCES_EVENT, syncAndNotify);
  };
}

export function setDevicePreferenceFlag(
  id: DevicePreferenceId,
  enabled: boolean,
): {
  preferences: DevicePreferencesSnapshot;
  persisted: boolean;
} {
  const current = readStoredDevicePreferencesSnapshot();
  const next: DevicePreferencesSnapshot =
    id === "compact-mode"
      ? { ...current, compactMode: enabled }
      : { ...current, glassEffects: enabled };
  const persisted = writeStorageBoolean(DEVICE_PREFERENCE_STORAGE_KEYS[id], enabled);

  cachedSnapshot = next;
  hasInitializedSnapshot = true;
  applyDevicePreferenceAttributes(next);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(DEVICE_PREFERENCES_EVENT));
  }

  return {
    preferences: next,
    persisted,
  };
}

export function resetDevicePreferencesCacheForTests(): void {
  cachedSnapshot = DEFAULT_SNAPSHOT;
  hasInitializedSnapshot = false;
}
