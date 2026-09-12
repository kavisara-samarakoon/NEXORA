"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type ReactNode, type RefObject } from "react";
import * as THREE from "three";

/** NEXORA Glass Rift Mark: procedural glass prisms inspired by the local shape reference. No model assets. */
export type CoreQuality = "high" | "low";

interface CoreProps {
  quality: CoreQuality;
  paused: boolean;
}

type Point2 = readonly [number, number];
type Point3 = readonly [number, number, number];
type CoreCursor = RefObject<{ x: number; y: number; proximity: number }>;

interface ShardSpec {
  id: string;
  outline: readonly Point2[];
  depth: number;
  z: number;
  rotation: [number, number, number];
  rim: readonly [number, number];
  seam: readonly Point2[];
  facet: readonly Point2[];
}

// Three separated, interlocking arms retain the reference's triangular rift.
// Thin extrusions and staggered depth turn its flat silhouette into an emblem.
const SHARDS: readonly ShardSpec[] = [
  {
    id: "ascending-arm",
    outline: [[-2, -0.25], [-1.82, 0.06], [-1.1, 0.06], [-0.08, 1.86], [0.02, 1.94],
      [0.18, 1.63], [-0.72, 0.06], [-0.05, 0.06], [-0.22, -0.25]],
    depth: 0.34, z: 0.12, rotation: [0.025, -0.045, -0.012], rim: [2, 3],
    seam: [[-1.79, -0.18], [-0.99, -0.18], [-0.01, 1.58]],
    facet: [[-1.02, 0.05], [-0.04, 1.72], [-0.79, 0.05], [-0.17, -0.18]],
  },
  {
    id: "descending-arm",
    outline: [[0.12, 0.27], [0.98, 1.8], [1.08, 1.85], [1.24, 1.55], [0.91, 0.96],
      [2.02, -0.94], [1.65, -0.94], [0.71, 0.57], [0.35, -0.05]],
    depth: 0.4, z: -0.32, rotation: [-0.03, 0.065, 0.012], rim: [4, 5],
    seam: [[1.08, 1.58], [0.77, 1.02], [0.84, 0.85], [1.85, -0.85]],
    facet: [[0.9, 0.84], [1.91, -0.85], [1.74, -0.85]],
  },
  {
    id: "lower-arm",
    outline: [[-1.52, -1.28], [-1.34, -0.95], [0.37, -0.95], [0.42, -0.91],
      [0.1, -0.37], [0.48, -0.37], [1.37, -1.92], [0.98, -1.92], [0.6, -1.28]],
    depth: 0.32, z: 0.38, rotation: [0.045, -0.04, 0.005], rim: [0, 8],
    seam: [[-1.32, -1.19], [0.64, -1.19], [1.08, -1.84]],
    facet: [[-1.36, -1.19], [0.56, -1.02], [0.3, -0.46], [1.22, -1.83], [0.65, -1.19]],
  },
];

function makeShardGeometry(outline: readonly Point2[], depth: number, bevel: number) {
  const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    curveSegments: 1,
    bevelEnabled: bevel > 0,
    bevelSegments: 1,
    bevelSize: bevel,
    bevelThickness: bevel,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

// A single damped pointer sample drives the sculpture, atmosphere and light.
// Window events still arrive while the decorative canvas ignores pointer hits.
function useCoreCursor(paused: boolean): CoreCursor {
  const gl = useThree((state) => state.gl);
  const camera = useThree((state) => state.camera);
  const target = useRef({ x: 0, y: 0, proximity: 0 });
  const cursor = useRef({ x: 0, y: 0, proximity: 0 });
  useEffect(() => {
    if (paused) return;
    const origin = new THREE.Vector3();
    const reset = () => { target.current = { x: 0, y: 0, proximity: 0 }; };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const rect = gl.domElement.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      origin.set(0, 0, 0).project(camera);
      const centerX = rect.left + (origin.x + 1) * rect.width / 2;
      const centerY = rect.top + (1 - origin.y) * rect.height / 2;
      const x = (event.clientX - centerX) / (rect.width / 2);
      const y = (event.clientY - centerY) / (rect.height / 2);
      target.current = {
        x: THREE.MathUtils.clamp(x, -1, 1),
        y: THREE.MathUtils.clamp(y, -1, 1),
        proximity: Math.max(0, 1 - Math.hypot(x * 1.3, y)),
      };
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("blur", reset);
    document.documentElement.addEventListener("pointerleave", reset);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("blur", reset);
      document.documentElement.removeEventListener("pointerleave", reset);
    };
  }, [gl, camera, paused]);
  useFrame((_, delta) => {
    if (paused) return;
    const step = Math.min(delta, 0.05);
    for (const key of ["x", "y", "proximity"] as const) {
      cursor.current[key] = THREE.MathUtils.damp(cursor.current[key], target.current[key], 12, step);
    }
  }, -1);
  return cursor;
}

