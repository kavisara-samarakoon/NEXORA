"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  EMPTY_HOME_FEED,
  loadHomeFeed,
  type HomeFeedData,
  type HomeFeedErrors,
} from "../lib/homeFeed";

export type FeedStatus = "loading" | "ready" | "error";

interface HomeSceneValue {
  /* data */
  status: FeedStatus;
  data: HomeFeedData;
  errors: HomeFeedErrors;
  reload: () => void;
  /* scene controls */
  motionPaused: boolean;
  toggleMotion: () => void;
  soundOn: boolean;
  toggleSound: () => void;
}

const NO_ERRORS: HomeFeedErrors = { deals: false, giveaways: false, summary: false };

const HomeSceneContext = createContext<HomeSceneValue | null>(null);

export function useHomeScene(): HomeSceneValue {
  const context = useContext(HomeSceneContext);
  if (!context) {
    throw new Error("useHomeScene must be used inside <HomeSceneProvider>.");
  }
  return context;
}

/* ─── Ambience: generated with the Web Audio API, no audio files ─────── */

interface Ambience {
  context: AudioContext;
  master: GainNode;
  nodes: OscillatorNode[];
}

type AudioCtor = typeof AudioContext;

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

  // Low, slow drone. Three detuned voices reading as one warm pad.
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

  // Very slow breathing movement on the whole pad.
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

function disposeAmbience(ambience: Ambience) {
  const { context, master, nodes } = ambience;
  const now = context.currentTime;
  try {
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
  } catch {
    /* a closing context can reject scheduling — safe to ignore */
  }
  window.setTimeout(() => {
    nodes.forEach((node) => {
      try {
        node.stop();
      } catch {
        /* already stopped */
      }
      node.disconnect();
    });
    master.disconnect();
    void context.close().catch(() => undefined);
  }, 600);
}

/* ─── Provider ───────────────────────────────────────────────────────── */

export default function HomeSceneProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<FeedStatus>("loading");
  const [data, setData] = useState<HomeFeedData>(EMPTY_HOME_FEED);
  const [errors, setErrors] = useState<HomeFeedErrors>(NO_ERRORS);
  const [attempt, setAttempt] = useState(0);

  const [motionPaused, setMotionPaused] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const ambienceRef = useRef<Ambience | null>(null);

  /* Feed */
  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    loadHomeFeed(controller.signal)
      .then((result) => {
        if (!active) return;
        setData(result.data);
        setErrors(result.errors);
        const allFailed = result.errors.deals && result.errors.giveaways && result.errors.summary;
        setStatus(allFailed ? "error" : "ready");
      })
      .catch(() => {
        if (!active) return;
        setData(EMPTY_HOME_FEED);
        setErrors({ deals: true, giveaways: true, summary: true });
        setStatus("error");
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [attempt]);

  const reload = useCallback(() => {
    setStatus("loading");
    setAttempt((value) => value + 1);
  }, []);

  /* Motion: start paused when the OS asks for reduced motion */
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const frame = window.requestAnimationFrame(() => setMotionPaused(query.matches));

    const onChange = (event: MediaQueryListEvent) => setMotionPaused(event.matches);
    query.addEventListener("change", onChange);
    return () => {
      window.cancelAnimationFrame(frame);
      query.removeEventListener("change", onChange);
    };
  }, []);

  /* Expose motion state to CSS (page.module.css pauses keyframes off this) */
  useEffect(() => {
    document.documentElement.dataset.nxMotion = motionPaused ? "paused" : "running";
    return () => {
      delete document.documentElement.dataset.nxMotion;
    };
  }, [motionPaused]);

  const toggleMotion = useCallback(() => setMotionPaused((value) => !value), []);

  /* Sound: never autoplays — only ever starts from this click handler */
  const toggleSound = useCallback(() => {
    setSoundOn((wasOn) => {
      if (wasOn) {
        if (ambienceRef.current) {
          disposeAmbience(ambienceRef.current);
          ambienceRef.current = null;
        }
        return false;
      }

      const ambience = createAmbience();
      if (!ambience) return false;
      ambienceRef.current = ambience;
      void ambience.context.resume().catch(() => undefined);
      return true;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (ambienceRef.current) {
        disposeAmbience(ambienceRef.current);
        ambienceRef.current = null;
      }
    };
  }, []);

  const value = useMemo<HomeSceneValue>(
    () => ({
      status,
      data,
      errors,
      reload,
      motionPaused,
      toggleMotion,
      soundOn,
      toggleSound,
    }),
    [status, data, errors, reload, motionPaused, toggleMotion, soundOn, toggleSound],
  );

  return <HomeSceneContext.Provider value={value}>{children}</HomeSceneContext.Provider>;
}
