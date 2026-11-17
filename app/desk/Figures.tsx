"use client";

import { Suspense, useMemo } from "react";
import * as THREE from "three";
import { ModelFigure } from "./ModelFigure";
import { DESK_TOP, SPOT } from "./placement";

// Small stylised figurines lined up behind the hologram projector: Goku, Iron Man, a brass Hanuman idol, and Spider-Man.
// They're deliberately simple, small and matte so they read as background detail, not the focus.

type V3 = [number, number, number];

// A rounded limb between two points.
function Limb({ from, to, r, color, mat }: { from: V3; to: V3; r: number; color?: string; mat?: THREE.Material }) {
  const { pos, quat, len } = useMemo(() => {
    const a = new THREE.Vector3(...from),
      b = new THREE.Vector3(...to);
    const dir = b.clone().sub(a);
    return {
      pos: a.clone().add(b).multiplyScalar(0.5),
      quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()),
      len: dir.length(),
    };
  }, [from, to]);
  return (
    <mesh position={pos} quaternion={quat} castShadow material={mat}>
      <capsuleGeometry args={[r, Math.max(len - r * 2, 0.0001), 4, 10]} />
      {!mat && <meshStandardMaterial color={color} roughness={0.55} />}
    </mesh>
  );
}

function Ball({ p, r, color, scale, mat }: { p: V3; r: number; color?: string; scale?: V3; mat?: THREE.Material }) {
  return (
    <mesh position={p} scale={scale} castShadow material={mat}>
      <sphereGeometry args={[r, 20, 14]} />
      {!mat && <meshStandardMaterial color={color} roughness={0.5} />}
    </mesh>
  );
}

