"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer, SMAA, Vignette } from "@react-three/postprocessing";
import { Suspense } from "react";
import type { Project } from "../components/ProjectCard";
import { CameraRig } from "./CameraRig";
import { Figures } from "./Figures";
import { Hologram } from "./Hologram";
import { InspectStage } from "./InspectStage";
import { Keyboard } from "./Keyboard";
import { Monitor } from "./Monitor";
import { Mouse } from "./Mouse";
import { PowerSupply } from "./PowerSupply";
import { Room } from "./Room";
import { POSE } from "./placement";

export type SceneProps = {
  projects: Project[];
  index: number;
  zoomed: boolean;
  reducedMotion: boolean;
  onArrive: () => void;
  onSelect: (i: number) => void;
  inspect: Project | null; // the project open in the inspect view (the desk is hidden meanwhile)
};

export default function Scene({ projects, index, zoomed, reducedMotion, onArrive, onSelect, inspect }: SceneProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: POSE.intro.pos, fov: 38, near: 0.02, far: 20 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => gl.setClearColor("#020304")}
    >
      <fog attach="fog" args={["#020304", 2, 4.5]} />
      {/* reflections for the metal and brass, made from a few soft light panels (no image to download) */}
      <Environment resolution={128} environmentIntensity={0.15} frames={1}>
        <Lightformer form="rect" intensity={2.5} color="#ffd9b0" position={[1.5, 2.5, 1]} scale={[2, 1, 1]} />
        <Lightformer form="rect" intensity={0.4} color="#c8d4ff" position={[-2, 1.5, 2]} scale={[2, 2, 1]} />
      </Environment>

      <group visible={!inspect}>
        <Room />
        <Monitor />
        <PowerSupply />
        <Figures />
        <Keyboard reducedMotion={reducedMotion} />
        <Mouse />
        <Hologram projects={projects} index={index} onSelect={onSelect} />
      </group>
      <CameraRig zoomed={zoomed} paused={!!inspect} reducedMotion={reducedMotion} onArrive={onArrive} />
      {inspect?.model && (
        <Suspense fallback={null}>
          <InspectStage key={inspect.model.file} spec={inspect.model} reducedMotion={reducedMotion} />
        </Suspense>
      )}

      {/* multisampling inside the composer renders black in some browsers, so anti-aliasing comes from SMAA instead */}
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur intensity={0.85} luminanceThreshold={1} luminanceSmoothing={0.25} radius={0.7} />
        <Vignette offset={0.25} darkness={0.75} />
        <SMAA />
      </EffectComposer>
    </Canvas>
  );
}
