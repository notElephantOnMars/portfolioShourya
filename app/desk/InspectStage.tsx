"use client";

import { Grid, OrbitControls, useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { ProjectModel } from "./modelSpec";
import { drawerContents } from "./drawerContents";
import { boundsOf, findParts, modelUrl, poseHinge, rigHinge, standUp } from "./models";
import { story } from "./story";

// The inspect view: the project's model at full detail on a dark stage, with an orbit camera (drag to turn, scroll to
// zoom, right-drag to pan). Part tabs are page elements (in DeskHero); this places them over their parts every frame
// and lights up a part while its tab is hovered. For the solar car, the door opens on request.
const DOOR_TIME = 2.6; // seconds for a full open or close (slide, then lift)
const HIGHLIGHT = new THREE.Color("#4fc3f7");
// drawer tower: how far a drawer slides out, and how long it takes
const DRAWER_OUT = 0.04;
const DRAWER_TIME = 0.6;
const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);

type Drawer = {
  node: THREE.Object3D;
  contents: THREE.Object3D;
  nodeZ: number; // closed positions
  contentsZ: number;
  minZ: number;
  front: THREE.Vector3; // the handle's front, closed, in the parent's space
  t: number; // 0 closed .. 1 open
};

type Part = { anchor: THREE.Object3D; local: THREE.Vector3; materials: THREE.MeshStandardMaterial[] };

