"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { HOLO, POSE } from "./placement";
import { easeInOutCubic, story } from "./story";

// Moves the camera between the wide view of the room and the close-up on the hologram, over ~2.4 s with easing and
// a slight dip, like a dolly move. In the wide view the camera drifts a little with the pointer.
const v = (a: [number, number, number]) => new THREE.Vector3(...a);
const DURATION = 2.4;

export function CameraRig({ zoomed, reducedMotion, onArrive }: { zoomed: boolean; reducedMotion: boolean; onArrive: () => void }) {
  const { camera, size } = useThree();
  const pointer = useRef(new THREE.Vector2());
  const arrived = useRef(false);
  const tmp = useRef({ pos: new THREE.Vector3(), look: new THREE.Vector3(), a: new THREE.Vector3(), b: new THREE.Vector3() }).current;

  useFrame((state, dt) => {
    const dir = zoomed ? 1 : -1;
    const step = Math.min(dt, 0.05) / (reducedMotion ? 0.25 : DURATION);
    story.p = THREE.MathUtils.clamp(story.p + dir * step, 0, 1);
    if (zoomed && story.p === 1 && !arrived.current) {
      arrived.current = true;
      onArrive();
    }
    if (!zoomed) arrived.current = false;
    const e = easeInOutCubic(story.p);

    // narrow (portrait) screens: back the camera off so the desk, then the panel, still fit across
    const cam = camera as THREE.PerspectiveCamera;
    const hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * (size.width / size.height));
    const fit = (pose: typeof POSE.intro, width: number, out: THREE.Vector3) => {
      const look = v(pose.look);
      const offset = v(pose.pos).sub(look);
      const need = width / 2 / Math.tan(hfov / 2);
      if (offset.length() < need) offset.setLength(need);
      return out.copy(look).add(offset);
    };
    const aspect = size.width / size.height;
    // phones: frame tighter (the desk's ends crop) so the monitor and its buttons stay a usable size
    fit(POSE.intro, aspect < 1 ? 0.8 : 1.3, tmp.a);
    fit(POSE.holo, HOLO.width * 1.25, tmp.b);
    // on tall (phone) screens the text fills the top, so raise the view to drop the desk into the lower half
    const lift = THREE.MathUtils.clamp((1 - aspect) * 0.4, 0, 0.22);
    tmp.a.y += lift;

    tmp.pos.lerpVectors(tmp.a, tmp.b, e);
    tmp.pos.y -= Math.sin(e * Math.PI) * 0.06; // dip on the way in
    tmp.look.lerpVectors(v(POSE.intro.look), v(POSE.holo.look), e);
    tmp.look.y += lift * (1 - e);

    // pointer parallax, only in the wide view
    if (!reducedMotion) pointer.current.lerp(state.pointer, 1 - Math.exp(-dt * 3));
    const free = 1 - e;
    tmp.pos.x += pointer.current.x * 0.08 * free;
    tmp.pos.y += pointer.current.y * 0.035 * free;

    camera.position.copy(tmp.pos);
    camera.lookAt(tmp.look);
  });
  return null;
}
