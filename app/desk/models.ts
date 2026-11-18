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
// From the design notes: the hinge first slides straight out along the rail (bearing and shaft supports, carrying the
// hinge plate, mounting arms and door), stopping where it meets the car's side wall or the end of the rail, then the
// hinge plate, mounting arms and door turn 30° up about the shaft. The small angled mount plate at the end of the
// hinge arm isn't part of this design, so it's hidden. All these nodes share one parent (the assembly), so each pose
// is a transform in that parent's space.
const SLIDE = ["SBR16UU", "ShaftSupport"];
const LIFT = ["New Door Hinge", "Mounting Arm", "Door"];
const HIDE = ["Mounts"];
const SLIDE_FALLBACK = 0.02; // metres; the real distance is measured by scripts/prepare-models.mjs (userData.slide)
const LIFT_ANGLE = THREE.MathUtils.degToRad(30);

export type HingeRig = {
  slide: THREE.Object3D[];
  lift: THREE.Object3D[];
  base: Map<THREE.Object3D, THREE.Matrix4>;
  pivot: THREE.Vector3;
  distance: number;
};

export function rigHinge(root: THREE.Object3D): HingeRig | null {
  findParts(root, HIDE).forEach((o) => (o.visible = false));
  const slide = findParts(root, SLIDE);
  const lift = findParts(root, LIFT);
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
  const distance = typeof parent.userData.slide === "number" ? parent.userData.slide : SLIDE_FALLBACK;
  return { slide, lift, base, pivot, distance };
}

// t: 0 = closed, 0..0.5 = sliding out, 0.5..1 = lifting
const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const m1 = new THREE.Matrix4(),
  m2 = new THREE.Matrix4(),
  m3 = new THREE.Matrix4();
export function poseHinge(rig: HingeRig, t: number) {
  const s = ease(THREE.MathUtils.clamp(t * 2, 0, 1));
  const r = ease(THREE.MathUtils.clamp(t * 2 - 1, 0, 1));
  const slide = m1.makeTranslation(0, 0, -rig.distance * s);
  // rotate about the shaft (Z axis through the pivot); negative turns the door's rear end upward
  const lift = m2
    .makeTranslation(rig.pivot.x, rig.pivot.y, 0)
    .multiply(m3.makeRotationZ(-LIFT_ANGLE * r))
    .multiply(new THREE.Matrix4().makeTranslation(-rig.pivot.x, -rig.pivot.y, 0));
  for (const o of rig.slide) o.matrix.copy(slide).multiply(rig.base.get(o)!);
  for (const o of rig.lift) o.matrix.copy(slide).multiply(lift).multiply(rig.base.get(o)!);
  [...rig.slide, ...rig.lift].forEach((o) => (o.matrixWorldNeedsUpdate = true));
}