// Bake small studio light cards once, rather than render reflection passes per frame.
function StudioReflections({ quality }: { quality: CoreQuality }) {
  const gl = useThree((state) => state.gl);
  const get = useThree((state) => state.get);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    const scene = get().scene;
    const studio = new THREE.Scene();
    studio.background = new THREE.Color("#0C1016");
    const cards: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = [];
    const card = (width: number, height: number, position: Point3, color: string, strength: number) => {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(width, height),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(strength), side: THREE.DoubleSide }),
      );
      mesh.position.set(...position);
      mesh.lookAt(0, 0, 0);
      studio.add(mesh);
      cards.push(mesh);
    };
    card(0.65, 7, [-3, 2, 4], "#FFFFFF", 2.8);
    card(0.35, 6, [3, 1, 2], "#DCEAFF", 2.4);
    card(3, 0.4, [0, 5, -1], "#FFFFFF", 2.8);
    card(0.4, 6, [2.5, 1, -4], "#F1F6FF", 3.2);
    card(1, 2.4, [-2, -2, -3], "#FF731F", 1.1);
    const generator = new THREE.PMREMGenerator(gl);
    const environment = generator.fromScene(studio, 0.025, 0.1, 30, { size: quality === "high" ? 128 : 64 });
    const previous = scene.environment;
    scene.environment = environment.texture;
    generator.dispose();
    cards.forEach((mesh) => { mesh.geometry.dispose(); mesh.material.dispose(); });
    invalidate();
    return () => { scene.environment = previous; environment.dispose(); };
  }, [gl, get, quality, invalidate]);
  return null;
}

/* A full turn is layered beneath pointer motion, with no reset when paused. */
function Rig({ paused, quality, cursor, children }: CoreProps & { cursor: CoreCursor; children: ReactNode }) {
  const outer = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const phase = useRef(0);
  const turn = useRef(0);

  useFrame((_, delta) => {
    if (paused) return;
    // Cap a background-tab delta so returning to the page never jumps the pose.
    const step = Math.min(delta, 0.05);
    const mobile = quality === "low";
    const cycleSeconds = mobile ? 132 : 96;
    phase.current += step;
    turn.current = (turn.current + step * Math.PI * 2 / cycleSeconds) % (Math.PI * 2);
    const response = mobile ? 0.55 : 1;
    if (outer.current) {
      outer.current.rotation.y = cursor.current.x * 0.56 * response;
      outer.current.rotation.x = cursor.current.y * 0.28 * response;
      outer.current.position.x = cursor.current.x * 0.27 * response;
      outer.current.position.y = -cursor.current.y * 0.14 * response;
    }
    if (inner.current) {
      inner.current.rotation.y = -0.34 + turn.current;
      inner.current.rotation.x = 0.16 + Math.sin(phase.current * 0.15) * (mobile ? 0.02 : 0.035);
      inner.current.rotation.z = -0.045 + Math.sin(phase.current * 0.18) * 0.018;
      inner.current.position.y = Math.sin(phase.current * 0.4) * (mobile ? 0.055 : 0.09);
    }
  });

  return (
    <group ref={outer} name="rift-cursor-rig">
      <group ref={inner} name="rift-rotation" rotation={[0.16, -0.34, -0.045]}>{children}</group>
    </group>
  );
}

function LightCut({ from, to, color, width = 0.012, intensity = 1, glow }: {
  from: Point3;
  to: Point3;
  color: string;
  width?: number;
  intensity?: number;
  glow?: THREE.Texture | null;
}) {
  const start = new THREE.Vector3(...from);
  const end = new THREE.Vector3(...to);
  const direction = end.clone().sub(start);
  const length = direction.length();
  const rotation = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0), direction.normalize(),
  );

  return (
    <group position={start.add(end).multiplyScalar(0.5)} quaternion={rotation}>
      <mesh>
        <boxGeometry args={[width, length, width]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={intensity} />
      </mesh>
      {glow ? (
        <mesh>
          <planeGeometry args={[width * 14, length + 0.08]} />
          <meshBasicMaterial map={glow} transparent opacity={0.6} depthWrite={false}
            side={THREE.DoubleSide} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
      ) : null}
    </group>
  );
}

