"use client";

import { useCallback, useSyncExternalStore } from "react";

import styles from "./cinematic.module.css";

type SceneControlState = {
  motionPaused: boolean;
  soundOn: boolean;
};

type CinematicSceneControlsProps = {
  className?: string;
  showMotion?: boolean;
  soundIconOnly?: boolean;
};

const MOTION_STORAGE_KEY = "nexora.cinematic.motion.paused";

const DEFAULT_SCENE_STATE: SceneControlState = {
  motionPaused: false,
  soundOn: false,
};

let sceneState: SceneControlState = DEFAULT_SCENE_STATE;
let ambienceRef: Ambience | null = null;
let browserStateBootstrapped = false;

const subscribers = new Set<() => void>();

interface Ambience {
  context: AudioContext;
  master: GainNode;
  nodes: OscillatorNode[];
}

type AudioCtor = typeof AudioContext;

function getSceneSnapshot(): SceneControlState {
  return sceneState;
}

function getServerSceneSnapshot(): SceneControlState {
  return DEFAULT_SCENE_STATE;
}

function notifySceneSubscribers(): void {
  subscribers.forEach((listener) => listener());
}

function applyMotionState(motionPaused: boolean): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.nxMotion = motionPaused ? "paused" : "running";
}

function readStoredMotionPreference(): boolean | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.localStorage.getItem(MOTION_STORAGE_KEY);
    if (stored === null) return null;
    return stored === "true";
  } catch {
    return null;
  }
}

function writeStoredMotionPreference(motionPaused: boolean): boolean {
  if (typeof window === "undefined") return false;

  try {
    const serialized = String(motionPaused);
    window.localStorage.setItem(MOTION_STORAGE_KEY, serialized);
    return window.localStorage.getItem(MOTION_STORAGE_KEY) === serialized;
  } catch {
    return false;
  }
}

function setSceneState(next: SceneControlState): void {
  sceneState = next;
  applyMotionState(next.motionPaused);
  notifySceneSubscribers();
}

function bootstrapBrowserSceneState(): void {
  if (browserStateBootstrapped || typeof window === "undefined") return;

  browserStateBootstrapped = true;

  const storedMotionPreference = readStoredMotionPreference();
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const next = {
    motionPaused: storedMotionPreference ?? prefersReducedMotion,
    soundOn: ambienceRef !== null,
  };

  sceneState = next;
  applyMotionState(next.motionPaused);

  window.requestAnimationFrame(notifySceneSubscribers);
}

function subscribeSceneState(listener: () => void): () => void {
  subscribers.add(listener);
  bootstrapBrowserSceneState();

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const onPreferenceChange = (event: MediaQueryListEvent) => {
    if (!event.matches) return;

    const next = {
      ...sceneState,
      motionPaused: true,
    };

    writeStoredMotionPreference(next.motionPaused);
    setSceneState(next);
  };

  const onStorage = (event: StorageEvent) => {
    if (event.key !== MOTION_STORAGE_KEY) return;

    setSceneState({
      ...sceneState,
      motionPaused: event.newValue === "true",
    });
  };

  reducedMotion.addEventListener("change", onPreferenceChange);
  window.addEventListener("storage", onStorage);

  return () => {
    subscribers.delete(listener);
    reducedMotion.removeEventListener("change", onPreferenceChange);
    window.removeEventListener("storage", onStorage);
  };
}