function Base({ r = 0.028, color = "#0d0e12" }: { r?: number; color?: string }) {
  return (
    <mesh position={[0, 0.003, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[r, r * 1.05, 0.006, 32]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.3} />
    </mesh>
  );
}

const SKIN = "#e8b88e";

function Goku() {
  const orange = "#e86a1c",
    blue = "#1f3f9a";
  const hair = useMemo(
    () =>
      [
        [0, 0.03, -0.004, 0],
        [0.012, 0.025, -0.006, -0.6],
        [-0.012, 0.025, -0.006, 0.6],
        [0.018, 0.012, -0.004, -1.1],
        [-0.018, 0.012, -0.004, 1.1],
        [0.006, 0.02, -0.014, -0.3],
        [-0.006, 0.02, -0.014, 0.3],
        [0, 0.01, -0.018, 0],
      ] as [number, number, number, number][],
    [],
  );
  return (
    <group>
      <Base />
      {/* legs: wide stance, blue boots */}
      <Limb from={[-0.008, 0.055, 0]} to={[-0.016, 0.016, 0.002]} r={0.0065} color={orange} />
      <Limb from={[0.008, 0.055, 0]} to={[0.016, 0.016, 0.002]} r={0.0065} color={orange} />
      <Ball p={[-0.017, 0.011, 0.004]} r={0.0065} color={blue} scale={[1, 1, 1.4]} />
      <Ball p={[0.017, 0.011, 0.004]} r={0.0065} color={blue} scale={[1, 1, 1.4]} />
      {/* torso: orange gi, blue undershirt, blue belt */}
      <Limb from={[0, 0.062, 0]} to={[0, 0.088, 0]} r={0.013} color={orange} />
      <Ball p={[0, 0.085, 0.009]} r={0.006} color={blue} scale={[1, 1.4, 0.5]} />
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.0135, 0.0135, 0.005, 20]} />
        <meshStandardMaterial color={blue} roughness={0.5} />
      </mesh>
      {/* arms: one fist forward */}
      <Limb from={[-0.016, 0.09, 0]} to={[-0.022, 0.066, 0.008]} r={0.0045} color={SKIN} />
      <Limb from={[0.016, 0.09, 0]} to={[0.02, 0.08, 0.026]} r={0.0045} color={SKIN} />
      <Ball p={[-0.023, 0.064, 0.009]} r={0.005} color={blue} />
      <Ball p={[0.021, 0.079, 0.029]} r={0.005} color={blue} />
      {/* head and spiky hair */}
      <Ball p={[0, 0.108, 0.002]} r={0.0105} color={SKIN} />
      {hair.map(([x, y, z, rz], i) => (
        <mesh key={i} position={[x, 0.108 + y * 0.6, z]} rotation={[-0.3, 0, rz]} castShadow>
          <coneGeometry args={[0.0055, 0.022, 6]} />
          <meshStandardMaterial color="#0b0b0e" roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function IronMan() {
  const red = useMemo(() => new THREE.MeshStandardMaterial({ color: "#8e1414", metalness: 0.6, roughness: 0.35 }), []);
  const gold = useMemo(() => new THREE.MeshStandardMaterial({ color: "#b8902f", metalness: 0.7, roughness: 0.35 }), []);
  return (
    <group>
      <Base />
      <Limb from={[-0.008, 0.058, 0]} to={[-0.01, 0.014, 0]} r={0.0068} mat={gold} />
      <Limb from={[0.008, 0.058, 0]} to={[0.01, 0.014, 0]} r={0.0068} mat={gold} />
      <Ball p={[-0.01, 0.011, 0.003]} r={0.0068} mat={red} scale={[1, 1, 1.4]} />
      <Ball p={[0.01, 0.011, 0.003]} r={0.0068} mat={red} scale={[1, 1, 1.4]} />
      <Limb from={[0, 0.062, 0]} to={[0, 0.09, 0]} r={0.0135} mat={red} />
      <Ball p={[0, 0.064, 0.004]} r={0.011} mat={gold} scale={[1, 0.6, 1]} />
      {/* arc reactor */}
      <mesh position={[0, 0.087, 0.0135]}>
        <circleGeometry args={[0.0035, 20]} />
        <meshBasicMaterial color={[1.4, 2.2, 2.6]} toneMapped={false} />
      </mesh>
      {/* arms: right hand raised as if firing a repulsor */}
      <Limb from={[-0.017, 0.092, 0]} to={[-0.02, 0.064, 0]} r={0.0055} mat={red} />
      <Limb from={[0.017, 0.092, 0]} to={[0.03, 0.092, 0.018]} r={0.0055} mat={red} />
      <Ball p={[-0.017, 0.093, 0]} r={0.008} mat={gold} />
      <Ball p={[0.017, 0.093, 0]} r={0.008} mat={gold} />
      {/* helmet with gold faceplate and glowing eyes */}
      <Ball p={[0, 0.11, 0]} r={0.0105} mat={red} scale={[1, 1.1, 1]} />
      <Ball p={[0, 0.108, 0.005]} r={0.0075} mat={gold} scale={[1, 1.15, 0.8]} />
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.0033, 0.111, 0.0106]} rotation-z={s * -0.25}>
          <planeGeometry args={[0.0038, 0.0012]} />
          <meshBasicMaterial color={[1.5, 2.2, 2.6]} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function Hanuman() {
  // polished brass: needs the environment reflections set up in Scene.tsx to read as metal
  const brass = useMemo(() => new THREE.MeshStandardMaterial({ color: "#c9a04a", metalness: 1, roughness: 0.32 }), []);
  const tail = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.04, -0.012),
        new THREE.Vector3(-0.012, 0.06, -0.03),
        new THREE.Vector3(-0.022, 0.11, -0.03),
        new THREE.Vector3(-0.012, 0.15, -0.018),
        new THREE.Vector3(0.006, 0.152, -0.01),
      ]),
    [],
  );
  return (
    <group>
      {/* lotus pedestal */}
      <mesh position={[0, 0.006, 0]} castShadow material={brass}>
        <cylinderGeometry args={[0.03, 0.034, 0.012, 32]} />
      </mesh>
      <mesh position={[0, 0.016, 0]} castShadow material={brass}>
        <cylinderGeometry args={[0.022, 0.028, 0.008, 16]} />
      </mesh>
      {/* standing figure */}
      <Limb from={[-0.008, 0.064, 0]} to={[-0.009, 0.022, 0.002]} r={0.0065} mat={brass} />
      <Limb from={[0.008, 0.064, 0]} to={[0.009, 0.022, 0.002]} r={0.0065} mat={brass} />
      <Ball p={[0, 0.066, 0]} r={0.012} mat={brass} scale={[1.15, 0.7, 0.9]} />
      <Limb from={[0, 0.07, 0]} to={[0, 0.098, 0]} r={0.0135} mat={brass} />
      {/* left hand raised in blessing, right hand holding the gada (mace) on the shoulder */}
      <Limb from={[-0.018, 0.098, 0]} to={[-0.026, 0.083, 0.012]} r={0.0048} mat={brass} />
      <Limb from={[-0.026, 0.083, 0.012]} to={[-0.024, 0.104, 0.016]} r={0.0042} mat={brass} />
      <Limb from={[0.018, 0.098, 0]} to={[0.022, 0.08, 0.01]} r={0.0048} mat={brass} />
      <Limb from={[0.022, 0.08, 0.01]} to={[0.024, 0.13, -0.004]} r={0.002} mat={brass} />
      <Ball p={[0.025, 0.135, -0.006]} r={0.0095} mat={brass} />
      {/* head and crown */}
      <Ball p={[0, 0.117, 0.002]} r={0.0105} mat={brass} />
      <Ball p={[0, 0.113, 0.011]} r={0.0045} mat={brass} scale={[1.2, 0.8, 1]} />
      <mesh position={[0, 0.132, 0.001]} castShadow material={brass}>
        <coneGeometry args={[0.009, 0.018, 12]} />
      </mesh>
      <mesh position={[0, 0.125, 0.001]} rotation-x={Math.PI / 2} material={brass}>
        <torusGeometry args={[0.0095, 0.0016, 8, 24]} />
      </mesh>
      {/* tail curling up behind */}
      <mesh castShadow material={brass}>
        <tubeGeometry args={[tail, 40, 0.0022, 8, false]} />
      </mesh>
    </group>
  );
}