function Shard({ spec, quality, paused, cursor, glow }: CoreProps & { spec: ShardSpec; cursor: CoreCursor; glow: THREE.Texture | null }) {
  const geometry = useMemo(() => makeShardGeometry(spec.outline, spec.depth, 0.04), [spec]);
  const edges = useMemo(() => new THREE.EdgesGeometry(geometry, 35), [geometry]);
  const energy = useRef<THREE.Group>(null);
  const phase = useRef(0);
  useEffect(() => () => { geometry.dispose(); edges.dispose(); }, [geometry, edges]);
  useFrame((_, delta) => {
    if (paused) return;
    phase.current += Math.min(delta, 0.05);
    energy.current?.traverse((object) => {
      if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshStandardMaterial) {
        object.material.emissiveIntensity = 2.2 + Math.sin(phase.current * 0.7) * 0.25 + cursor.current.proximity;
      }
    });
  });
  const [start, end] = spec.rim.map((index) => spec.outline[index]);
  const front = spec.depth / 2 + 0.045;

  return (
    <group name={`rift-arm-${spec.id}`} position={[0, 0, spec.z]} rotation={spec.rotation}>
      {/* Dark bevels provide structure while the front faces transmit the glow. */}
      <mesh geometry={geometry}>
        {quality === "high" ? (
          <meshPhysicalMaterial attach="material-0"
            color="#B2C3D2" metalness={0.04} roughness={0.045}
            transmission={0.72} transparent opacity={0.12} depthWrite={false}
            envMapIntensity={0.85} thickness={spec.depth} ior={1.42}
            attenuationColor="#FFD0A2" attenuationDistance={3}
            clearcoat={0.7} clearcoatRoughness={0.06} side={THREE.DoubleSide}
          />
        ) : (
          <meshStandardMaterial attach="material-0"
            color="#A7BECE" metalness={0.12} roughness={0.08}
            transparent opacity={0.11} depthWrite={false} envMapIntensity={1}
            side={THREE.DoubleSide}
          />
        )}
        <meshStandardMaterial attach="material-1"
          color="#303743" metalness={0.76} roughness={0.17} envMapIntensity={1.25}
        />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#DAE8F5" transparent opacity={0.3} depthWrite={false} />
      </lineSegments>
      <CrystalVeil spec={spec} paused={paused} />
      <LightCut from={[...start, front]} to={[...end, front]} color="#F3F7FF" width={0.016} intensity={1.1} />
      <LightCut from={[...start, -front]} to={[...end, -front]} color="#DCEFFF" width={0.012} intensity={0.75} />
      <group ref={energy}>
        {spec.seam.slice(1).map((point, index) => (
          <LightCut key={index} from={[...spec.seam[index], -0.015]} to={[...point, -0.015]}
            color="#FF6510" width={0.015} intensity={2.2} glow={glow} />
        ))}
      </group>
    </group>
  );
}

