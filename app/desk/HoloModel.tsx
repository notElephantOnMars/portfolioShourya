"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { ProjectModel } from "./modelSpec";
import { modelUrl, poseHinge, rigHinge, standUp } from "./models";

// A project's model drawn as a hologram: cyan, see-through, bright at its silhouette edges (a fresnel rim), with
// scanlines, turning slowly through 360°. For the solar car, the door is shown open.
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

export function HoloModel({ model: spec, box, opacity }: { model: ProjectModel; box: [number, number]; opacity: () => number }) {
  const { scene } = useGLTF(modelUrl(spec.file));
  const { object, scale, offset } = useMemo(() => {
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
    return { object, scale, offset: center.multiplyScalar(-scale) };
  }, [scene, spec, box]);

  const spin = useRef<THREE.Group>(null);
  useFrame(({ clock }, dt) => {
    spin.current!.rotation.y += dt * 0.35; // about 18 s per turn
    holoMat.uniforms.time.value = clock.elapsedTime;
    holoMat.uniforms.opacity.value = opacity();
  });

  return (
    <group ref={spin} rotation-x={0.12}>
      <group position={offset} scale={scale}>
        <primitive object={object} />
      </group>
    </group>
  );
}
