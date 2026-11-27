"use client";

import { useCallback, useSyncExternalStore } from "react";

import {
  getServerDevicePreferencesSnapshot,
  readStoredDevicePreferencesSnapshot,
  subscribeDevicePreferences,
  toggleDeviceMotionPause,
} from "../lib/device-preferences";
import styles from "./cinematic.module.css";

type CinematicSceneControlsProps = {
  className?: string;
  showMotion?: boolean;
  soundIconOnly?: boolean;
};

let ambienceRef: Ambience | null = null;
const soundSubscribers = new Set<() => void>();

interface Ambience {
  context: AudioContext;
  master: GainNode;
  nodes: OscillatorNode[];
}

type AudioCtor = typeof AudioContext;

function subscribeSound(listener: () => void) {
  soundSubscribers.add(listener);
  return () => { soundSubscribers.delete(listener); };
}

const getSound = () => ambienceRef !== null;
const getServerSound = () => false;

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
  const { motionPaused, reducedMotion } = useSyncExternalStore(
    subscribeDevicePreferences,
    readStoredDevicePreferencesSnapshot,
    getServerDevicePreferencesSnapshot,
  );
  const soundOn = useSyncExternalStore(subscribeSound, getSound, getServerSound);

  const toggleSound = useCallback(() => {
    if (ambienceRef) stopAmbience();
    else startAmbience();
    soundSubscribers.forEach((notify) => notify());
  }, []);

  return {
    motionPaused,
    reducedMotion,
    soundOn,
    toggleMotion: toggleDeviceMotionPause,
    toggleSound,
  };
}

export default function CinematicSceneControls({
  className,
  showMotion = true,
  soundIconOnly = false,
}: CinematicSceneControlsProps) {
  const { motionPaused, reducedMotion, soundOn, toggleMotion, toggleSound } = useCinematicSceneControls();

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
          title={reducedMotion ? "System reduced motion is active" : motionPaused ? "Resume motion" : "Pause motion"}
          className={motionPaused ? `${styles.sceneControlButton} ${styles.sceneControlOn}` : styles.sceneControlButton}
          onClick={toggleMotion}
        >
          {motionPaused ? "Motion paused" : reducedMotion ? "Pause motion on this device" : "Pause motion"}
        </button>
      ) : null}
    </div>
  );
}