function createAmbience(): Ambience | null {
  const scope = window as Window & {
    AudioContext?: AudioCtor;
    webkitAudioContext?: AudioCtor;
  };
  const Ctor = scope.AudioContext ?? scope.webkitAudioContext;
  if (!Ctor) return null;

  const context = new Ctor();

  const master = context.createGain();
  master.gain.setValueAtTime(0.0001, context.currentTime);
  master.connect(context.destination);

  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(340, context.currentTime);
  filter.Q.setValueAtTime(0.6, context.currentTime);
  filter.connect(master);

  const nodes = [55, 82.41, 110].map((frequency, index) => {
    const oscillator = context.createOscillator();
    oscillator.type = index === 2 ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    oscillator.detune.setValueAtTime(index === 1 ? -6 : 4, context.currentTime);

    const voiceGain = context.createGain();
    voiceGain.gain.setValueAtTime(index === 2 ? 0.18 : 0.5, context.currentTime);

    oscillator.connect(voiceGain);
    voiceGain.connect(filter);
    oscillator.start();
    return oscillator;
  });

  const breath = context.createOscillator();
  breath.frequency.setValueAtTime(0.07, context.currentTime);
  const breathDepth = context.createGain();
  breathDepth.gain.setValueAtTime(0.012, context.currentTime);
  breath.connect(breathDepth);
  breathDepth.connect(master.gain);
  breath.start();
  nodes.push(breath);

  master.gain.exponentialRampToValueAtTime(0.045, context.currentTime + 2.2);

  return { context, master, nodes };
}

function disposeAmbience(ambience: Ambience): void {
  const { context, master, nodes } = ambience;
  const now = context.currentTime;

  try {
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(0.0001, now);
  } catch {
    // A closing context can reject scheduling.
  }

  nodes.forEach((node) => {
    try {
      node.stop();
    } catch {
      // Already stopped.
    }
    node.disconnect();
  });

  master.disconnect();
  void context.close().catch(() => undefined);
}

function startAmbience(): boolean {
  if (typeof window === "undefined") return false;

  if (ambienceRef) {
    void ambienceRef.context.resume().catch(() => undefined);
    return true;
  }

  const ambience = createAmbience();
  if (!ambience) return false;

  ambienceRef = ambience;
  void ambience.context.resume().catch(() => undefined);
  return true;
}

function stopAmbience(): void {
  if (!ambienceRef) return;
  disposeAmbience(ambienceRef);
  ambienceRef = null;
}

export function useCinematicSceneControls() {
  const state = useSyncExternalStore(
    subscribeSceneState,
    getSceneSnapshot,
    getServerSceneSnapshot,
  );

  const toggleMotion = useCallback(() => {
    const next = {
      ...sceneState,
      motionPaused: !sceneState.motionPaused,
    };

    const persisted = writeStoredMotionPreference(next.motionPaused);
    setSceneState(next);
    return persisted;
  }, []);

  const toggleSound = useCallback(() => {
    if (sceneState.soundOn) {
      stopAmbience();
      setSceneState({ ...sceneState, soundOn: false });
      return;
    }

    const started = startAmbience();
    setSceneState({ ...sceneState, soundOn: started });
  }, []);

  return {
    motionPaused: state.motionPaused,
    soundOn: state.soundOn,
    toggleMotion,
    toggleSound,
  };
}

export default function CinematicSceneControls({
  className,
  showMotion = true,
  soundIconOnly = false,
}: CinematicSceneControlsProps) {
  const { motionPaused, soundOn, toggleMotion, toggleSound } = useCinematicSceneControls();

  return (
    <div className={`${styles.sceneControlGroup}${className ? ` ${className}` : ""}`}>
      <button
        type="button"
        aria-label={soundOn ? "Turn cinematic sound off" : "Turn cinematic sound on"}
        aria-pressed={soundOn}
        title={soundOn ? "Turn sound off" : "Turn sound on"}
        className={soundOn ? `${styles.sceneControlButton} ${styles.sceneControlOn}` : styles.sceneControlButton}
        onClick={toggleSound}
      >
        <span className={styles.sceneControlIcon} aria-hidden="true">
          {soundOn ? "🔊" : "🔇"}
        </span>
        {soundIconOnly ? null : <span>{soundOn ? "Sound on" : "Sound off"}</span>}
      </button>

      {showMotion ? (
        <button
          type="button"
          aria-label={motionPaused ? "Resume cinematic motion" : "Pause cinematic motion"}
          aria-pressed={motionPaused}
          title={motionPaused ? "Resume motion" : "Pause motion"}
          className={motionPaused ? `${styles.sceneControlButton} ${styles.sceneControlOn}` : styles.sceneControlButton}
          onClick={toggleMotion}
        >
          {motionPaused ? "Motion paused" : "Pause motion"}
        </button>
      ) : null}
    </div>
  );
}
