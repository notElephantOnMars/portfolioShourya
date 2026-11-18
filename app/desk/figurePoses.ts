import * as THREE from "three";

// Poses for the downloaded figurines, which come in a T-pose. Directions are in the figure's own frame:
// +Z = the way it faces, +Y = up, +X = its left. Applied once, to a fresh copy of the model, before it's measured.

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).normalize();

// ---- Spider-Man: rigged, so aim each bone at a direction ----
// Point `bone` (towards its first child) along `dir`, keeping the rest of the chain attached.
function aim(bone: THREE.Object3D, dir: THREE.Vector3, frame: THREE.Quaternion) {
  const child = bone.children.find((c) => (c as THREE.Bone).isBone);
  if (!child) return;
  bone.updateWorldMatrix(true, true);
  const a = bone.getWorldPosition(new THREE.Vector3());
  const b = child.getWorldPosition(new THREE.Vector3());
  const from = b.sub(a).normalize();
  const to = dir.clone().applyQuaternion(frame).normalize();
  const turn = new THREE.Quaternion().setFromUnitVectors(from, to);
  const world = bone.getWorldQuaternion(new THREE.Quaternion());
  const parent = bone.parent!.getWorldQuaternion(new THREE.Quaternion());
  bone.quaternion.copy(parent.invert().multiply(turn).multiply(world));
  bone.updateWorldMatrix(false, true);
}

// The classic "thwip": right arm thrown forward and up shooting a web, left arm braced low, feet planted wide.
const THWIP: [string, THREE.Vector3][] = [
  ["RightArm", v(-0.35, 0.45, 0.85)],
  ["RightForeArm", v(-0.2, 0.55, 0.85)],
  ["RightHand", v(-0.15, 0.6, 0.8)],
  ["LeftArm", v(0.45, -0.75, 0.35)],
  ["LeftForeArm", v(0.2, -0.2, 0.95)],
  ["LeftHand", v(0.15, -0.1, 1)],
  ["LeftUpLeg", v(0.35, -0.9, 0.15)],
  ["LeftLeg", v(0.15, -1, -0.05)],
  ["RightUpLeg", v(-0.35, -0.9, -0.1)],
  ["RightLeg", v(-0.2, -1, -0.15)],
];

export function poseSpiderMan(model: THREE.Object3D) {
  model.updateMatrixWorld(true);
  // the figure's frame in world space: the hips' parent orientation (Mixamo rigs face +Z with left at +X)
  const bones = new Map<string, THREE.Object3D>();
  model.traverse((o) => {
    if ((o as THREE.Bone).isBone) bones.set(o.name.replace(/^mixamorig:?/, "").replace(/_\d+$/, ""), o);
  });
  const hips = bones.get("Hips");
  if (!hips) return;
  const frame = (hips.parent ?? model).getWorldQuaternion(new THREE.Quaternion());
  for (const [name, dir] of THWIP) {
    const bone = bones.get(name);
    if (bone) aim(bone, dir, frame);
  }
  model.updateMatrixWorld(true);
}

