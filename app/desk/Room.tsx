"use client";

import { RoundedBox } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { DESK_D, DESK_TOP, DESK_W, SPOT } from "./placement";

type V3 = [number, number, number];

// A rod between two points (the lamp's arms).
function Rod({ from, to, r, mat }: { from: V3; to: V3; r: number; mat: THREE.Material }) {
  const a = new THREE.Vector3(...from),
    b = new THREE.Vector3(...to);
  const dir = b.clone().sub(a);
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return (
    <mesh position={a.add(b).multiplyScalar(0.5)} quaternion={quat} material={mat} castShadow>
      <cylinderGeometry args={[r, r, dir.length(), 12]} />
    </mesh>
  );
}

// Lamp geometry: base on the desk at the back right, an elbow up high, and the head out over the desk.
const [LX, LZ] = SPOT.lamp;
const LAMP = {
  base: [LX, DESK_TOP, LZ] as V3,
  elbow: [LX + 0.02, DESK_TOP + 0.44, LZ - 0.06] as V3,
  head: [0.36, DESK_TOP + 0.55, -0.1] as V3,
};
const TARGET: V3 = [-0.05, DESK_TOP, 0.1];

// The dark room: everything stays black except the pool of lamp light on the desk.
export function Room() {
  const metal = useMemo(() => new THREE.MeshStandardMaterial({ color: "#1d2128", metalness: 0.8, roughness: 0.3 }), []);
  const lampTarget = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(...TARGET);
    return o;
  }, []);
  // the shade points from the head toward the target
  const shadeQuat = useMemo(() => {
    const d = new THREE.Vector3(...TARGET).sub(new THREE.Vector3(...LAMP.head)).normalize();
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), d);
  }, []);

  return (
    <group>
      {/* floor and walls */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial color="#040506" roughness={1} />
      </mesh>
      <mesh position={[0, 1.6, -0.62]} receiveShadow>
        <planeGeometry args={[8, 3.2]} />
        <meshStandardMaterial color="#060708" roughness={1} />
      </mesh>

      {/* desk */}
      <RoundedBox args={[DESK_W, 0.04, DESK_D]} radius={0.008} position={[0, DESK_TOP - 0.02, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#1d1915" roughness={0.6} />
      </RoundedBox>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (DESK_W / 2 - 0.06), (DESK_TOP - 0.04) / 2, 0]} castShadow>
          <boxGeometry args={[0.05, DESK_TOP - 0.04, DESK_D - 0.1]} />
          <meshStandardMaterial color="#14161b" metalness={0.6} roughness={0.5} />
        </mesh>
      ))}
      {/* desk mat under the keyboard and mouse */}
      <RoundedBox args={[0.9, 0.003, 0.36]} radius={0.0015} position={[0, DESK_TOP + 0.0015, 0.19]} receiveShadow>
        <meshStandardMaterial color="#0f1116" roughness={0.95} />
      </RoundedBox>

      {/* architect lamp */}
      <mesh position={[LX, DESK_TOP + 0.008, LZ]} material={metal} castShadow>
        <cylinderGeometry args={[0.06, 0.07, 0.016, 32]} />
      </mesh>
      <Rod from={LAMP.base} to={LAMP.elbow} r={0.0065} mat={metal} />
      <Rod from={LAMP.elbow} to={LAMP.head} r={0.0055} mat={metal} />
      <mesh position={LAMP.elbow} material={metal}>
        <sphereGeometry args={[0.011, 16, 12]} />
      </mesh>
      <group position={LAMP.head} quaternion={shadeQuat}>
        <mesh material={metal} castShadow position={[0, -0.02, 0]}>
          <cylinderGeometry args={[0.022, 0.055, 0.075, 32, 1, true]} />
        </mesh>
        <mesh position={[0, -0.04, 0]} rotation-x={Math.PI / 2}>
          <circleGeometry args={[0.045, 32]} />
          <meshBasicMaterial color={[1.6, 1.4, 1.1]} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* the lamp's light: a warm pool on the desk */}
      <primitive object={lampTarget} />
      <spotLight
        position={LAMP.head}
        target={lampTarget}
        color="#ffd9b0"
        intensity={5}
        angle={0.95}
        penumbra={0.9}
        distance={2.2}
        decay={1.4}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      {/* cool, dim fill from the viewer's side so fronts aren't black */}
      <directionalLight position={[-0.6, 1.6, 2]} color="#c8d4ff" intensity={0.06} />
      <ambientLight intensity={0.015} />
    </group>
  );
}
