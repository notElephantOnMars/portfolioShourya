"use client";

import { RoundedBox } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { DESK_TOP, SPOT } from "./placement";
import { psuReadout } from "./textures";

// A bench DC power supply on the left: voltage and current readouts, two knobs, output jacks, and test leads on the desk.
const W = 0.2,
  H = 0.13,
  D = 0.26;

function Knob({ x, y }: { x: number; y: number }) {
  return (
    <group position={[x, y, D / 2]} rotation-x={Math.PI / 2}>
      <mesh position={[0, 0.008, 0]} castShadow>
        <cylinderGeometry args={[0.013, 0.015, 0.016, 24]} />
        <meshStandardMaterial color="#111216" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.0165, -0.009]}>
        <boxGeometry args={[0.002, 0.001, 0.008]} />
        <meshBasicMaterial color="#d9dde4" />
      </mesh>
    </group>
  );
}

function Jack({ x, color }: { x: number; color: string }) {
  return (
    <group position={[x, 0.028, D / 2]} rotation-x={Math.PI / 2}>
      <mesh position={[0, 0.006, 0]}>
        <cylinderGeometry args={[0.007, 0.008, 0.012, 20]} />
        <meshStandardMaterial color={color} roughness={0.4} />
      </mesh>
    </group>
  );
}

export function PowerSupply() {
  const volts = useMemo(() => psuReadout("12.00", "V", "#ff4d3a"), []);
  const amps = useMemo(() => psuReadout("1.500", "A", "#38f28a"), []);
  useEffect(() => () => (volts.dispose(), amps.dispose()), [volts, amps]);
  const [x, z] = SPOT.psu;

  // red and black test leads draped from the jacks onto the desk
  const leads = useMemo(
    () =>
      (
        [
          [-0.03, "#b3261e", 0.05],
          [0.0, "#141414", 0.09],
        ] as const
      ).map(([jx, color, reach]) => ({
        color,
        curve: new THREE.CatmullRomCurve3([
          new THREE.Vector3(jx, 0.028, D / 2 + 0.012),
          new THREE.Vector3(jx + 0.01, 0.01, D / 2 + 0.06),
          new THREE.Vector3(jx + reach, 0.004, D / 2 + 0.1),
          new THREE.Vector3(jx + reach + 0.08, 0.004, D / 2 + 0.07 + reach * 0.4),
        ]),
      })),
    [],
  );

  return (
    <group position={[x, DESK_TOP, z]} rotation-y={0.28}>
      <RoundedBox args={[W, H, D]} radius={0.006} position={[0, H / 2 + 0.006, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#2b313b" metalness={0.5} roughness={0.45} />
      </RoundedBox>
      {/* front panel */}
      <mesh position={[0, H / 2 + 0.006, D / 2 + 0.0005]}>
        <planeGeometry args={[W - 0.01, H - 0.01]} />
        <meshStandardMaterial color="#16191f" roughness={0.6} />
      </mesh>
      <mesh position={[-0.045, 0.105, D / 2 + 0.001]}>
        <planeGeometry args={[0.07, 0.026]} />
        <meshBasicMaterial map={volts} color={[1.6, 1.6, 1.6]} toneMapped={false} />
      </mesh>
      <mesh position={[-0.045, 0.072, D / 2 + 0.001]}>
        <planeGeometry args={[0.07, 0.026]} />
        <meshBasicMaterial map={amps} color={[1.6, 1.6, 1.6]} toneMapped={false} />
      </mesh>
      <Knob x={0.045} y={0.105} />
      <Knob x={0.045} y={0.065} />
      <Jack x={-0.03} color="#c62828" />
      <Jack x={0.0} color="#1b1b1b" />
      <Jack x={0.03} color="#2e7d32" />
      {/* power switch and feet */}
      <mesh position={[0.075, 0.028, D / 2 + 0.004]}>
        <boxGeometry args={[0.018, 0.012, 0.008]} />
        <meshStandardMaterial color="#0c0d10" />
      </mesh>
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[sx * (W / 2 - 0.02), 0.003, sz * (D / 2 - 0.03)]}>
            <cylinderGeometry args={[0.008, 0.008, 0.006, 12]} />
            <meshStandardMaterial color="#0a0a0a" />
          </mesh>
        )),
      )}
      {leads.map((l) => (
        <mesh key={l.color} castShadow>
          <tubeGeometry args={[l.curve, 32, 0.0022, 8, false]} />
          <meshStandardMaterial color={l.color} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}
