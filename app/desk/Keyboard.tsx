"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { MAT_TOP, SPOT } from "./placement";

// A full-size mechanical keyboard in the style of the ROG Strix Flare: gunmetal frame, per-key RGB shining through
// the legends and under the caps, an illuminated badge top left, media keys and a volume roller top right,
// and a wrist rest. Keys are one instanced mesh so all ~104 of them cost a single draw call.

const U = 0.019; // one key unit (19 mm pitch)

// [x offset in units, width in units] per key, row by row (function row, then five rows), for the three key blocks.
function layout() {
  const keys: { x: number; y: number; w: number; h: number }[] = [];
  const row = (y: number, start: number, widths: number[], gaps: Record<number, number> = {}) => {
    let x = start;
    widths.forEach((w, i) => {
      x += gaps[i] ?? 0;
      keys.push({ x, y, w, h: 1 });
      x += w;
    });
  };
  // function row (sits a bit higher than the rest)
  row(0, 0, Array(13).fill(1), { 1: 1, 5: 0.5, 9: 0.5 });
  row(0, 15.25, [1, 1, 1]);
  // main block
  row(1.25, 0, [...Array(13).fill(1), 2]);
  row(2.25, 0, [1.5, ...Array(12).fill(1), 1.5]);
  row(3.25, 0, [1.75, ...Array(11).fill(1), 2.25]);
  row(4.25, 0, [2.25, ...Array(10).fill(1), 2.75]);
  row(5.25, 0, [1.25, 1.25, 1.25, 6.25, 1.25, 1.25, 1.25, 1.25]);
  // navigation cluster and arrows
  row(1.25, 15.25, [1, 1, 1]);
  row(2.25, 15.25, [1, 1, 1]);
  row(4.25, 16.25, [1]);
  row(5.25, 15.25, [1, 1, 1]);
  // number pad (plus and enter are two rows tall)
  row(1.25, 18.5, [1, 1, 1, 1]);
  row(2.25, 18.5, [1, 1, 1]);
  keys.push({ x: 21.5, y: 2.25, w: 1, h: 2 });
  row(3.25, 18.5, [1, 1, 1]);
  row(4.25, 18.5, [1, 1, 1]);
  keys.push({ x: 21.5, y: 4.25, w: 1, h: 2 });
  row(5.25, 18.5, [2, 1]);
  return keys;
}

const COLS = 22.5,
  ROWS = 6.25;
const KB_W = COLS * U + 0.024,
  KB_D = ROWS * U + 0.034;

export function Keyboard({ reducedMotion }: { reducedMotion: boolean }) {
  const keys = useMemo(() => layout(), []);
  const caps = useRef<THREE.InstancedMesh>(null);
  const legends = useRef<THREE.InstancedMesh>(null);
  const glowMat = useRef<THREE.ShaderMaterial>(null);
  const color = useMemo(() => new THREE.Color(), []);

  // place every keycap and its legend
  useLayoutEffect(() => {
    const m = new THREE.Matrix4(),
      q = new THREE.Quaternion(),
      s = new THREE.Vector3(),
      p = new THREE.Vector3();
    const flat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2); // legends lie on the caps
    keys.forEach((k, i) => {
      const cx = (k.x + k.w / 2) * U - (COLS * U) / 2;
      const cz = (k.y + k.h / 2) * U - (ROWS * U) / 2;
      p.set(cx, 0.0225, cz);
      s.set(k.w * U - 0.0032, 0.009, k.h * U - 0.0032);
      caps.current!.setMatrixAt(i, m.compose(p, q, s));
      p.set(cx - k.w * U * 0.25, 0.02715, cz - k.h * U * 0.2);
      s.set(0.004, 0.0028, 1);
      legends.current!.setMatrixAt(i, m.compose(p, flat, s));
      legends.current!.setColorAt(i, color.setRGB(1, 1, 1));
    });
    caps.current!.instanceMatrix.needsUpdate = true;
    legends.current!.instanceMatrix.needsUpdate = true;
  }, [keys, color]);

  // a slow rainbow wave across the keys
  useFrame(({ clock }) => {
    const t = reducedMotion ? 0 : clock.elapsedTime;
    keys.forEach((k, i) => {
      color.setHSL((k.x / COLS) * 0.7 - t * 0.08, 0.95, 0.55).multiplyScalar(2.2);
      legends.current!.setColorAt(i, color);
    });
    legends.current!.instanceColor!.needsUpdate = true;
    if (glowMat.current) glowMat.current.uniforms.time.value = t;
  });

  const glow = useMemo(
    () => ({
      uniforms: { time: { value: 0 } },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: `
        varying vec2 vUv; uniform float time;
        vec3 hsl(float h){ vec3 k = clamp(abs(mod(h*6.0+vec3(0,4,2),6.0)-3.0)-1.0,0.0,1.0); return mix(vec3(1.0), k, 0.95)*0.55+0.0; }
        void main(){ vec3 c = hsl(fract(vUv.x*0.7 - time*0.08)); gl_FragColor = vec4(c*0.9, 1.0); }
      `,
      toneMapped: false,
    }),
    [],
  );

  const [x, z] = SPOT.keyboard;
  return (
    <group position={[x, MAT_TOP, z]} rotation-y={0.03}>
      {/* frame */}
      <RoundedBox args={[KB_W, 0.018, KB_D]} radius={0.004} position={[0, 0.011, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#24272e" metalness={0.75} roughness={0.38} />
      </RoundedBox>
      {/* RGB plate glowing between the keys */}
      <mesh position={[0, 0.0202, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[COLS * U, ROWS * U]} />
        <shaderMaterial ref={glowMat} args={[glow]} />
      </mesh>
      {/* keycaps and their shine-through legends */}
      <instancedMesh ref={caps} args={[undefined, undefined, keys.length]} castShadow>
        <boxGeometry />
        <meshStandardMaterial color="#121317" roughness={0.55} />
      </instancedMesh>
      <instancedMesh ref={legends} args={[undefined, undefined, keys.length]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      {/* badge, top left; media keys and volume roller, top right */}
      <mesh position={[-KB_W / 2 + 0.03, 0.0205, -KB_D / 2 + 0.008]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.03, 0.007]} />
        <meshBasicMaterial color={[2.4, 0.5, 0.6]} toneMapped={false} />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[KB_W / 2 - 0.09 + i * 0.012, 0.021, -KB_D / 2 + 0.008]}>
          <boxGeometry args={[0.009, 0.004, 0.006]} />
          <meshStandardMaterial color="#121317" roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[KB_W / 2 - 0.025, 0.022, -KB_D / 2 + 0.009]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.0055, 0.0055, 0.016, 24]} />
        <meshStandardMaterial color="#3a3e47" metalness={0.9} roughness={0.25} />
      </mesh>
      {/* wrist rest */}
      <RoundedBox args={[KB_W - 0.01, 0.012, 0.06]} radius={0.005} position={[0, 0.006, KB_D / 2 + 0.036]} castShadow receiveShadow>
        <meshStandardMaterial color="#15171c" roughness={0.9} />
      </RoundedBox>
    </group>
  );
}