export function InspectStage({ spec, reducedMotion }: { spec: ProjectModel; reducedMotion: boolean }) {
  const { scene: source } = useGLTF(modelUrl(spec.file));
  const get = useThree((s) => s.get); // camera and scene are read (and changed) inside effects, not during render
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null);

  const built = useMemo(() => {
    const object = source.clone(true);
    standUp(object, spec.upZ);
    // own copies of every material, so highlighting here never touches another copy of the model
    object.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.material = Array.isArray(m.material) ? m.material.map((x) => x.clone()) : m.material.clone();
    });
    // context parts (the car body around the hinge) drawn faint; the door a little stronger so its motion reads
    const faint = (nodes: THREE.Object3D[], opacity: number) =>
      nodes.forEach((n) =>
        n.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh)
            m.material = new THREE.MeshStandardMaterial({
              color: "#9fb7d0",
              metalness: 0.2,
              roughness: 0.5,
              transparent: true,
              opacity,
              depthWrite: false,
              side: THREE.DoubleSide,
            });
        }),
      );
    faint(findParts(object, spec.ghost ?? []), 0.07);
    if (spec.hinge) faint(findParts(object, ["Door"]), 0.22);
    const rig = spec.hinge ? rigHinge(object) : null;
    object.updateMatrixWorld(true);

    const whole = new THREE.Box3().setFromObject(object);
    const focusNodes = spec.focus ? findParts(object, spec.focus) : [object];
    const focus = boundsOf(focusNodes.length ? focusNodes : [object]);
    const parts: (Part | null)[] = spec.parts.map((part) => {
      const nodes = findParts(object, part.match);
      if (!nodes.length) return null;
      const center = boundsOf(nodes).getCenter(new THREE.Vector3());
      const materials: THREE.MeshStandardMaterial[] = [];
      nodes.forEach((n) =>
        n.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh) (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => "emissive" in x && materials.push(x as THREE.MeshStandardMaterial));
        }),
      );
      materials.forEach((m) => (m.userData.emissive = m.emissive.clone()));
      return { anchor: nodes[0], local: nodes[0].worldToLocal(center), materials };
    });
    // openable drawers: fill each with its parts (added after the part materials are collected, so hovering a part
    // tab never lights the contents), and start them all closed. The drawer meshes are compressed (each node carries
    // a scale), so the contents sit beside the drawer in its parent's space, in metres, and move with it.
    const drawers: Drawer[] = (spec.drawers ?? []).flatMap((d) => {
      const mesh = object.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(d.node)) as THREE.Mesh | undefined;
      if (!mesh?.geometry || !mesh.parent) return [];
      mesh.updateMatrix();
      mesh.geometry.computeBoundingBox();
      const b = mesh.geometry.boundingBox!.clone().applyMatrix4(mesh.matrix); // in the parent's space
      // the inside: 2 mm walls and floor, from the back wall to the front plate (which is 11.3 mm in from the
      // front of the handle)
      const wall = 0.002;
      const contents = drawerContents(d.contents, b.max.x - b.min.x - 2 * wall, b.max.z - 0.0113 - wall - b.min.z);
      contents.position.set(b.min.x + wall, b.min.y + wall, b.min.z + wall);
      mesh.parent.add(contents);
      return [{ node: mesh, contents, nodeZ: mesh.position.z, contentsZ: contents.position.z, minZ: b.min.z, front: new THREE.Vector3((b.min.x + b.max.x) / 2, (b.min.y + b.max.y) / 2, b.max.z), t: 0 }];
    });
    // closed is where the furthest-in drawer sits; move any that start pulled out back in
    const closed = Math.min(...drawers.map((d) => d.minZ));
    drawers.forEach((d) => {
      const back = d.minZ - closed;
      d.nodeZ -= back;
      d.contentsZ -= back;
      d.front.z -= back;
      d.node.position.z = d.nodeZ;
      d.contents.position.z = d.contentsZ;
    });
    object.updateMatrixWorld(true);
    return { object, rig, whole, focus, parts, drawers };
  }, [source, spec]);

  // frame the focus on entry, with a short dolly-in; open the stage up (no fog, brighter reflections) while here
  const intro = useRef({ t: 0, from: new THREE.Vector3(), to: new THREE.Vector3() });
  const radius = built.focus.getBoundingSphere(new THREE.Sphere()).radius;
  const center = useMemo(() => built.focus.getCenter(new THREE.Vector3()), [built]);
  const wholeRadius = built.whole.getBoundingSphere(new THREE.Sphere()).radius;
  useEffect(() => {
    const { camera, scene, size } = get();
    const cam = camera as THREE.PerspectiveCamera;
    const fov = THREE.MathUtils.degToRad(cam.fov);
    const fit = Math.min(fov, 2 * Math.atan(Math.tan(fov / 2) * (size.width / size.height)));
    const dist = (radius / Math.sin(fit / 2)) * 1.15;
    const dir = new THREE.Vector3(0.85, 0.5, 1.1).normalize();
    intro.current = { t: reducedMotion ? 1 : 0, from: center.clone().addScaledVector(dir, dist * 1.9), to: center.clone().addScaledVector(dir, dist) };
    cam.position.copy(reducedMotion ? intro.current.to : intro.current.from);
    const prev = { near: cam.near, far: cam.far, fog: scene.fog, env: scene.environmentIntensity };
    cam.near = radius * 0.01;
    cam.far = Math.max(wholeRadius, radius) * 40;
    cam.updateProjectionMatrix();
    scene.fog = null;
    scene.environmentIntensity = 0.9;
    controls.current?.target.copy(center);
    controls.current?.update();
    story.doorTarget = 0;
    story.drawerOpen = built.drawers.map(() => false);
    return () => {
      cam.near = prev.near;
      cam.far = prev.far;
      cam.updateProjectionMatrix();
      scene.fog = prev.fog;
      scene.environmentIntensity = prev.env;
      story.hoverPart = -1;
      story.tabEls.forEach((el) => el && (el.style.visibility = "hidden"));
      story.drawerEls.forEach((el) => el && (el.style.visibility = "hidden"));
    };
  }, [built, get, radius, center, wholeRadius, reducedMotion]);

  const door = useRef(0);
  const lit = useRef(-1);
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }, dt) => {
    // entry dolly
    const it = intro.current;
    if (it.t < 1) {
      it.t = Math.min(1, it.t + dt / 1.4);
      const e = 1 - Math.pow(1 - it.t, 3);
      camera.position.lerpVectors(it.from, it.to, e);
    }
    // door: run toward the requested state at a steady rate (slide, then lift)
    if (built.rig) {
      const step = reducedMotion ? 1 : dt / DOOR_TIME;
      const t = door.current + THREE.MathUtils.clamp(story.doorTarget - door.current, -step, step);
      if (t !== door.current) {
        door.current = t;
        poseHinge(built.rig, t);
        built.object.updateMatrixWorld(true);
      }
    }
    // drawers: slide toward open or closed
    built.drawers.forEach((d, i) => {
      const want = story.drawerOpen[i] ? 1 : 0;
      if (d.t === want) return;
      const step = reducedMotion ? 1 : dt / DRAWER_TIME;
      d.t = THREE.MathUtils.clamp(d.t + Math.sign(want - d.t) * step, 0, 1);
      const out = ease(d.t) * DRAWER_OUT;
      d.node.position.z = d.nodeZ + out;
      d.contents.position.z = d.contentsZ + out;
      d.node.updateMatrixWorld(true);
      d.contents.updateMatrixWorld(true);
    });
    // pin each drawer marker to its drawer's handle
    built.drawers.forEach((d, i) => {
      const el = story.drawerEls[i];
      if (!el) return;
      v.copy(d.front);
      v.z += ease(d.t) * DRAWER_OUT;
      d.node.parent!.localToWorld(v).project(camera);
      const visible = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
      el.style.visibility = visible ? "visible" : "hidden";
      el.style.transform = `translate(${(((v.x + 1) / 2) * size.width).toFixed(1)}px, ${(((1 - v.y) / 2) * size.height).toFixed(1)}px)`;
    });
    // light up the hovered part
    if (lit.current !== story.hoverPart) {
      built.parts[lit.current]?.materials.forEach((m) => m.emissive.copy(m.userData.emissive));
      built.parts[story.hoverPart]?.materials.forEach((m) => m.emissive.copy(HIGHLIGHT).multiplyScalar(0.55));
      lit.current = story.hoverPart;
    }
    // pin each tab over its part
    built.parts.forEach((part, i) => {
      const el = story.tabEls[i];
      if (!el) return;
      if (!part) return void (el.style.visibility = "hidden");
      part.anchor.localToWorld(v.copy(part.local)).project(camera);
      const visible = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
      el.style.visibility = visible ? "visible" : "hidden";
      el.style.transform = `translate(${(((v.x + 1) / 2) * size.width).toFixed(1)}px, ${(((1 - v.y) / 2) * size.height).toFixed(1)}px)`;
    });
  });

  const floorY = built.whole.min.y;
  return (
    <group>
      <primitive object={built.object} />
      <Grid
        position={[center.x, floorY - radius * 0.002, center.z]}
        infiniteGrid
        cellSize={radius * 0.1}
        sectionSize={radius * 0.5}
        cellColor="#14202c"
        sectionColor="#1f3546"
        fadeDistance={radius * 14}
        fadeStrength={2}
      />
      <hemisphereLight args={["#bcd3ff", "#0a0c10", 0.6]} />
      <directionalLight position={center.clone().add(new THREE.Vector3(2, 3, 2.5).multiplyScalar(radius))} intensity={2.2} color="#fff4e6" />
      <directionalLight position={center.clone().add(new THREE.Vector3(-2.5, 1.5, -2).multiplyScalar(radius))} intensity={0.9} color="#6fd3f2" />
      <OrbitControls
        ref={controls}
        makeDefault
        target={center}
        enableDamping
        dampingFactor={0.08}
        minDistance={radius * 0.35}
        maxDistance={Math.max(radius * 8, wholeRadius * 2.5)}
        zoomSpeed={0.8}
      />
    </group>
  );
}
