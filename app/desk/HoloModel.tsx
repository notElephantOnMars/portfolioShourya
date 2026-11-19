"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { ProjectModel } from "./modelSpec";
import { modelUrl, poseHinge, rigHinge, standUp } from "./models";

// A project's model drawn as a hologram: cyan, see-through, bright at its silhouette edges (a fresnel rim), with
// scanlines, turning slowly through 360°; hovered, it settles into an isometric view. For the solar car, the door is
// shown open.
const holoMat = new THREE.ShaderMaterial({
  uniforms: { opacity: { value: 0 }, time: { value: 0 } },
  vertexShader: `
    varying vec3 vN; varying vec3 vV; varying float vY;
    void main(){
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vY = (modelMatrix * vec4(position,1.0)).y;
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `
    varying vec3 vN; varying vec3 vV; varying float vY; uniform float opacity, time;
    void main(){
      float rim = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
      float scan = 0.8 + 0.2 * sin(vY * 1400.0 - time * 5.0);
      vec3 c = vec3(0.35, 0.85, 1.0) * (0.25 + 1.5 * rim) * scan;
      gl_FragColor = vec4(c, opacity * (0.12 + 0.75 * rim));
    }`,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  side: THREE.DoubleSide,
  toneMapped: false,
});

const TILT = 0.12; // the slight tip while spinning
const ISO_TILT = Math.atan(1 / Math.SQRT2); // 35.26°, the isometric angle

export function HoloModel({
  model: spec,
  box,
  opacity,
  paused,
}: {
  model: ProjectModel;
  box: [number, number];
  opacity: () => number;
  paused: () => boolean; // hovered: turn to an isometric view and hold
}) {
  const { scene } = useGLTF(modelUrl(spec.file));
  const { object, scale, isoScale, center } = useMemo(() => {
    const object = scene.clone(true);
    standUp(object, spec.upZ);
    if (spec.hinge) {
      const rig = rigHinge(object);
      if (rig) poseHinge(rig, 1); // door open
      object.updateMatrixWorld(true);
    }
    object.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).material = holoMat;
    });
    const b = new THREE.Box3().setFromObject(object);
    const size = b.getSize(new THREE.Vector3());
    const center = b.getCenter(new THREE.Vector3());
    // fit inside the box (width x height) whatever way it's turned, so use the larger of its two ground dimensions
    const scale = Math.min(box[0] / Math.max(size.x, size.z), box[1] / size.y);
    // and the fit for the isometric view (turned 45°, tipped 35.26° towards the viewer)
    const iso = new THREE.Box3();
    const turn = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(ISO_TILT, Math.PI / 4, 0, "XYZ"));
    for (let i = 0; i < 8; i++)
      iso.expandByPoint(
        new THREE.Vector3(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).sub(center).applyMatrix4(turn),
      );
    const isoSize = iso.getSize(new THREE.Vector3());
    const isoScale = Math.min(box[0] / isoSize.x, box[1] / isoSize.y);
    return { object, scale, isoScale, center };
  }, [scene, spec, box]);

  // spinning slowly; while hovered, ease round to the nearest isometric view and hold it
  const spin = useRef<THREE.Group>(null);
  const fit = useRef<THREE.Group>(null);
  const speed = useRef(0.35);
  const target = useRef<number | null>(null);
  useFrame(({ clock }, dt) => {
    const g = spin.current!;
    const k = Math.min(1, dt * 3.2);
    if (paused()) {
      // the next isometric angle ahead (45° + a multiple of 90°), so it carries on the way it was turning
      target.current ??= Math.ceil((g.rotation.y - Math.PI / 4) / (Math.PI / 2)) * (Math.PI / 2) + Math.PI / 4;
      g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, target.current, k);
      g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, ISO_TILT, k);
      speed.current = 0;
    } else {
      target.current = null;
      speed.current = THREE.MathUtils.lerp(speed.current, 0.35, Math.min(1, dt * 2));
      g.rotation.y += dt * speed.current; // about 18 s per turn
      g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, TILT, k);
    }
    // scale between the two fits as the tilt changes
    const f = fit.current!;
    const s = THREE.MathUtils.lerp(scale, isoScale, (g.rotation.x - TILT) / (ISO_TILT - TILT));
    f.scale.setScalar(s);
    f.position.copy(center).multiplyScalar(-s);
    holoMat.uniforms.time.value = clock.elapsedTime;
    holoMat.uniforms.opacity.value = opacity();
  });

  return (
    <group ref={spin} rotation-x={TILT}>
      <group ref={fit}>
        <primitive object={object} />
      </group>
    </group>
  );
}
