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

// delivery robot test drive: how far the fork tips up, how fast the wheels turn, and how quickly each eases in
const LIFT_ANGLE = THREE.MathUtils.degToRad(18);
const WHEEL_SPEED = 4; // rad/s, a little under one turn a second
const LIFT_TIME = 1.2;
const SLIDE_TIME = 0.5; // the payload sliding down the tipped fork

type Spinner = { node: THREE.Object3D; base: THREE.Matrix4; center: THREE.Vector3; axis: THREE.Vector3 };
const m3 = new THREE.Matrix4();
// turn a node about an axis through a point (both in its parent's space), on top of its resting transform
const m1 = new THREE.Matrix4(),
  m2 = new THREE.Matrix4();
// `shift` (in the parent's space, before turning) moves the node along whatever it rests on, e.g. down the fork
function turn(s: Spinner, angle: number, shift?: THREE.Vector3) {
  s.node.matrix
    .makeTranslation(s.center.x, s.center.y, s.center.z)
    .multiply(m1.makeRotationAxis(s.axis, angle))
    .multiply(m2.makeTranslation(-s.center.x, -s.center.y, -s.center.z));
  if (shift) s.node.matrix.multiply(m3.makeTranslation(shift.x, shift.y, shift.z));
  s.node.matrix.multiply(s.base);
  s.node.matrixWorldNeedsUpdate = true;
}
// a spinner for `node` about a world-space axis through a world-space point
function spinner(node: THREE.Object3D, center: THREE.Vector3, axis: THREE.Vector3): Spinner {
  const parent = node.parent!;
  const toLocal = new THREE.Matrix4().copy(parent.matrixWorld).invert();
  const c = center.clone().applyMatrix4(toLocal);
  const a = axis.clone().transformDirection(toLocal);
  node.updateMatrix();
  node.matrixAutoUpdate = false;
  return { node, base: node.matrix.clone(), center: c, axis: a };
}

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
    // test drive: the fork and payload turn about the line through both servo shafts; each wheel about its axle
    let drive: { lift: Spinner[]; wheels: Spinner[]; payload: Spinner | null; slide: THREE.Vector3 } | null = null;
    if (spec.testDrive) {
      const td = spec.testDrive;
      const servos = findParts(object, [td.servos]);
      const sb = boundsOf(servos);
      // the servos stand upright either side of the fork, shafts facing it, near their tops
      const pivot = new THREE.Vector3((sb.min.x + sb.max.x) / 2, sb.max.y - 0.009, (sb.min.z + sb.max.z) / 2);
      const span = new THREE.Vector3().subVectors(boundsOf([servos[0]]).getCenter(new THREE.Vector3()), boundsOf([servos[1] ?? servos[0]]).getCenter(new THREE.Vector3()));
      const axis = span.lengthSq() > 0 ? span.normalize() : new THREE.Vector3(1, 0, 0);
      // tip the payload end up: the payload sits on the far side of the pivot from the robot's middle
      const lift = td.lift.flatMap((n) => {
        const node = object.getObjectByName(n);
        return node ? [node] : [];
      });
      const payload = boundsOf(lift).getCenter(new THREE.Vector3()).sub(pivot);
      if (new THREE.Vector3().crossVectors(axis, payload).y < 0) axis.negate();
      const wheels = findParts(object, [td.wheels]).map((w) => {
        const b = boundsOf([w]);
        const size = b.getSize(new THREE.Vector3());
        // the axle runs along the wheel's thinnest dimension
        const ax = size.x < size.y && size.x < size.z ? new THREE.Vector3(1, 0, 0) : size.y < size.z ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
        return spinner(w, b.getCenter(new THREE.Vector3()), ax);
      });
      // the payload's slide: from where it rests, towards the pivot, until its near face meets the first part of the
      // body in its way (anything beside it, at its height, not part of the lift)
      const payloadNode = object.getObjectByName(td.payload);
      let slide = new THREE.Vector3();
      if (payloadNode) {
        const pb = boundsOf([payloadNode]);
        const pc = pb.getCenter(new THREE.Vector3());
        const dir = new THREE.Vector3(pivot.x - pc.x, 0, pivot.z - pc.z).normalize();
        const side = new THREE.Vector3(-dir.z, 0, dir.x);
        const extent = (b: THREE.Box3, d: THREE.Vector3, f: (a: number, c: number) => number, start: number) => {
          let v = start;
          for (let i = 0; i < 8; i++) v = f(v, new THREE.Vector3(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).dot(d));
          return v;
        };
        const near = extent(pb, dir, Math.max, -Infinity);
        const [s0, s1] = [extent(pb, side, Math.min, Infinity), extent(pb, side, Math.max, -Infinity)];
        let gap = Infinity;
        object.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh || lift.some((l) => l === m || l.getObjectById(m.id))) return;
          const b = new THREE.Box3().setFromObject(m);
          if (b.max.y < pb.min.y || b.min.y > pb.max.y) return; // not at its height
          if (extent(b, side, Math.max, -Infinity) < s0 || extent(b, side, Math.min, Infinity) > s1) return; // not beside it
          const face = extent(b, dir, Math.min, Infinity);
          if (face >= near - 0.0005) gap = Math.min(gap, face - near);
        });
        if (isFinite(gap) && gap > 0.0015) {
          // as a move in the payload's parent's space
          const toLocal = new THREE.Matrix4().copy(payloadNode.parent!.matrixWorld).invert();
          slide = pc.clone().addScaledVector(dir, gap - 0.0005).applyMatrix4(toLocal).sub(pc.clone().applyMatrix4(toLocal));
        }
      }
      const liftSpinners = lift.map((n) => spinner(n, pivot, axis));
      drive = { lift: liftSpinners, wheels, payload: liftSpinners.find((s) => s.node === payloadNode) ?? null, slide };
      // part tabs pinned to a wheel would spin with it, out of reach: pin them to the wheel's (still) parent instead
      for (const part of parts) {
        const w = part && wheels.find((s) => s.node === part.anchor || s.node.getObjectById(part.anchor.id));
        if (!part || !w) continue;
        const world = part.anchor.localToWorld(part.local.clone());
        part.anchor = w.node.parent!;
        part.local = part.anchor.worldToLocal(world);
      }
    }
    return { object, rig, whole, focus, parts, drawers, drive };
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
    story.testDrive = false;
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
  const drive = useRef({ lift: 0, shownLift: 0, slide: 0, shownSlide: 0, speed: 0, angle: 0 });
  const slideShift = useMemo(() => new THREE.Vector3(), []);
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
    // test drive: raise the fork and spin the wheels up while it's on; ease both back down when it stops
    if (built.drive) {
      const d = drive.current;
      const on = story.testDrive ? 1 : 0;
      // raise, then slide; on the way back, slide back up first, then lower
      if (on) d.lift = Math.min(1, d.lift + (reducedMotion ? 1 : dt / LIFT_TIME));
      if (on && d.lift === 1) d.slide = Math.min(1, d.slide + (reducedMotion ? 1 : dt / SLIDE_TIME));
      if (!on) d.slide = Math.max(0, d.slide - (reducedMotion ? 1 : dt / SLIDE_TIME));
      if (!on && d.slide === 0) d.lift = Math.max(0, d.lift - (reducedMotion ? 1 : dt / LIFT_TIME));
      d.speed = THREE.MathUtils.lerp(d.speed, on * WHEEL_SPEED, Math.min(1, dt * 1.5));
      if (Math.abs(d.speed) < 0.01 && !on) d.speed = 0;
      d.angle += d.speed * dt;
      if (d.lift !== d.shownLift || d.slide !== d.shownSlide || d.speed) {
        // sliding picks up speed like it's under gravity
        const shift = slideShift.copy(built.drive.slide).multiplyScalar(d.slide * d.slide);
        built.drive.lift.forEach((s) => turn(s, ease(d.lift) * LIFT_ANGLE, s === built.drive!.payload ? shift : undefined));
        built.drive.wheels.forEach((s) => turn(s, d.angle));
        d.shownLift = d.lift;
        d.shownSlide = d.slide;
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
