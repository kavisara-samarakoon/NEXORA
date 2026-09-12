import styles from "./cinematic.module.css";

/** NEXORA Glass Rift Mark: server-rendered SVG counterpart to the three glass prisms. */
type Point = readonly [number, number];

const SHARDS: ReadonlyArray<{ id: string; outline: readonly Point[]; seam: readonly Point[]; facet: readonly Point[]; rim: readonly [number, number] }> = [
  {
    id: "ascending-arm",
    outline: [[-2, -0.25], [-1.82, 0.06], [-1.1, 0.06], [-0.08, 1.86], [0.02, 1.94],
      [0.18, 1.63], [-0.72, 0.06], [-0.05, 0.06], [-0.22, -0.25]],
    rim: [2, 3],
    seam: [[-1.79, -0.18], [-0.99, -0.18], [-0.01, 1.58]],
    facet: [[-1.02, 0.05], [-0.04, 1.72], [-0.79, 0.05], [-0.17, -0.18]],
  },
  {
    id: "descending-arm",
    outline: [[0.12, 0.27], [0.98, 1.8], [1.08, 1.85], [1.24, 1.55], [0.91, 0.96],
      [2.02, -0.94], [1.65, -0.94], [0.71, 0.57], [0.35, -0.05]],
    rim: [4, 5],
    seam: [[1.08, 1.58], [0.77, 1.02], [0.84, 0.85], [1.85, -0.85]],
    facet: [[0.9, 0.84], [1.91, -0.85], [1.74, -0.85]],
  },
  {
    id: "lower-arm",
    outline: [[-1.52, -1.28], [-1.34, -0.95], [0.37, -0.95], [0.42, -0.91],
      [0.1, -0.37], [0.48, -0.37], [1.37, -1.92], [0.98, -1.92], [0.6, -1.28]],
    rim: [0, 8],
    seam: [[-1.32, -1.19], [0.64, -1.19], [1.08, -1.84]],
    facet: [[-1.36, -1.19], [0.56, -1.02], [0.3, -0.46], [1.22, -1.83], [0.65, -1.19]],
  },
];

const PARTICLES = [[94, 174], [363, 152], [85, 353], [387, 384], [157, 86], [336, 487], [403, 254], [113, 450]];
const points = (outline: readonly Point[]) => outline.map(([x, y]) => `${x},${y}`).join(" ");

