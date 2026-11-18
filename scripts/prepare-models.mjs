// Turns the raw .glb exports in models-src/ into web-ready files in public/models/.
//   node scripts/prepare-models.mjs [name ...]
// - figures: convert materials three.js can't read (spec/gloss) and shrink textures
// - projects: weld + simplify meshes, keep part names (the inspect view finds parts by name), compress with meshopt
// - hinge: split the door out of the car body so it can be animated
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, mergeDocuments, metalRough, meshopt, prune, simplify, textureCompress, weld } from "@gltf-transform/functions";
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
  measureSlide(doc, carNode);
}

// How far the hinge can slide out before it meets the car's side wall: cast rays from every vertex of the parts that
// slide, outward along the rail (-Z in the assembly), against the car body, and take the nearest hit (less 2 mm
// clearance). Stored on the assembly node as extras.slide, which the site reads as userData.slide.
function measureSlide(doc, carNode) {
  const xf = (m, p) => [
    m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
    m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
  ];
  const worldVerts = (node) => {
    const m = node.getWorldMatrix(), out = [], q = [0, 0, 0];
    for (const prim of node.getMesh().listPrimitives()) {
      const a = prim.getAttribute("POSITION");
      for (let i = 0; i < a.getCount(); i++) out.push(xf(m, a.getElement(i, q)));
    }
    return out;
  };
  // car body triangles in assembly space
  const cm = carNode.getWorldMatrix();
  const prim = carNode.getMesh().listPrimitives()[0];
  const pos = prim.getAttribute("POSITION"), idx = prim.getIndices();
  const tris = [], q = [0, 0, 0];
  for (let t = 0; t < idx.getCount(); t += 3)
    tris.push([0, 1, 2].map((k) => xf(cm, pos.getElement(idx.getScalar(t + k), q))));
  // ray (origin o, direction -Z) against triangle: Moller-Trumbore with d = (0,0,-1)
  const hit = (o, [a, b, c]) => {
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const p = [e2[1], -e2[0], 0]; // d x e2, with d = (0, 0, -1)
    const det = e1[0] * p[0] + e1[1] * p[1];
    if (Math.abs(det) < 1e-12) return Infinity;
    const s = [o[0] - a[0], o[1] - a[1], o[2] - a[2]];
    const u = (s[0] * p[0] + s[1] * p[1]) / det;
    if (u < 0 || u > 1) return Infinity;
    const qv = [s[1] * e1[2] - s[2] * e1[1], s[2] * e1[0] - s[0] * e1[2], s[0] * e1[1] - s[1] * e1[0]];
    const v = -qv[2] / det; // d . q with d=(0,0,-1)
    if (v < 0 || u + v > 1) return Infinity;
    const t = (e2[0] * qv[0] + e2[1] * qv[1] + e2[2] * qv[2]) / det;
    return t > 1e-6 ? t : Infinity;
  };
  const movers = doc.getRoot().listNodes().filter((n) => n.getMesh() && /^(New Door Hinge|ShaftSupport|SBR16UU)/.test(n.getName()));
  let best = Infinity, who = "";
  for (const node of movers) {
    const verts = worldVerts(node);
    const step = Math.max(1, Math.floor(verts.length / 400));
    for (let i = 0; i < verts.length; i += step) {
      const o = verts[i];
      for (const tri of tris) {
        const t = hit(o, tri);
        if (t < best) {
          best = t;
          who = node.getName();
        }
      }
    }
  }
  // the bearing also can't run past the end of its rail
  const zMin = (node) => {
    let z = Infinity;
    node.traverse((n) => n.getMesh() && worldVerts(n).forEach((v) => (z = Math.min(z, v[2]))));
    return z;
  };
  const railNode = doc.getRoot().listNodes().find((n) => n.getName() === "Rail");
  const bearing = doc.getRoot().listNodes().find((n) => n.getName() === "SBR16UU-1");
  const railTravel = zMin(bearing) - zMin(railNode);
  console.log(`  wall: ${(best * 1000).toFixed(1)} mm (${who}), rail end: ${(railTravel * 1000).toFixed(1)} mm`);
  if (railTravel < best) {
    best = railTravel;
    who = "the end of the rail";
  }
  const slide = Math.max(0, best - 0.002);
  carNode.listParents().find((x) => x.propertyType === "Node").setExtras({ slide });
  console.log(`  slide: ${(slide * 1000).toFixed(1)} mm (stopped by ${who})`);
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

// The delivery robot's wheel base: the 4WD buggy chassis cut down to the real robot's layout (the front pair of driven
// wheels, a ball caster in the round hole at the plate's nose, and the plate cut off before the lift), seated under the
// T-chassis. Both files are Onshape exports in the same Z-up frame; the robot's front is -Y (sensors), its back +Y (lift).
const PLATE_END = 0.005; // buggy frame: the plate is cut off past this y (towards the lift)
const BALL_Y = -0.1025; // the ball caster sits under the round hole at the plate's nose (about 18 mm across)
const HOLE_R = 0.0085;
// drop the plate's triangles past y = end (world y; both decks share a mesh and the same y, so cutting once is enough)
const cutDone = new Set();
function cutPlate(node, end) {
  const m = node.getWorldMatrix();
  for (const prim of node.getMesh().listPrimitives()) {
    if (cutDone.has(prim)) continue;
    cutDone.add(prim);
    const pos = prim.getAttribute("POSITION");
    const idx = prim.getIndices();
    const tri = idx ? Array.from(idx.getArray()) : [...Array(pos.getCount()).keys()];
    const y = (i) => {
      const p = pos.getElement(i, []);
      return m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13];
    };
    const keep = [];
    for (let t = 0; t < tri.length; t += 3)
      if ((y(tri[t]) + y(tri[t + 1]) + y(tri[t + 2])) / 3 <= end) keep.push(tri[t], tri[t + 1], tri[t + 2]);
    const out = idx ? idx.clone() : prim.getAttribute("POSITION").clone().setType("SCALAR"); // fresh index accessor
    prim.setIndices(out.setArray(new Uint32Array(keep)));
  }
}