function CrystalVeil({ spec, paused }: { spec: ShardSpec; paused: boolean }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const context = canvas.getContext("2d");
    if (!context) return null;
    const gradient = context.createLinearGradient(0, 100, 128, 28);
    gradient.addColorStop(0, "rgba(255,255,255,0)");
    gradient.addColorStop(0.42, "rgba(255,255,255,0)");
    gradient.addColorStop(0.5, "rgba(236,247,255,0.72)");
    gradient.addColorStop(0.54, "rgba(255,255,255,0.1)");
    gradient.addColorStop(0.62, "rgba(255,255,255,0)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
    const result = new THREE.CanvasTexture(canvas);
    result.colorSpace = THREE.SRGBColorSpace;
    result.wrapS = THREE.RepeatWrapping;
    return result;
  }, []);
  const geometry = useMemo(() => {
    const shape = new THREE.Shape(spec.facet.map(([x, y]) => new THREE.Vector2(x, y)));
    const result = new THREE.ShapeGeometry(shape);
    const positions = result.getAttribute("position");
    const uv = result.getAttribute("uv");
    for (let index = 0; index < positions.count; index += 1) {
      positions.setZ(index, spec.depth / 2 + 0.05 + (index % 2) * 0.085);
      uv.setXY(index, (positions.getX(index) + 2.2) / 4.4, (positions.getY(index) + 2.2) / 4.4);
    }
    result.computeVertexNormals();
    return result;
  }, [spec]);
  useEffect(() => () => { geometry.dispose(); texture?.dispose(); }, [geometry, texture]);
  useFrame((_, delta) => {
    if (paused || !texture) return;
    texture.offset.setX((texture.offset.x + Math.min(delta, 0.05) * 0.065) % 1);
  });
  return (
    <group name="rift-crystal-veils">
      {[1, -1].map((side) => (
        <group key={side} scale={[1, 1, side]}>
          <mesh geometry={geometry}>
            <meshPhysicalMaterial
              color="#CBDDEC" metalness={0.08} roughness={0.055} envMapIntensity={0.85}
              transparent opacity={0.11} depthWrite={false} side={THREE.DoubleSide}
              clearcoat={1} clearcoatRoughness={0.06} flatShading
            />
          </mesh>
          {texture ? (
            <mesh geometry={geometry}>
              <meshBasicMaterial
                map={texture} transparent opacity={0.075} depthWrite={false} side={THREE.DoubleSide}
                blending={THREE.AdditiveBlending} polygonOffset polygonOffsetFactor={-1}
                toneMapped={false}
              />
            </mesh>
          ) : null}
        </group>
      ))}
    </group>
  );
}

function ContainedCharge({ paused, quality }: CoreProps) {
  const phase = useRef(0);
  const wave = useRef<THREE.Mesh>(null);
  const waveMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const boltMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const count = quality === "high" ? 10 : 5;
  const bolt = useMemo(() => {
    const path = new THREE.CurvePath<THREE.Vector3>();
    const points = [[0.28, -0.44, 0.32], [0.48, -0.76, 0.32], [0.5, -0.9, 0.32],
      [0.7, -1.17, 0.32], [0.71, -1.29, 0.32], [1.08, -1.83, 0.32]];
    points.slice(1).forEach((point, index) => path.add(new THREE.LineCurve3(
      new THREE.Vector3(...points[index]), new THREE.Vector3(...point),
    )));
    return new THREE.TubeGeometry(path, 32, 0.007, 3, false);
  }, []);
  const sparks = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (seededNoise(i + 40) - 0.5) * 3.3;
      positions[i * 3 + 1] = seededNoise(i + 70) * 3.3 - 1.7;
      positions[i * 3 + 2] = 0.25 + seededNoise(i + 90) * 0.5;
    }
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, [count]);
  useEffect(() => () => bolt.dispose(), [bolt]);
  useEffect(() => () => sparks.dispose(), [sparks]);
  useFrame((_, delta) => {
    if (paused) return;
    const step = Math.min(delta, 0.05);
    phase.current += step;
    const progress = (phase.current % 12) / 2.4;
    const burst = progress < 1 ? Math.sin(progress * Math.PI) ** 2 : 0;
    if (wave.current) wave.current.scale.set(1.35 + Math.min(progress, 1) * 0.55, 0.4 + Math.min(progress, 1) * 0.16, 1);
    if (waveMaterial.current) waveMaterial.current.opacity = burst * 0.07;
    if (boltMaterial.current) boltMaterial.current.opacity = 0.3 + burst * 0.5;
    const positions = sparks.getAttribute("position");
    for (let i = 0; i < count; i += 1) {
      positions.setY(i, ((seededNoise(i + 70) * 3.3 + phase.current * 0.065) % 3.3) - 1.7);
    }
    positions.needsUpdate = true;
  });
  return (
    <group name="rift-contained-charge">
      <mesh geometry={bolt}>
        <meshBasicMaterial ref={boltMaterial} color="#FFB36A" transparent opacity={0.3} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={wave} position={[0, -0.18, -0.75]} rotation={[0, 0, -0.3]} scale={[1.35, 0.4, 1]}>
        <ringGeometry args={[1.45, 1.46, 48, 1, 0.2, Math.PI * 1.55]} />
        <meshBasicMaterial ref={waveMaterial} color="#FFAA68" transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <points geometry={sparks}>
        <pointsMaterial color="#FFC08A" size={0.022} transparent opacity={0.64} depthWrite={false} toneMapped={false} />
      </points>
    </group>
  );
}