export default function NexoraDiscoveryCoreFallback() {
  return (
    <div className={styles.fallback}>
      <svg
        className={styles.fallbackSvg}
        viewBox="0 0 480 560"
        preserveAspectRatio="xMidYMid meet"
        role="presentation"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id="nxRiftGlass" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ECF5FF" stopOpacity="0.48" />
            <stop offset="24%" stopColor="#8595B0" stopOpacity="0.13" />
            <stop offset="55%" stopColor="#262536" stopOpacity="0.18" />
            <stop offset="78%" stopColor="#E7BC94" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#BBD8F7" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="nxRiftEdge" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.88" />
            <stop offset="42%" stopColor="#B2B6C7" stopOpacity="0.48" />
            <stop offset="100%" stopColor="#4D4B56" stopOpacity="0.12" />
          </linearGradient>
          <linearGradient id="nxRiftSeam" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#FF6520" />
            <stop offset="46%" stopColor="#FFD6A0" />
            <stop offset="100%" stopColor="#FF780E" />
          </linearGradient>
          <radialGradient id="nxRiftGlow">
            <stop offset="0%" stopColor="#FF9C41" stopOpacity="0.72" />
            <stop offset="32%" stopColor="#FF550C" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#FF4100" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="nxRiftVeil" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F4FAFF" stopOpacity="0.5" />
            <stop offset="35%" stopColor="#B3CDEB" stopOpacity="0.08" />
            <stop offset="70%" stopColor="#FFA969" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#E2F2FF" stopOpacity="0.35" />
          </linearGradient>
          <clipPath id="nxRiftVeilClip">
            {SHARDS.map((shard) => <polygon key={shard.id} points={points(shard.outline)} />)}
          </clipPath>
        </defs>

        <g className={styles.fallbackStage}>
          <g transform="translate(240 280) scale(85 -85)">
            <ellipse className={styles.riftGlow} cx="0" cy="-2.28" rx="1.3" ry="0.17" fill="url(#nxRiftGlow)" />
            <path d="M-2 -1.72 Q-0.7 -0.9 1.8 -1.67" fill="none" stroke="#D8BEA4" strokeOpacity="0.12" strokeWidth="0.01" />
          </g>

          <g className={styles.fbFloat}>
            <g transform="translate(240 280) scale(85 -85)">
              <g opacity="0.2">
                <ellipse className={styles.riftGlow} cx="-0.15" cy="0" rx="1.3" ry="1.6" fill="url(#nxRiftGlow)" />
              </g>
              <path className={styles.riftCharge} d="M-1.9 -0.3 Q-0.5 0.35 1.8 -0.08" fill="none" stroke="#FFAA68" strokeWidth="0.013" />

              {/* Thin graphite sidewalls frame translucent faces; no opaque backing. */}
              {SHARDS.map((shard) => {
                const [start, end] = shard.rim.map((index) => shard.outline[index]);
                return (
                  <g key={shard.id}>
                    <polygon points={points(shard.outline)} transform="translate(0.09 0.07)"
                      fill="none" stroke="#303948" strokeWidth="0.065" strokeLinejoin="bevel" />
                    {shard.outline.map(([x, y], index) => {
                      const [nextX, nextY] = shard.outline[(index + 1) % shard.outline.length];
                      return <polygon key={index}
                        points={points([[x, y], [nextX, nextY], [nextX + 0.09, nextY + 0.07], [x + 0.09, y + 0.07]])}
                        fill={index % 2 === 0 ? "#586477" : "#202732"} fillOpacity="0.85" />;
                    })}
                    <g className={styles.riftGlow} fill="none" strokeLinejoin="bevel">
                      <polyline points={points(shard.seam)} stroke="#FF701A" strokeWidth="0.085" strokeOpacity="0.35" />
                      <polyline points={points(shard.seam)} stroke="url(#nxRiftSeam)" strokeWidth="0.02" />
                    </g>
                    <polygon points={points(shard.outline)} fill="url(#nxRiftGlass)"
                      stroke="url(#nxRiftEdge)" strokeWidth="0.012" strokeLinejoin="bevel" />
                    <polygon points={points(shard.facet)} fill="url(#nxRiftVeil)" fillOpacity="0.5"
                      stroke="#DBE9F7" strokeWidth="0.006" strokeOpacity="0.24" />
                    <polyline points={points([start, end])} fill="none" stroke="#EFF7FF" strokeWidth="0.015" strokeOpacity="0.8" />
                  </g>
                );
              })}
              <g clipPath="url(#nxRiftVeilClip)">
                <path className={styles.riftReflection} d="M-2.5 1 L2.6 -0.7" fill="none" stroke="#F5FAFF" strokeWidth="0.18" />
              </g>
              <path className={styles.riftCharge} d="M0.28 -0.44 L0.48 -0.76 L0.5 -0.9 L0.7 -1.17 L0.71 -1.29 L1.08 -1.83"
                fill="none" stroke="#FFD2A0" strokeWidth="0.012" />
              <path d="M1.13 1.5 L0.86 1.02 L1.05 0.7" fill="none" stroke="#00BDE9" strokeOpacity="0.34" strokeWidth="0.009" />
              <path className={styles.riftPulse} d="M1.13 1.5 L0.86 1.02 L1.05 0.7"
                pathLength="100" fill="none" stroke="#A3F2FF" strokeWidth="0.021" strokeDasharray="8 92" />
            </g>
          </g>

          <g fill="#EBD2B8">
            {PARTICLES.map(([cx, cy], index) => (
              <circle key={index} cx={cx} cy={cy} r="1" className={index % 2 === 0 ? styles.fbTwinkle : styles.fbTwinkleB} />
            ))}
          </g>
        </g>
      </svg>
    </div>
  );
}