// ---- Iron Man: no rig, so bend the mesh itself ----
// Every mesh is baked into the figure's own space first, then the arms are swung about the shoulders, blending
// smoothly across the shoulder so the armour bends instead of tearing.
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function poseIronMan(model: THREE.Object3D, facing = 1) {
  model.updateMatrixWorld(true);
  const toModel = new THREE.Matrix4().copy(model.matrixWorld).invert();
  const meshes: THREE.Mesh[] = [];
  model.traverse((o) => (o as THREE.Mesh).isMesh && meshes.push(o as THREE.Mesh));
  // bake each mesh's transform into a copy of its geometry, in model space
  for (const m of meshes) {
    const g = m.geometry.clone();
    // compressed models store positions and normals as normalized integers; bending needs full-precision floats.
    // The normals are kept and turned with their vertices (recomputing them flips this model's normals inward).
    for (const name of ["position", "normal"]) {
      const src = g.attributes[name];
      if (!src) continue;
      const flat = new Float32Array(src.count * 3);
      for (let i = 0; i < src.count; i++) flat.set([src.getX(i), src.getY(i), src.getZ(i)], i * 3);
      g.setAttribute(name, new THREE.BufferAttribute(flat, 3));
    }
    g.deleteAttribute("tangent"); // recomputed after bending
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(toModel, m.matrixWorld));
    m.geometry = g;
    model.attach(m);
    m.position.set(0, 0, 0);
    m.rotation.set(0, 0, 0);
    m.scale.set(1, 1, 1);
  }
  const box = new THREE.Box3();
  meshes.forEach((m) => {
    m.geometry.computeBoundingBox();
    box.union(m.geometry.boundingBox!);
  });
  const H = box.max.y - box.min.y;
  const cx = (box.min.x + box.max.x) / 2,
    cz = (box.min.z + box.max.z) / 2;
  const shoulderY = box.min.y + 0.8 * H;
  const shoulderX = 0.12 * H; // the arms start about here either side of the centre line
  const up = new THREE.Vector3(0, 1, 0);
  // targets in the figure's frame: right arm (−X) straight out in front, a touch raised (repulsor);
  // left arm (+X) hanging down by the side
  const targets: Record<number, THREE.Vector3> = { [-1]: v(0, 0.12, facing), [1]: v(0.14, -1, 0.04) };
  const p = new THREE.Vector3(),
    nv = new THREE.Vector3(),
    q = new THREE.Quaternion();
  // how much a vertex follows its arm: ramps up across the shoulder; lower down (the model rests in an A-pose, so
  // the hands hang to about half height) only what's far out to the side counts, which keeps the hips still
  const weight = (x: number, y: number) => {
    const out = Math.abs(x - cx);
    if (y > box.min.y + 0.62 * H) return smooth(shoulderX - 0.04 * H, shoulderX + 0.05 * H, out);
    if (y > box.min.y + 0.4 * H) return smooth(0.16 * H, 0.2 * H, out);
    return 0;
  };

  for (const side of [-1, 1]) {
    const pivot = new THREE.Vector3(cx + side * shoulderX, shoulderY, cz);
    // where this arm points now: the average direction of its fully-weighted vertices from the shoulder
    const dir = new THREE.Vector3();
    let n = 0;
    for (const m of meshes) {
      const pos = m.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        p.fromBufferAttribute(pos, i);
        if (Math.sign(p.x - cx) === side && weight(p.x, p.y) >= 1) {
          dir.add(p.sub(pivot));
          n++;
        }
      }
    }
    if (!n) continue;
    dir.normalize();
    let armLen = 0;
    for (const m of meshes) {
      const pos = m.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        p.fromBufferAttribute(pos, i);
        if (Math.sign(p.x - cx) === side && weight(p.x, p.y) > 0) armLen = Math.max(armLen, p.sub(pivot).dot(dir));
      }
    }
    const swing = new THREE.Quaternion().setFromUnitVectors(dir, targets[side]);
    // right hand: bend up at the wrist (palm turns to face along the arm, then forward once the arm swings)
    const bend = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3().crossVectors(dir, up).normalize(), THREE.MathUtils.degToRad(75));
    const wrist = dir.clone().multiplyScalar(0.8 * armLen);
    for (const m of meshes) {
      const pos = m.geometry.attributes.position as THREE.BufferAttribute;
      const nor = m.geometry.attributes.normal as THREE.BufferAttribute | undefined;
      for (let i = 0; i < pos.count; i++) {
        p.fromBufferAttribute(pos, i);
        if (Math.sign(p.x - cx) !== side) continue;
        const w = weight(p.x, p.y);
        if (w <= 0) continue;
        if (nor) nv.fromBufferAttribute(nor, i);
        p.sub(pivot);
        if (side < 0) {
          const h = smooth(0.76, 0.84, p.dot(dir) / armLen);
          if (h > 0) {
            q.identity().slerp(bend, h);
            p.sub(wrist).applyQuaternion(q).add(wrist);
            nv.applyQuaternion(q);
          }
        }
        q.identity().slerp(swing, w);
        p.applyQuaternion(q).add(pivot);
        pos.setXYZ(i, p.x, p.y, p.z);
        if (nor) {
          nv.applyQuaternion(q).normalize();
          nor.setXYZ(i, nv.x, nv.y, nv.z);
        }
      }
    }
  }
  for (const m of meshes) {
    // the model's armour is a perfect mirror (metalness 1), which only reflects black in this dark room;
    // a satin finish lets the lamp light the red and gold
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    m.material = mats.map((x) => {
      const c = x.clone() as THREE.MeshStandardMaterial;
      c.metalness = 0.55;
      c.roughness = 0.38;
      return c;
    })[0];
    m.geometry.attributes.position.needsUpdate = true;
    if (m.geometry.attributes.normal) m.geometry.attributes.normal.needsUpdate = true;
    else m.geometry.computeVertexNormals();
    if (m.geometry.attributes.uv) m.geometry.computeTangents(); // the armour's normal map needs them
    m.geometry.computeBoundingBox();
    m.geometry.computeBoundingSphere();
  }
}
