// Turns the raw .glb exports in models-src/ into web-ready files in public/models/.
//   node scripts/prepare-models.mjs
// - figures: convert materials three.js can't read (spec/gloss) and shrink textures
// - projects: weld + simplify meshes, keep part names (the inspect view finds parts by name), compress with meshopt
// - hinge: split the door out of the car body so it can be animated
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, metalRough, meshopt, prune, simplify, textureCompress, weld } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";
import { mkdir, stat } from "node:fs/promises";

const SRC = "models-src";
const OUT = "public/models";
await mkdir(OUT, { recursive: true });
await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.encoder": MeshoptEncoder });

// Split the door panels out of the car body in the hinge assembly. The car is one mesh; the door is two separate
// shells (outer skin and inner panel) about 1.68 m long on the hinge side, so pick those by connected component.
function splitDoor(doc) {
  const carNode = doc.getRoot().listNodes().find((n) => n.getName() === "FINAL_CAR-2");
  const prim = carNode.getMesh().listPrimitives()[0];
  const pos = prim.getAttribute("POSITION");
  const idx = prim.getIndices();
  const n = pos.getCount();
  // weld by position, then union-find over triangles
  const key = new Map();
  const weldId = new Uint32Array(n);
  const p = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    pos.getElement(i, p);
    const k = `${p[0].toFixed(4)},${p[1].toFixed(4)},${p[2].toFixed(4)}`;
    if (!key.has(k)) key.set(k, key.size);
    weldId[i] = key.get(k);
  }
  const parent = new Int32Array(key.size).map((_, i) => i);
  const find = (a) => {
    while (parent[a] !== a) a = parent[a] = parent[parent[a]];
    return a;
  };
  const tris = idx.getCount() / 3;
  for (let t = 0; t < tris; t++) {
    const a = find(weldId[idx.getScalar(t * 3)]);
    parent[find(weldId[idx.getScalar(t * 3 + 1)])] = a;
    parent[find(weldId[idx.getScalar(t * 3 + 2)])] = a;
  }
  // bounds per component, in the car's own (local) coordinates
  const comps = new Map();
  for (let t = 0; t < tris; t++) {
    const r = find(weldId[idx.getScalar(t * 3)]);
    let c = comps.get(r);
    if (!c) comps.set(r, (c = { lo: [Infinity, Infinity, Infinity], hi: [-Infinity, -Infinity, -Infinity] }));
    for (let k = 0; k < 3; k++) {
      pos.getElement(idx.getScalar(t * 3 + k), p);
      for (let a = 0; a < 3; a++) {
        c.lo[a] = Math.min(c.lo[a], p[a]);
        c.hi[a] = Math.max(c.hi[a], p[a]);
      }
    }
  }
  // the car node is turned 90° about Y, so its local Z is the car's length and local X is across the car.
  // Door shells: ~1.68 m long, ~0.76 m tall, ~0.31 m deep, on the hinge side (the side nearest the hinge parts).
  const doorRoots = [...comps.entries()]
    .filter(([, c]) => {
      const len = c.hi[2] - c.lo[2], h = c.hi[1] - c.lo[1], d = c.hi[0] - c.lo[0];
      return len > 1.6 && len < 1.75 && h > 0.7 && h < 0.8 && d > 0.28 && d < 0.34;
    })
    .map(([r, c]) => ({ r, c }));
  // two doors x two shells: keep the pair on the hinge side (smaller world Z = larger local X after the 90° turn)
  const sideOf = ({ c }) => (c.lo[0] + c.hi[0]) / 2;
  const hingeSide = Math.max(...doorRoots.map(sideOf));
  const chosen = new Set(doorRoots.filter((d) => Math.abs(sideOf(d) - hingeSide) < 0.2).map((d) => d.r));
  if (chosen.size !== 2) throw new Error(`expected 2 door shells, found ${chosen.size}`);

  const keep = [], door = [];
  for (let t = 0; t < tris; t++) {
    const tri = [idx.getScalar(t * 3), idx.getScalar(t * 3 + 1), idx.getScalar(t * 3 + 2)];
    (chosen.has(find(weldId[tri[0]])) ? door : keep).push(...tri);
  }
  const Arr = idx.getArray().constructor;
  idx.setArray(new Arr(keep));
  const doorIdx = doc.createAccessor("door-indices").setType("SCALAR").setArray(new Arr(door)).setBuffer(idx.getBuffer());
  const doorPrim = prim.clone().setIndices(doorIdx);
  const doorMesh = doc.createMesh("Door").addPrimitive(doorPrim);
  const doorNode = doc
    .createNode("Door")
    .setMesh(doorMesh)
    .setTranslation(carNode.getTranslation())
    .setRotation(carNode.getRotation())
    .setScale(carNode.getScale());
  carNode.listParents().find((x) => x.propertyType === "Node").addChild(doorNode);
  carNode.setName("CarBody");
  // the second shaft support and mounting arm come through unnamed; name them after the part their mesh belongs to
  const nodes = doc.getRoot().listNodes();
  for (const node of nodes) {
    if (node.getName() || !node.getMesh()) continue;
    const twin = nodes.find((o) => o !== node && o.getName() && o.getMesh() === node.getMesh());
    if (twin) node.setName(twin.getName().replace(/-\d+$/, "-B"));
  }
  console.log(`  door: ${door.length / 3} triangles split from the car body`);
}

