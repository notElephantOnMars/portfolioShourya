"use client";

import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { asset } from "../asset";

// A downloaded figurine model (.glb in public/models), scaled to a given height, stood on the desk with its feet at
// y = 0 and centred, on a small black base like a collectible. Every mesh casts and receives shadows.
export function ModelFigure({ file, height, base = 0.028 }: { file: string; height: number; base?: number }) {
  const { scene } = useGLTF(asset(`models/${file}`));
  const { model, scale, offset } = useMemo(() => {
    const model = scene.clone(true);
    model.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = height / size.y;
    return { model, scale, offset: new THREE.Vector3(-center.x, -box.min.y, -center.z).multiplyScalar(scale) };
  }, [scene, height]);

  return (
    <group>
      {base > 0 && (
        <mesh position={[0, 0.003, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[base, base * 1.05, 0.006, 32]} />
          <meshStandardMaterial color="#0d0e12" roughness={0.4} metalness={0.3} />
        </mesh>
      )}
      <group position={[offset.x, offset.y + (base > 0 ? 0.006 : 0), offset.z]} scale={scale}>
        <primitive object={model} />
      </group>
    </group>
  );
}
