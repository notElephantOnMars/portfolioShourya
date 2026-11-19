"use client";

import { useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { asset } from "../asset";
import type { Project } from "../components/ProjectCard";
import { DESK_TOP, HOLO, SPOT } from "./placement";
import { smoothstep, story } from "./story";
import { CARD, HINT, holoArrow, holoHint, projectCard } from "./textures";
import { HoloModel } from "./HoloModel";
import { modelUrl } from "./models";

// The hologram projector in the middle of the desk. Idle, it shows a slowly turning emblem; as the camera zooms in
// it powers up into a floating panel showing one project (its model turning, and the skills used), which can be cycled
// and selected.

const holoVertex = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }";
const holoFragment = `
  varying vec2 vUv;
  uniform sampler2D map; uniform float time, opacity, glitch, tintMix;
  uniform vec2 uvScale, uvOffset;
  float hash(float n){ return fract(sin(n)*43758.5453); }
  void main(){
    vec2 uv = vUv;
    // glitch: shove random horizontal bands sideways while switching projects
    float band = floor(uv.y*28.0 + floor(time*24.0)*7.0);
    uv.x += glitch * step(0.6, hash(band)) * (hash(band+1.0)-0.5) * 0.12;
    vec4 c = texture2D(map, uv*uvScale + uvOffset);
    float lum = dot(c.rgb, vec3(0.3,0.59,0.11));
    vec3 col = mix(c.rgb, vec3(0.45,0.88,1.0)*lum*1.5, tintMix);
    float scan = 0.88 + 0.12*sin(vUv.y*620.0 - time*6.0);
    float flicker = 0.96 + 0.04*sin(time*41.0) * sin(time*7.0);
    float edge = smoothstep(0.0,0.012,vUv.x)*smoothstep(0.0,0.012,1.0-vUv.x)*smoothstep(0.0,0.02,vUv.y)*smoothstep(0.0,0.02,1.0-vUv.y);
    gl_FragColor = vec4(col*scan*1.08, c.a*opacity*flicker*edge*(1.0-glitch*0.35));
    #include <colorspace_fragment>
  }
`;

