"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import { observeSceneVisibility } from "../lib/scene-visibility";
import NexoraDiscoveryCoreFallback from "./NexoraDiscoveryCoreFallback";
import { useHomeScene } from "./HomeSceneProvider";
import styles from "./cinematic.module.css";

/* ─────────────────────────────────────────────────────────────
 * OPTION B — running without three / @react-three/fiber:
 *   1. set ENABLE_WEBGL_CORE to false
 *   2. delete the `DiscoveryCore3D` constant below
 *   3. delete the `<DiscoveryCore3D … />` branch in the return
 *   4. do not copy NexoraDiscoveryCore3D.tsx into your repo
 * The CSS/SVG core then runs everywhere, with no new dependencies.
 * ───────────────────────────────────────────────────────────── */

const ENABLE_WEBGL_CORE = true;

// [OPTION B] delete this constant
const DiscoveryCore3D = dynamic(() => import("./NexoraDiscoveryCore3D"), {
  ssr: false,
  loading: () => <NexoraDiscoveryCoreFallback />,
});

type Quality = "high" | "low";

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl2") ?? canvas.getContext("webgl")),
    );
  } catch {
    return false;
  }
}

function detectQuality(): Quality {
  const wideEnough = window.matchMedia("(min-width: 900px)").matches;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  return wideEnough && !coarsePointer ? "high" : "low";
}

export default function DiscoveryCoreMount() {
  const { motionPaused } = useHomeScene();
  const hostRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const paused = motionPaused || !visible;
  const [webglReady, setWebglReady] = useState(false);
  const [quality, setQuality] = useState<Quality>("low");

  useEffect(() => {
    const host = hostRef.current;
    if (host) return observeSceneVisibility(host, setVisible);
  }, []);

  useEffect(() => {
    if (!ENABLE_WEBGL_CORE) return;
    if (!supportsWebGL()) return;

    const frame = window.requestAnimationFrame(() => {
      setQuality(detectQuality());
      setWebglReady(true);
    });

    const media = window.matchMedia("(min-width: 900px)");
    const pointer = window.matchMedia("(pointer: coarse)");
    const onChange = () => setQuality(detectQuality());
    media.addEventListener("change", onChange);
    pointer.addEventListener("change", onChange);
    return () => {
      window.cancelAnimationFrame(frame);
      media.removeEventListener("change", onChange);
      pointer.removeEventListener("change", onChange);
    };
  }, []);

  return (
    <div ref={hostRef} className={styles.canvasHost} data-nx-core-motion={paused ? "idle" : "active"}>
      {webglReady ? (
        // [OPTION B] delete this branch and render the fallback directly
        <DiscoveryCore3D quality={quality} paused={paused} />
      ) : (
        <NexoraDiscoveryCoreFallback />
      )}
    </div>
  );
}