function RiftEnergy({ paused, cursor }: { paused: boolean; cursor: CoreCursor }) {
  const light = useRef<THREE.PointLight>(null);
  const phase = useRef(0);
  useFrame((_, delta) => {
    if (paused) return;
    phase.current += Math.min(delta, 0.05);
    if (light.current) light.current.intensity = 9 + Math.sin(phase.current * 0.7) + cursor.current.proximity * 4;
  });
  return <pointLight ref={light} name="rift-internal-light" position={[0, -0.25, -0.15]} color="#FF701A" intensity={9} distance={5} decay={2} />;
}

function FracturePulse({ paused }: { paused: boolean }) {
  const pulse = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshBasicMaterial>(null);
  const phase = useRef(0);
  const path = useMemo(() => {
    const result = new THREE.CurvePath<THREE.Vector3>();
    result.add(new THREE.LineCurve3(new THREE.Vector3(1.13, 1.5, 0.11), new THREE.Vector3(0.86, 1.02, 0.11)));
    result.add(new THREE.LineCurve3(new THREE.Vector3(0.86, 1.02, 0.11), new THREE.Vector3(1.05, 0.7, 0.11)));
    return result;
  }, []);
  const geometry = useMemo(() => new THREE.TubeGeometry(path, 16, 0.005, 3, false), [path]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((_, delta) => {
    if (paused) return;
    phase.current += Math.min(delta, 0.05);
    const progress = (phase.current % 7) / 7;
    if (pulse.current) path.getPoint(progress, pulse.current.position);
    if (material.current) material.current.opacity = Math.sin(progress * Math.PI) ** 2 * 0.85;
  });

  return (
    <group>
      <mesh geometry={geometry}>
        <meshBasicMaterial color="#00BDE9" transparent opacity={0.34} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={pulse} position={[1.13, 1.5, 0.11]}>
        <tetrahedronGeometry args={[0.034, 0]} />
        <meshBasicMaterial ref={material} color="#A3F2FF" transparent opacity={0} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

function seededNoise(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function Atmosphere({ quality, paused, cursor }: CoreProps & { cursor: CoreCursor }) {
  const group = useRef<THREE.Group>(null);
  const points = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const count = quality === "high" ? 64 : 20;
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      positions[index * 3] = (seededNoise(index * 3 + 1) - 0.5) * 4.8;
      positions[index * 3 + 1] = (seededNoise(index * 3 + 2) - 0.5) * 5.2;
      positions[index * 3 + 2] = -0.9 - seededNoise(index * 3 + 3) * 1.8;
    }
    const result = new THREE.BufferGeometry();
    result.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return result;
  }, [quality]);
  const arc = useMemo(() => {
    const positions: number[] = [];
    for (let index = 0; index < 40; index += 1) {
      const angle = 0.16 * Math.PI + index / 40 * Math.PI * 0.7;
      const next = angle + Math.PI * 0.7 / 40;
      positions.push(
        Math.cos(angle) * 2.15, Math.sin(angle) * 0.5 - 1.9, -0.9,
        Math.cos(next) * 2.15, Math.sin(next) * 0.5 - 1.9, -0.9,
      );
    }
    const result = new THREE.BufferGeometry();
    result.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
    return result;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => arc.dispose(), [arc]);

  useFrame((_, delta) => {
    if (paused || !points.current) return;
    points.current.rotation.y += Math.min(delta, 0.05) * 0.009;
    if (group.current) group.current.position.set(-cursor.current.x * 0.22, cursor.current.y * 0.14, 0);
  });

  return (
    <group ref={group} name="rift-atmosphere">
      <lineSegments geometry={arc}>
        <lineBasicMaterial color="#D8BEA4" transparent opacity={0.06} depthWrite={false} />
      </lineSegments>
      <points ref={points} geometry={geometry}>
        <pointsMaterial size={0.018} color="#EBD2B8" transparent opacity={0.42} depthWrite={false} />
      </points>
    </group>
  );
}

function useGlowTexture(): THREE.Texture | null {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const context = canvas.getContext("2d");
    if (!context) return null;
    const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, "rgba(255,156,65,0.9)");
    gradient.addColorStop(0.2, "rgba(255,85,12,0.3)");
    gradient.addColorStop(0.5, "rgba(255,65,0,0.06)");
    gradient.addColorStop(1, "rgba(255,65,0,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
    const result = new THREE.CanvasTexture(canvas);
    result.colorSpace = THREE.SRGBColorSpace;
    return result;
  }, []);
  useEffect(() => () => texture?.dispose(), [texture]);
  return texture;
}