async function addWheelBase(doc) {
  const buggy = await io.read(`${SRC}/buggy.glb`);
  const root = buggy.getRoot();
  const xf = (m, p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];
  const centre = (node) => {
    const m = node.getWorldMatrix(), lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (const prim of node.getMesh().listPrimitives()) {
      const a = prim.getAttribute("POSITION");
      for (const c of [a.getMin([]), a.getMax([])]) {
        const w = xf(m, c);
        for (let k = 0; k < 3; k++) {
          lo[k] = Math.min(lo[k], w[k]);
          hi[k] = Math.max(hi[k], w[k]);
        }
      }
    }
    return { lo, hi, c: lo.map((v, k) => (v + hi[k]) / 2) };
  };
  // drop the deck hardware and the rear pair of wheels and motors; measure the chassis (two decks) and the
  // wheels that stay
  const chassis = { lo: [Infinity, Infinity, Infinity], hi: [-Infinity, -Infinity, -Infinity] };
  let groundZ = Infinity;
  for (const node of root.listNodes()) {
    if (!node.getMesh()) continue;
    const name = node.getName();
    const { lo, hi, c } = centre(node);
    const hardware = /screw|standoff|nut|M3 X/i.test(name);
    const rear = c[1] > PLATE_END && /wheel|tyre|Motor_Gear|motor mount|Component2/i.test(name);
    if (hardware || rear) {
      node.setMesh(null);
      continue;
    }
    if (/chassis/i.test(name)) {
      cutPlate(node, PLATE_END);
      for (let k = 0; k < 3; k++) {
        chassis.lo[k] = Math.min(chassis.lo[k], lo[k]);
        chassis.hi[k] = Math.max(chassis.hi[k], hi[k]);
      }
    }
    if (/wheel|tyre/i.test(name)) groundZ = Math.min(groundZ, lo[2]);
  }
  // ball caster: a steel ball held under a black cylinder that passes up through the hole in the bottom deck
  const cx = (chassis.lo[0] + chassis.hi[0]) / 2;
  const R = 0.0115;
  const ballY = BALL_Y;
  const buf = root.listBuffers()[0] ?? buggy.createBuffer();
  const mesh = (name, positions, normals, indices, material) => {
    const prim = buggy
      .createPrimitive()
      .setAttribute("POSITION", buggy.createAccessor().setType("VEC3").setArray(new Float32Array(positions)).setBuffer(buf))
      .setAttribute("NORMAL", buggy.createAccessor().setType("VEC3").setArray(new Float32Array(normals)).setBuffer(buf))
      .setIndices(buggy.createAccessor().setType("SCALAR").setArray(new Uint16Array(indices)).setBuffer(buf))
      .setMaterial(material);
    return buggy.createMesh(name).addPrimitive(prim);
  };
  const sphere = (r, seg = 20, rings = 14) => {
    const p = [], n = [], i = [];
    for (let a = 0; a <= rings; a++)
      for (let b = 0; b <= seg; b++) {
        const t = (a / rings) * Math.PI, f = (b / seg) * Math.PI * 2;
        const v = [Math.sin(t) * Math.cos(f), Math.sin(t) * Math.sin(f), Math.cos(t)];
        n.push(...v);
        p.push(...v.map((x) => x * r));
      }
    for (let a = 0; a < rings; a++)
      for (let b = 0; b < seg; b++) {
        const k = a * (seg + 1) + b;
        i.push(k, k + seg + 1, k + 1, k + 1, k + seg + 1, k + seg + 2);
      }
    return [p, n, i];
  };
  const cylinder = (r, h, seg = 24) => {
    const p = [], n = [], i = [];
    for (let b = 0; b <= seg; b++) {
      const f = (b / seg) * Math.PI * 2, x = Math.cos(f), y = Math.sin(f);
      p.push(x * r, y * r, 0, x * r, y * r, h);
      n.push(x, y, 0, x, y, 0);
    }
    for (let b = 0; b < seg; b++) i.push(b * 2, b * 2 + 2, b * 2 + 1, b * 2 + 1, b * 2 + 2, b * 2 + 3);
    return [p, n, i];
  };
  const steel = buggy.createMaterial("ball steel").setBaseColorFactor([0.8, 0.82, 0.85, 1]).setMetallicFactor(1).setRoughnessFactor(0.2);
  const black = buggy.createMaterial("caster holder").setBaseColorFactor([0.06, 0.06, 0.07, 1]).setMetallicFactor(0.2).setRoughnessFactor(0.6);
  const ballZ = groundZ + R;
  const holderTop = chassis.lo[2] + 0.003; // flush with the top of the bottom deck
  const caster = buggy.createNode("Ball caster").setTranslation([cx, ballY, 0]);
  caster.addChild(buggy.createNode("Ball caster ball").setMesh(mesh("ball", ...sphere(R), steel)).setTranslation([0, 0, ballZ]));
  caster.addChild(
    buggy
      .createNode("Ball caster holder")
      .setMesh(mesh("holder", ...cylinder(HOLE_R, holderTop - ballZ), black))
      .setTranslation([0, 0, ballZ]),
  );
  // seat it: chassis top against the robot's T-chassis underside, centred under the whole robot
  const top = chassis.hi[2];
  const base = buggy.createNode("Wheel base").setTranslation([-0.002 - cx, 0.078, 0.001 - top]);
  const scene = root.listScenes()[0];
  for (const child of scene.listChildren()) {
    scene.removeChild(child);
    base.addChild(child);
  }
  base.addChild(caster);
  scene.addChild(base);
  // merge into the robot file
  mergeDocuments(doc, buggy);
  const [main, extra] = doc.getRoot().listScenes();
  for (const child of extra.listChildren()) {
    extra.removeChild(child);
    main.addChild(child);
  }
  extra.dispose();
  // one buffer is enough for the meshopt step
  const [keep, ...rest] = doc.getRoot().listBuffers();
  for (const a of doc.getRoot().listAccessors()) a.setBuffer(keep);
  rest.forEach((b) => b.dispose());
  console.log(`  wheel base added: chassis ${(top - chassis.lo[2]) * 1000 | 0} mm tall, wheels reach ${((top - groundZ) * 1000) | 0} mm below its top`);
}

const jobs = [
  // figures
  { name: "goku", tex: 1024 },
  { name: "ironman", tex: 1024 },
  { name: "spiderman", tex: 1024 },
  { name: "hanuman", tex: 512, ratio: 0.35 },
  // projects
  { name: "hinge", ratio: 0.6, edit: splitDoor },
  { name: "robot", ratio: 0.25, edit: async (doc) => (dropTinyParts(0.004)(doc), await addWheelBase(doc)) },
  { name: "aston", ratio: 0.35, tex: 1024 },
  { name: "drawer" }, // assembled from STLs by scripts/build-drawer.mjs
];

// optional names on the command line limit the run to those models
const only = process.argv.slice(2);
for (const job of jobs.filter((j) => !only.length || only.includes(j.name))) {
  console.log(job.name);
  const doc = await io.read(`${SRC}/${job.name}.glb`);
  await job.edit?.(doc);
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
