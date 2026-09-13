"use client";

import { useCallback, useEffect, useState } from "react";

import styles from "./cinematic.module.css";

type SceneControlState = {
  motionPaused: boolean;
  soundOn: boolean;
};

type SceneControlEvent = CustomEvent<SceneControlState>;

type CinematicSceneControlsProps = {
  className?: string;
  showMotion?: boolean;
  soundIconOnly?: boolean;
};

const MOTION_STORAGE_KEY = "nexora.cinematic.motion.paused";
const SCENE_CONTROL_EVENT = "nexora:cinematic-scene-controls-change";

let ambienceRef: Ambience | null = null;

interface Ambience {
  context: AudioContext;
  master: GainNode;
  nodes: OscillatorNode[];
}

type AudioCtor = typeof AudioContext;

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

function readInitialSceneControlState(): SceneControlState {
  if (typeof window === "undefined") {
    return { motionPaused: false, soundOn: false };
  }

  const storedMotionPreference = readStoredMotionPreference();
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return {
    motionPaused: storedMotionPreference ?? prefersReducedMotion,
    soundOn: ambienceRef !== null,
  };
}

function dispatchSceneControlState(state: SceneControlState): void {
  window.dispatchEvent(new CustomEvent<SceneControlState>(SCENE_CONTROL_EVENT, { detail: state }));
}

function applyMotionState(motionPaused: boolean): void {
  document.documentElement.dataset.nxMotion = motionPaused ? "paused" : "running";
}

function writeStoredMotionPreference(motionPaused: boolean): void {
  try {
    window.localStorage.setItem(MOTION_STORAGE_KEY, String(motionPaused));
  } catch {
    // Motion control still works for the current page when localStorage is blocked.
  }
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
  const [state, setState] = useState<SceneControlState>(() => readInitialSceneControlState());

  useEffect(() => {
    applyMotionState(state.motionPaused);
  }, [state.motionPaused]);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const onPreferenceChange = (event: MediaQueryListEvent) => {
      if (!event.matches) return;

      const next = {
        motionPaused: true,
        soundOn: ambienceRef !== null,
      };

      writeStoredMotionPreference(next.motionPaused);
      setState(next);
      dispatchSceneControlState(next);
    };

    const onSceneControlChange = (event: Event) => {
      const detail = (event as SceneControlEvent).detail;
      if (!detail) return;
      setState(detail);
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== MOTION_STORAGE_KEY) return;

      setState({
        motionPaused: event.newValue === "true",
        soundOn: ambienceRef !== null,
      });
    };

    reducedMotion.addEventListener("change", onPreferenceChange);
    window.addEventListener(SCENE_CONTROL_EVENT, onSceneControlChange);
    window.addEventListener("storage", onStorage);

    return () => {
      reducedMotion.removeEventListener("change", onPreferenceChange);
      window.removeEventListener(SCENE_CONTROL_EVENT, onSceneControlChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const publishState = useCallback((next: SceneControlState) => {
    setState(next);
    dispatchSceneControlState(next);
  }, []);

  const toggleMotion = useCallback(() => {
    const next = {
      ...state,
      motionPaused: !state.motionPaused,
    };

    writeStoredMotionPreference(next.motionPaused);
    publishState(next);
  }, [publishState, state]);

  const toggleSound = useCallback(() => {
    if (state.soundOn) {
      stopAmbience();
      publishState({ ...state, soundOn: false });
      return;
    }

    const started = startAmbience();
    publishState({ ...state, soundOn: started });
  }, [publishState, state]);

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
          aria-pressed={motionPaused}
          className={motionPaused ? `${styles.sceneControlButton} ${styles.sceneControlOn}` : styles.sceneControlButton}
          onClick={toggleMotion}
        >
          {motionPaused ? "Motion paused" : "Pause motion"}
        </button>
      ) : null}
    </div>
  );
}