function EmittedLight({ paused, cursor, texture }: { paused: boolean; cursor: CoreCursor; texture: THREE.Texture | null }) {
  const halo = useRef<THREE.Sprite>(null);
  const glow = useRef<THREE.SpriteMaterial>(null);
  const pool = useRef<THREE.SpriteMaterial>(null);
  const phase = useRef(0);
  useFrame((_, delta) => {
    if (paused) return;
    phase.current += Math.min(delta, 0.05);
    const breath = Math.sin(phase.current * 0.7);
    if (halo.current) halo.current.position.set(-0.2 + cursor.current.x * 0.07, Math.sin(phase.current * 0.45) * 0.12 - cursor.current.y * 0.04, -0.85);
    if (glow.current) glow.current.opacity = 0.13 + breath * 0.015 + cursor.current.proximity * 0.055;
    if (pool.current) pool.current.opacity = 0.42 + breath * 0.025 + cursor.current.proximity * 0.08;
  });

  if (!texture) return null;
  return (
    <group>
      <sprite ref={halo} name="rift-halo" position={[-0.2, 0, -0.85]} scale={[2.5, 2.9, 1]}>
        <spriteMaterial ref={glow} map={texture} transparent opacity={0.13} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      <sprite position={[0, -2.28, -0.4]} scale={[2.6, 0.36, 1]}>
        <spriteMaterial ref={pool} map={texture} transparent opacity={0.42} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
    </group>
  );
}

function CameraFraming({ quality }: { quality: CoreQuality }) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera) || !size.width || !size.height) return;
    // Reserve space for a full turn and pointer tilt beside the lower-right card.
    const desktop = window.matchMedia("(min-width: 1024px)").matches;
    const compactDesktop = desktop && size.width < 740;
    const halfHeight = !desktop ? 2.8 : compactDesktop ? 4.05 : 3.25;
    const halfWidth = 2.7;
    const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
    const distance = Math.max(halfHeight, halfWidth * size.height / size.width) / Math.tan(halfFov);
    camera.position.set(0, 0.15, distance + 0.55);
    const lift = THREE.MathUtils.clamp((size.height - 610) / 174, 0, 1) * 0.4;
    camera.lookAt(0, !desktop ? -0.05 : compactDesktop ? -1.15 : -0.25 - lift, 0);
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, size.width, size.height, quality, invalidate]);
  return null;
}

function Scene({ quality, paused }: CoreProps) {
  const cursor = useCoreCursor(paused);
  const glow = useGlowTexture();
  return (
    <>
      <StudioReflections quality={quality} />
      <hemisphereLight args={["#F4F1FF", "#151518", 0.85]} />
      <ambientLight intensity={0.35} color="#E8D9CF" />
      <pointLight position={[-2.8, 3.3, 4]} color="#FFFFFF" intensity={38} distance={14} decay={2} />
      <directionalLight position={[-3, 4, 5]} intensity={2.1} color="#F7F3EC" />
      <directionalLight position={[3, 2, -4]} intensity={3.5} color="#FFFFFF" />
      <directionalLight position={[-4, -1, -2]} intensity={1.2} color="#DDE5FF" />
      <CameraFraming quality={quality} />
      <EmittedLight paused={paused} cursor={cursor} texture={glow} />
      <Atmosphere quality={quality} paused={paused} cursor={cursor} />
      <Rig paused={paused} quality={quality} cursor={cursor}>
        {SHARDS.map((spec) => <Shard key={spec.id} spec={spec} quality={quality} paused={paused} cursor={cursor} glow={glow} />)}
        <RiftEnergy paused={paused} cursor={cursor} />
        <FracturePulse paused={paused} />
        <ContainedCharge paused={paused} quality={quality} />
      </Rig>
    </>
  );
}

export default function NexoraDiscoveryCore3D({ quality, paused }: CoreProps) {
  return (
    <Canvas
      style={{ width: "100%", height: "100%" }}
      dpr={quality === "high" ? [1, 1.8] : [1, 1.25]}
      frameloop={paused ? "demand" : "always"}
      camera={{ position: [0, 0.15, 10], fov: 36 }}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.15;
      }}
    >
      <Scene quality={quality} paused={paused} />
    </Canvas>
  );
}