function holoMaterial(tintMix: number) {
  return new THREE.ShaderMaterial({
    vertexShader: holoVertex,
    fragmentShader: holoFragment,
    uniforms: {
      map: { value: null },
      time: { value: 0 },
      opacity: { value: 0 },
      glitch: { value: 0 },
      tintMix: { value: tintMix },
      uvScale: { value: new THREE.Vector2(1, 1) },
      uvOffset: { value: new THREE.Vector2(0, 0) },
    },
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
}

// the light cone from the projector up to the panel
const beamFragment = `
  varying vec2 vUv; uniform float time, opacity;
  void main(){
    float fade = pow(1.0 - vUv.y, 1.4) * 0.8 + 0.2;
    float lines = 0.6 + 0.4*sin(vUv.x*80.0 + time*2.0) * sin(vUv.y*30.0 - time*5.0);
    gl_FragColor = vec4(vec3(0.35,0.85,1.0)*1.6, opacity*fade*lines*0.22);
  }
`;

// One hologram per page, so its materials live here; useFrame updates their uniforms every frame.
const cardMat = holoMaterial(0);
const videoMat = holoMaterial(0.35);
const beamMat = new THREE.ShaderMaterial({
  vertexShader: holoVertex,
  fragmentShader: beamFragment,
  uniforms: { time: { value: 0 }, opacity: { value: 0 } },
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  side: THREE.DoubleSide,
  toneMapped: false,
});

// room for the spinning model: the card's open middle (where a video would play), in metres
const MODEL_BOX: [number, number] = [(CARD.video.w / CARD.w) * HOLO.width * 0.8, (CARD.video.h / CARD.h) * HOLO.height * 0.8];

// the arrows either side of the panel: one pixel chevron texture, two materials (each fades and glitches with the panel)
const arrowMats = [holoMaterial(0), holoMaterial(0)];
const ARROW_H = 0.05;
const ARROW_GAP = 0.034; // from the panel's edge to the arrow's centre
// the hint shown while the panel is hovered, just above the skills
const hintMat = holoMaterial(0);
const HINT_TEXT = "Click to take it apart";
const HINT_Y = 648; // on the card, in its pixels

export function Hologram({
  projects,
  index,
  onSelect,
  onStep,
}: {
  projects: Project[];
  index: number;
  onSelect: (i: number) => void;
  onStep: (d: number) => void;
}) {
  const [px, pz] = SPOT.projector;
  // project cards, drawn once the site's fonts have loaded so the canvas text uses them
  const [cards, setCards] = useState<THREE.Texture[]>([]);
  useEffect(() => {
    let made: THREE.Texture[] = [];
    let live = true;
    // team logos, if any, load alongside the fonts
    const loadLogo = (src?: string) =>
      src
        ? new Promise<HTMLImageElement | undefined>((done) => {
            const img = new Image();
            img.onload = () => done(img);
            img.onerror = () => done(undefined);
            img.src = asset(src);
          })
        : Promise.resolve(undefined);
    Promise.all([document.fonts.ready, Promise.all(projects.map((p) => loadLogo(p.logo)))]).then(([, logos]) => {
      if (!live) return;
      made = [...projects.map((p, i) => projectCard(p, logos[i])), holoHint(HINT_TEXT)]; // the cards, then the hover hint
      setCards(made);
    });
    return () => {
      live = false;
      made.forEach((t) => t.dispose());
    };
  }, [projects]);

  // one <video> per project, made on first use; only the one on screen plays
  const videos = useRef<Map<number, { el: HTMLVideoElement; tex: THREE.VideoTexture }>>(new Map());
  useEffect(() => {
    const all = videos.current;
    return () => {
      all.forEach(({ el, tex }) => (el.pause(), el.removeAttribute("src"), el.load(), tex.dispose()));
      all.clear();
    };
  }, []);
  const videoFor = (i: number) => {
    let v = videos.current.get(i);
    if (!v) {
      const el = document.createElement("video");
      Object.assign(el, { src: asset(projects[i].video), muted: true, loop: true, playsInline: true, crossOrigin: "anonymous", preload: "auto" });
      const tex = new THREE.VideoTexture(el);
      tex.colorSpace = THREE.SRGBColorSpace;
      v = { el, tex };
      videos.current.set(i, v);
    }
    return v;
  };

  // switching projects: glitch the panel for a moment
  const glitch = useRef(0);
  const shown = useRef(index);
  useEffect(() => {
    if (shown.current !== index) glitch.current = 1;
    shown.current = index;
  }, [index]);

  const panel = useRef<THREE.Group>(null);
  const beam = useRef<THREE.Group>(null);
  const emblem = useRef<THREE.Group>(null);
  const ring = useRef<THREE.MeshBasicMaterial>(null);
  const [hover, setHover] = useState(false);
  const [arrowHover, setArrowHover] = useState(0); // -1 left, 1 right
  const arrows = useRef<(THREE.Group | null)[]>([]);
  const [arrowTex] = useState(() => holoArrow());
  useEffect(() => {
    arrowMats.forEach((m) => (m.uniforms.map.value = arrowTex));
    return () => arrowTex.dispose();
  }, [arrowTex]);
  const hovered = useRef(false);
  useEffect(() => void (hovered.current = hover), [hover]);
  const hint = useRef(0);
  useEffect(() => {
    document.body.style.cursor = hover || arrowHover ? "pointer" : "";
    return () => void (document.body.style.cursor = "");
  }, [hover, arrowHover]);

  // the project models: start loading them all once the hologram powers up, so switching projects is instant
  const preloaded = useRef(false);
  const power = useRef(0); // how bright the spinning model is (fades with power-up and glitches)
  const project = projects[index];

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const a = smoothstep(0.45, 1, story.p); // how far the hologram has powered up
    glitch.current = Math.max(0, glitch.current - dt * 2.6);
    power.current = a * (1 - glitch.current * 0.7);
    if (a > 0.05 && !preloaded.current) {
      preloaded.current = true;
      projects.forEach((p) => p.model && useGLTF.preload(modelUrl(p.model.file)));
    }

    // panel unfolds: a thin line first, then full height
    const sx = smoothstep(0, 0.4, a),
      sy = Math.max(0.004, smoothstep(0.35, 1, a));
    panel.current!.scale.set(sx, sy, 1);
    panel.current!.visible = a > 0.001;
    panel.current!.position.y = HOLO.center[1] + Math.sin(t * 1.3) * 0.002;

    // arrows: drift outward and back, and lean out further while hovered
    [-1, 1].forEach((d, i) => {
      const g = arrows.current[i];
      if (!g) return;
      const lean = arrowHover === d ? 0.006 : 0;
      g.position.x = d * (HOLO.width / 2 + ARROW_GAP + lean + Math.max(0, Math.sin(t * 2.2 + i * 1.3)) * 0.003);
      g.scale.setScalar(THREE.MathUtils.lerp(g.scale.x, arrowHover === d ? 1.15 : 1, Math.min(1, dt * 12)));
    });
    for (const m of [cardMat, videoMat, hintMat, ...arrowMats]) {
      m.uniforms.time.value = t;
      m.uniforms.opacity.value = a;
      m.uniforms.glitch.value = glitch.current;
    }
    hint.current = THREE.MathUtils.lerp(hint.current, hover && !!project.model ? 1 : 0, Math.min(1, dt * 8));
    hintMat.uniforms.opacity.value = a * hint.current;
    cardMat.uniforms.map.value = cards[index] ?? null;
    hintMat.uniforms.map.value = cards[projects.length] ?? null;

    // video (projects without a 3D model): play the current one while the panel is up
    if (a > 0.3 && !projects[index].model) {
      const v = videoFor(index);
      videos.current.forEach((o, i) => i !== index && !o.el.paused && o.el.pause());
      if (v.el.paused) v.el.play().catch(() => {});
      videoMat.uniforms.map.value = v.tex;
      // cover the video frame like object-fit: cover
      const vw = v.el.videoWidth || 16,
        vh = v.el.videoHeight || 9;
      const frame = CARD.video.w / CARD.video.h,
        vid = vw / vh;
      const sx = Math.min(1, frame / vid),
        sy = Math.min(1, vid / frame);
      videoMat.uniforms.uvScale.value.set(sx, sy);
      videoMat.uniforms.uvOffset.value.set((1 - sx) / 2, (1 - sy) / 2);
    } else videos.current.forEach((o) => o.el.pause());

    beamMat.uniforms.time.value = t;
    beamMat.uniforms.opacity.value = 0.25 + a * 0.75;
    beam.current!.scale.set(0.35 + a * 0.65, 0.4 + a * 0.6, 0.35 + a * 0.65);

    // idle emblem fades out as the panel comes up
    emblem.current!.rotation.y = t * 0.6;
    emblem.current!.scale.setScalar(1 - a);
    emblem.current!.visible = a < 0.999;
    ring.current!.color.setRGB(0.4 + a * 0.8, 1.4 + a * 1.4, 2 + a * 1.6);
  });

  // where the video sits on the card, in panel coordinates
  const v = CARD.video;
  const vx = ((v.x + v.w / 2) / CARD.w - 0.5) * HOLO.width;
  const vy = (0.5 - (v.y + v.h / 2) / CARD.h) * HOLO.height;
  const beamH = HOLO.center[1] - HOLO.height / 2 - DESK_TOP - 0.012;
  const modelBox = MODEL_BOX;

  return (
    <group>
      {/* projector puck */}
      <group position={[px, DESK_TOP, pz]}>
        <mesh position={[0, 0.006, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.045, 0.05, 0.012, 48]} />
          <meshStandardMaterial color="#14171d" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.0122, 0]} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.026, 0.032, 48]} />
          <meshBasicMaterial ref={ring} color={[0.4, 1.4, 2]} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.0124, 0]} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.012, 32]} />
          <meshBasicMaterial color={[0.8, 2, 2.6]} toneMapped={false} />
        </mesh>
        {/* beam */}
        <group ref={beam} position={[0, 0.012, 0]}>
          <mesh position={[0, beamH / 2, 0]} material={beamMat}>
            <cylinderGeometry args={[HOLO.width * 0.55, 0.014, beamH, 48, 1, true]} />
          </mesh>
        </group>
        <group>
          {/* idle emblem: two turning rings and a core */}
          <group ref={emblem} position={[0, 0.09, 0]}>
            <mesh>
              <torusGeometry args={[0.03, 0.0012, 8, 64]} />
              <meshBasicMaterial color={[0.5, 1.8, 2.4]} toneMapped={false} transparent opacity={0.8} />
            </mesh>
            <mesh rotation-x={Math.PI / 2}>
              <torusGeometry args={[0.022, 0.001, 8, 64]} />
              <meshBasicMaterial color={[0.5, 1.8, 2.4]} toneMapped={false} transparent opacity={0.6} />
            </mesh>
            <mesh>
              <octahedronGeometry args={[0.008]} />
              <meshBasicMaterial color={[1, 2.2, 2.8]} toneMapped={false} wireframe />
            </mesh>
          </group>
        </group>
      </group>
      <pointLight position={[px, DESK_TOP + 0.12, pz]} color="#5fd6ff" intensity={0.1} distance={0.35} decay={2} />

      {/* the panel */}
      <group ref={panel} position={HOLO.center}>
        <mesh
          material={cardMat}
          onClick={(e) => (e.stopPropagation(), story.p > 0.95 && !story.inspecting && onSelect(index))}
          onPointerOver={() => story.p > 0.95 && !story.inspecting && setHover(true)}
          onPointerOut={() => setHover(false)}
        >
          <planeGeometry args={[HOLO.width, HOLO.height]} />
        </mesh>
        {/* hover hint */}
        <mesh material={hintMat} position={[0, (0.5 - HINT_Y / CARD.h) * HOLO.height, 0.002]} raycast={() => null}>
          <planeGeometry args={[(HINT.w / CARD.w) * HOLO.width, (HINT.h / CARD.h) * HOLO.height]} />
        </mesh>
        {/* hologram arrows either side: cycle projects */}
        {[-1, 1].map((d, i) => (
          <group key={d} ref={(g) => void (arrows.current[i] = g)} position={[d * (HOLO.width / 2 + ARROW_GAP), 0, 0]}>
            <mesh
              material={arrowMats[i]}
              rotation-z={d < 0 ? Math.PI : 0}
              onClick={(e) => (e.stopPropagation(), story.p > 0.95 && !story.inspecting && onStep(d))}
              onPointerOver={() => story.p > 0.95 && !story.inspecting && setArrowHover(d)}
              onPointerOut={() => setArrowHover(0)}
            >
              <planeGeometry args={[ARROW_H * (144 / 208), ARROW_H]} />
            </mesh>
          </group>
        ))}
        <mesh material={videoMat} position={[vx, vy, 0.001]} visible={!project.model}>
          <planeGeometry args={[(v.w / CARD.w) * HOLO.width, (v.h / CARD.h) * HOLO.height]} />
        </mesh>
        {/* the project's model, spinning in the middle of the card */}
        {project.model && (
          <group position={[vx, vy, 0.05]}>
            <Suspense fallback={null}>
              <HoloModel key={index} model={project.model} box={modelBox} opacity={() => power.current} paused={() => hovered.current} />
            </Suspense>
          </group>
        )}
      </group>
    </group>
  );
}
