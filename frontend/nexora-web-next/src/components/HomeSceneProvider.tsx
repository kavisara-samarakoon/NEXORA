"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  EMPTY_HOME_FEED,
  loadHomeFeed,
  type HomeFeedData,
  type HomeFeedErrors,
} from "../lib/homeFeed";
import { useCinematicSceneControls } from "./CinematicSceneControls";

export type FeedStatus = "loading" | "ready" | "error";

interface HomeSceneValue {
  /* data */
  status: FeedStatus;
  data: HomeFeedData;
  errors: HomeFeedErrors;
  reload: () => void;
  motionPaused: boolean;
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

/* ─── Provider ───────────────────────────────────────────────────────── */

export default function HomeSceneProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<FeedStatus>("loading");
  const [data, setData] = useState<HomeFeedData>(EMPTY_HOME_FEED);
  const [errors, setErrors] = useState<HomeFeedErrors>(NO_ERRORS);
  const [attempt, setAttempt] = useState(0);
  const controls = useCinematicSceneControls();
  const motionPaused = controls.motionPaused || controls.reducedMotion;


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


  const value = useMemo<HomeSceneValue>(
    () => ({
      status,
      data,
      errors,
      reload,
      motionPaused,
    }),
    [status, data, errors, reload, motionPaused],
  );

  return <HomeSceneContext.Provider value={value}>{children}</HomeSceneContext.Provider>;
}
