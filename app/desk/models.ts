import * as THREE from "three";
import { asset } from "../asset";

// Helpers shared by the hologram and the inspect view for the project models in public/models/.

export const modelUrl = (file: string) => asset(`models/${file}`);

// three.js tidies node names on load (spaces become "_", some punctuation is dropped), so match on tidied names
const tidy = (s: string) => THREE.PropertyBinding.sanitizeNodeName(s);

// every node whose name starts with one of the prefixes (topmost matches only, so a part isn't counted twice)
export function findParts(root: THREE.Object3D, prefixes: string[]) {
  const want = prefixes.map(tidy);
  const found: THREE.Object3D[] = [];
  const walk = (o: THREE.Object3D) => {
    if (want.some((w) => o.name.startsWith(w))) found.push(o);
    else o.children.forEach(walk);
  };
  walk(root);
  return found;
}

export function boundsOf(objects: THREE.Object3D[]) {
  const box = new THREE.Box3();
  objects.forEach((o) => box.expandByObject(o));
  return box;
}

// Onshape exports are Z-up; turn them to three.js's Y-up.
export function standUp(root: THREE.Object3D, upZ?: boolean) {
  if (upZ) root.rotation.x = -Math.PI / 2;
  root.updateMatrixWorld(true);
}

// ---- the solar car door ----
// From the design notes: the hinge first slides the door straight out along the rail (the bearing, hinge plate, shaft
// supports, arms, mounts and door all move together), then the arms, mounts and door turn 30° up about the shaft.
// All these nodes share one parent (the assembly), so each pose is a transform applied in that parent's space.
const SLIDE = ["SBR16UU", "New Door Hinge", "ShaftSupport"];
const LIFT = ["Mounting Arm", "Mounts", "Door"];
const SLIDE_DIST = 0.06; // metres outward along the rail (-Z in the assembly)
const LIFT_ANGLE = THREE.MathUtils.degToRad(30);

export type HingeRig = { slide: THREE.Object3D[]; lift: THREE.Object3D[]; base: Map<THREE.Object3D, THREE.Matrix4>; pivot: THREE.Vector3 };

export function rigHinge(root: THREE.Object3D): HingeRig | null {
  const slide = findParts(root, SLIDE);
  const lift = findParts(root, LIFT).filter((o) => !o.name.startsWith(tidy("New Door Hinge")));
  if (!lift.length) return null;
  const base = new Map<THREE.Object3D, THREE.Matrix4>();
  [...slide, ...lift].forEach((o) => {
    o.matrixAutoUpdate = false;
    o.updateMatrix();
    base.set(o, o.matrix.clone());
  });
  // the shaft runs along Z through both shaft supports; it sits about two-thirds up the pillow blocks
  const supports = findParts(root, ["ShaftSupport"]);
  const parent = supports[0]?.parent ?? root;
  const box = boundsOf(supports);
  const pivotWorld = new THREE.Vector3((box.min.x + box.max.x) / 2, box.min.y + (box.max.y - box.min.y) * 0.65, 0);
  const pivot = parent.worldToLocal(pivotWorld.clone());
  return { slide, lift, base, pivot };
}

// t: 0 = closed, 0..0.5 = sliding out, 0.5..1 = lifting
const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const m1 = new THREE.Matrix4(),
  m2 = new THREE.Matrix4(),
  m3 = new THREE.Matrix4();
export function poseHinge(rig: HingeRig, t: number) {
  const s = ease(THREE.MathUtils.clamp(t * 2, 0, 1));
  const r = ease(THREE.MathUtils.clamp(t * 2 - 1, 0, 1));
  const slide = m1.makeTranslation(0, 0, -SLIDE_DIST * s);
  // rotate about the shaft (Z axis through the pivot); negative turns the door's rear end upward
  const lift = m2
    .makeTranslation(rig.pivot.x, rig.pivot.y, 0)
    .multiply(m3.makeRotationZ(-LIFT_ANGLE * r))
    .multiply(new THREE.Matrix4().makeTranslation(-rig.pivot.x, -rig.pivot.y, 0));
  for (const o of rig.slide) o.matrix.copy(slide).multiply(rig.base.get(o)!);
  for (const o of rig.lift) o.matrix.copy(slide).multiply(lift).multiply(rig.base.get(o)!);
  [...rig.slide, ...rig.lift].forEach((o) => (o.matrixWorldNeedsUpdate = true));
}