function SpiderMan() {
  const red = "#a3161b",
    blue = "#1b2f7a";
  return (
    <group>
      <Base />
      {/* crouched, one hand down, one up */}
      <Limb from={[-0.009, 0.042, 0]} to={[-0.02, 0.03, 0.012]} r={0.0062} color={blue} />
      <Limb from={[-0.02, 0.03, 0.012]} to={[-0.016, 0.01, 0.006]} r={0.0058} color={red} />
      <Limb from={[0.009, 0.042, 0]} to={[0.02, 0.028, -0.004]} r={0.0062} color={blue} />
      <Limb from={[0.02, 0.028, -0.004]} to={[0.016, 0.01, 0.006]} r={0.0058} color={red} />
      <Limb from={[0, 0.045, -0.002]} to={[0, 0.074, 0.006]} r={0.0128} color={red} />
      <Limb from={[-0.016, 0.073, 0.004]} to={[-0.022, 0.03, 0.022]} r={0.0048} color={blue} />
      <Ball p={[-0.022, 0.026, 0.024]} r={0.005} color={red} />
      <Limb from={[0.016, 0.073, 0.004]} to={[0.028, 0.096, 0.014]} r={0.0048} color={blue} />
      <Ball p={[0.029, 0.099, 0.015]} r={0.005} color={red} />
      {/* masked head with the big white eyes */}
      <Ball p={[0, 0.093, 0.01]} r={0.0105} color={red} scale={[0.95, 1.1, 1]} />
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.0045, 0.095, 0.0195]} rotation={[0, s * 0.35, s * -0.5]} scale={[1, 1.5, 0.35]}>
          <sphereGeometry args={[0.0032, 14, 10]} />
          <meshStandardMaterial color="#e9edf2" roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

export function Figures() {
  const z = SPOT.figures;
  return (
    <group position={[0, DESK_TOP, z]} scale={0.85}>
      <group position={[-0.27, 0, 0.01]} rotation-y={0.35}>
        {/* downloaded model; the hand-built one shows while it loads */}
        <Suspense fallback={<Goku />}>
          <ModelFigure file="goku.glb" height={0.125} />
        </Suspense>
      </group>
      <group position={[-0.13, 0, 0]} rotation-y={0.18}>
        <IronMan />
      </group>
      <group position={[0.0, 0, -0.03]}>
        <Hanuman />
      </group>
      <group position={[0.14, 0, 0]} rotation-y={-0.2}>
        <SpiderMan />
      </group>
    </group>
  );
}