// Drop parts too small to see on the page (the robot's resistors, capacitors and other surface-mount parts):
// any mesh whose bounding box is under `size` metres on every side.
function dropTinyParts(size) {
  return (doc) => {
    let dropped = 0;
    for (const node of doc.getRoot().listNodes()) {
      const mesh = node.getMesh();
      if (!mesh) continue;
      const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
      for (const prim of mesh.listPrimitives()) {
        const a = prim.getAttribute("POSITION");
        const mn = a.getMin([]), mx = a.getMax([]);
        for (let k = 0; k < 3; k++) {
          lo[k] = Math.min(lo[k], mn[k]);
          hi[k] = Math.max(hi[k], mx[k]);
        }
      }
      const s = node.getScale();
      if (Math.max(...[0, 1, 2].map((k) => (hi[k] - lo[k]) * Math.abs(s[k]))) < size) {
        node.setMesh(null);
        dropped++;
      }
    }
    console.log(`  dropped ${dropped} parts under ${size * 1000} mm`);
  };
}

const jobs = [
  // figures
  { name: "goku", tex: 1024 },
  { name: "ironman", tex: 1024 },
  { name: "spiderman", tex: 1024 },
  { name: "hanuman", tex: 512, ratio: 0.35 },
  // projects
  { name: "hinge", ratio: 0.6, edit: splitDoor },
  { name: "robot", ratio: 0.25, edit: dropTinyParts(0.004) },
  { name: "aston", ratio: 0.35, tex: 1024 },
];

for (const job of jobs) {
  console.log(job.name);
  const doc = await io.read(`${SRC}/${job.name}.glb`);
  job.edit?.(doc);
  await doc.transform(
    metalRough(),
    dedup(),
    prune(),
    weld(),
    ...(job.ratio ? [simplify({ simplifier: MeshoptSimplifier, ratio: job.ratio, error: 0.0008 })] : []),
    ...(doc.getRoot().listTextures().length
      ? [textureCompress({ encoder: sharp, targetFormat: "webp", resize: [job.tex ?? 1024, job.tex ?? 1024] })]
      : []),
    prune(),
    meshopt({ encoder: MeshoptEncoder, level: "medium" }),
  );
  await io.write(`${OUT}/${job.name}.glb`, doc);
  const { size } = await stat(`${OUT}/${job.name}.glb`);
  console.log(`  -> ${OUT}/${job.name}.glb  ${(size / 1e6).toFixed(2)} MB`);
}
