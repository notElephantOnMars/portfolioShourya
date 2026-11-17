"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { MAT_TOP, SPOT } from "./placement";

// A wired gaming mouse in the style of the G502 HERO: long angular body with a thumb rest on the left, a metal scroll
// wheel, sniper and side buttons, DPI indicator lights, a glowing logo on the palm, and the cable running to the back.
export function Mouse() {
  const shell = useMemo(() => new THREE.MeshStandardMaterial({ color: "#16181d", metalness: 0.35, roughness: 0.45 }), []);
  const accent = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2a2e36", metalness: 0.8, roughness: 0.3 }), []);
  const cable = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.012, -0.066),
        new THREE.Vector3(0.004, 0.006, -0.1),
        new THREE.Vector3(-0.02, 0.003, -0.17),
        new THREE.Vector3(0.01, 0.003, -0.26),
        new THREE.Vector3(0.05, 0.003, -0.36),
      ]),
    [],
  );
  const [x, z] = SPOT.mouse;
  return (
    <group position={[x, MAT_TOP, z]} rotation-y={-0.12}>
      {/* main body: a stretched dome, higher toward the back like a palm-grip mouse */}
      <mesh material={shell} scale={[0.036, 0.04, 0.066]} position={[0, 0, 0.004]} castShadow>
        <sphereGeometry args={[1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      {/* thumb rest flaring out on the left */}
      <mesh material={shell} scale={[0.022, 0.016, 0.04]} position={[-0.026, 0, 0.016]} castShadow>
        <sphereGeometry args={[1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      {/* angular side panels */}
      {[-1, 1].map((s) => (
        <mesh key={s} material={accent} position={[s * 0.031, 0.016, 0.014]} rotation={[0.1, 0, s * -0.55]}>
          <boxGeometry args={[0.004, 0.012, 0.05]} />
        </mesh>
      ))}
      {/* split between the left and right buttons */}
      <mesh position={[0, 0.0375, -0.03]} rotation-x={0.42}>
        <boxGeometry args={[0.0012, 0.006, 0.05]} />
        <meshStandardMaterial color="#050506" />
      </mesh>
      {/* metal scroll wheel and the mode button behind it */}
      <mesh position={[0, 0.037, -0.03]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.0085, 0.0085, 0.0075, 28]} />
        <meshStandardMaterial color="#9aa3b0" metalness={1} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.0405, -0.012]}>
        <boxGeometry args={[0.005, 0.002, 0.007]} />
        <meshStandardMaterial color="#0a0a0c" />
      </mesh>
      {/* sniper button and two side buttons */}
      <mesh material={accent} position={[-0.029, 0.013, -0.034]} rotation-z={0.8}>
        <boxGeometry args={[0.004, 0.008, 0.012]} />
      </mesh>
      {[0.0, 0.016].map((dz) => (
        <mesh key={dz} material={accent} position={[-0.031, 0.0195, -0.012 + dz]} rotation-z={0.7}>
          <boxGeometry args={[0.003, 0.007, 0.014]} />
        </mesh>
      ))}
      {/* DPI indicator lights, left of the left button */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[-0.022, 0.0225 + i * 0.0012, -0.034 + i * 0.006]} rotation={[0.3, 0, 0.6]}>
          <boxGeometry args={[0.002, 0.0006, 0.0038]} />
          <meshBasicMaterial color={i < 2 ? [0.4, 1.8, 2.4] : [0.1, 0.12, 0.15]} toneMapped={false} />
        </mesh>
      ))}
      {/* glowing logo on the palm */}
      <mesh position={[0, 0.0375, 0.03]} rotation-x={-1.05}>
        <ringGeometry args={[0.0035, 0.0055, 24, 1, 0.5, Math.PI * 1.6]} />
        <meshBasicMaterial color={[0.6, 1.6, 2.6]} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      {/* cable */}
      <mesh castShadow>
        <tubeGeometry args={[cable, 48, 0.0016, 8, false]} />
        <meshStandardMaterial color="#0d0e11" roughness={0.6} />
      </mesh>
    </group>
  );
}
