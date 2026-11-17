"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { DESK_TOP, SPOT } from "./placement";
import { story } from "./story";

// A 27" monitor at the back of the desk with a dark, faintly backlit screen. The controls shown "on" the screen
// (power button, hint, resume and contact) are ordinary page elements in DeskHero; every frame this works out where
// the screen is on the page and pins that layer to it, so they stay on the screen as the camera moves.
const W = 0.62,
  H = 0.36,
  BOTTOM = DESK_TOP + 0.13;

export function Monitor() {
  const [x, z] = SPOT.monitor;
  const { camera, size } = useThree();
  const corners = useRef([new THREE.Vector3(), new THREE.Vector3()]).current;

  useFrame(() => {
    const el = story.screenEl;
    if (!el) return;
    // top-left and bottom-right corners of the screen, in page pixels
    const zFace = z - 0.0185;
    corners[0].set(x - W / 2, BOTTOM + H, zFace).project(camera);
    corners[1].set(x + W / 2, BOTTOM, zFace).project(camera);
    const left = ((corners[0].x + 1) / 2) * size.width,
      top = ((1 - corners[0].y) / 2) * size.height;
    const right = ((corners[1].x + 1) / 2) * size.width,
      bottom = ((1 - corners[1].y) / 2) * size.height;
    el.style.transform = `translate(${left.toFixed(1)}px, ${top.toFixed(1)}px)`;
    el.style.width = `${(right - left).toFixed(1)}px`;
    el.style.height = `${(bottom - top).toFixed(1)}px`;
    el.style.setProperty("--screen-w", `${(right - left).toFixed(1)}px`);
  });

  return (
    <group position={[x, 0, z]}>
      {/* foot and neck */}
      <RoundedBox args={[0.26, 0.012, 0.17]} radius={0.005} position={[0, DESK_TOP + 0.006, -0.02]} castShadow receiveShadow>
        <meshStandardMaterial color="#1a1c21" metalness={0.75} roughness={0.35} />
      </RoundedBox>
      <mesh position={[0, DESK_TOP + 0.12, -0.06]} castShadow>
        <boxGeometry args={[0.05, 0.24, 0.018]} />
        <meshStandardMaterial color="#1a1c21" metalness={0.75} roughness={0.35} />
      </mesh>
      {/* panel and the dark, glossy screen */}
      <RoundedBox args={[W + 0.014, H + 0.014, 0.022]} radius={0.004} position={[0, BOTTOM + H / 2, -0.03]} castShadow>
        <meshStandardMaterial color="#0b0c0f" metalness={0.3} roughness={0.5} />
      </RoundedBox>
      <mesh position={[0, BOTTOM + H / 2, -0.0185]}>
        <planeGeometry args={[W, H]} />
        {/* a powered-on but empty display: just enough backlight that the screen reads against the dark room */}
        <meshStandardMaterial color="#030405" emissive="#04070a" metalness={0.4} roughness={0.3} />
      </mesh>
    </group>
  );
}
