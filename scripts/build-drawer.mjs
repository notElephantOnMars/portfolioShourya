// Assembles the drawer tower from its SolidWorks STL exports into models-src/drawer.glb (then run prepare-models).
//   node scripts/build-drawer.mjs [folder with Drawer Rack.STL, DrawerS.STL, DrawerM.STL, DrawerL.STL]
// The rack is 230 x 145 x 55 mm with 5 mm walls: three rows of five small drawers on top, and the large and medium
// drawers side by side on the bottom row. Every drawer sits against the back wall; one small drawer is pulled half
// out so the model reads as a drawer tower at a glance.
import { Document, NodeIO } from "@gltf-transform/core";
import { readFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";

const DIR = process.argv[2] ?? `${homedir()}/Desktop/Projects/Drawer`;
const MM = 0.001;
const WALL = 5;
const BACK = 5.3; // back wall plus the 0.3 mm sliding tolerance
const PULLED = { row: 2, col: 2, out: 32 }; // the drawer shown half open (row 0 is the bottom)

// binary STL -> flat-shaded triangle list (positions and face normals, in metres)
async function readStl(file) {
  const d = await readFile(`${DIR}/${file}`);
  const n = d.readUInt32LE(80);
  const pos = new Float32Array(n * 9);
  const nor = new Float32Array(n * 9);
  for (let i = 0; i < n; i++) {
    const o = 84 + 50 * i;
    const v = [];
    for (let k = 0; k < 3; k++) v.push([0, 1, 2].map((j) => d.readFloatLE(o + 12 + 12 * k + 4 * j) * MM));
    // recompute the normal from the winding (some exporters leave it zero)
    const e1 = v[1].map((x, j) => x - v[0][j]);
    const e2 = v[2].map((x, j) => x - v[0][j]);
    const c = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const len = Math.hypot(...c) || 1;
    for (let k = 0; k < 3; k++) {
      pos.set(v[k], i * 9 + k * 3);
      nor.set(c.map((x) => x / len), i * 9 + k * 3);
    }
  }
  return { pos, nor };
}

const doc = new Document();
const buffer = doc.createBuffer();
const scene = doc.createScene("Drawer tower");
const root = doc.createNode("Drawer tower");
scene.addChild(root);

const material = (name, color, roughness) =>
  doc.createMaterial(name).setBaseColorFactor([...color, 1]).setRoughnessFactor(roughness).setMetallicFactor(0);
const mats = {
  rack: material("PLA charcoal", [0.05, 0.055, 0.065], 0.6),
  drawer: material("PLA white", [0.78, 0.8, 0.83], 0.55),
};

async function meshFrom(file, name, mat) {
  const { pos, nor } = await readStl(file);
  const prim = doc
    .createPrimitive()
    .setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(pos).setBuffer(buffer))
    .setAttribute("NORMAL", doc.createAccessor().setType("VEC3").setArray(nor).setBuffer(buffer))
    .setMaterial(mat);
  return doc.createMesh(name).addPrimitive(prim);
}

const rack = await meshFrom("Drawer Rack.STL", "Drawer Rack", mats.rack);
const small = await meshFrom("DrawerS.STL", "DrawerS", mats.drawer);
const medium = await meshFrom("DrawerM.STL", "DrawerM", mats.drawer);
const large = await meshFrom("DrawerL.STL", "DrawerL", mats.drawer);

root.addChild(doc.createNode("Drawer Rack").setMesh(rack));
const place = (name, mesh, x, y, out = 0) =>
  root.addChild(doc.createNode(name).setMesh(mesh).setTranslation([(x + 0.2) * MM, (y + 0.2) * MM, (BACK + out) * MM]));

// slot corners: columns every 45 mm from x = 5, rows every 35 mm from y = 5
let k = 0;
for (let row = 1; row <= 3; row++)
  for (let col = 0; col < 5; col++) {
    const out = row === PULLED.row && col === PULLED.col ? PULLED.out : 0;
    place(`DrawerS-${++k}`, small, WALL + col * 45, WALL + row * 35, out);
  }
place("DrawerL", large, WALL, WALL);
place("DrawerM", medium, WALL + 3 * 45, WALL);

await mkdir("models-src", { recursive: true });
await new NodeIO().write("models-src/drawer.glb", doc);
console.log("models-src/drawer.glb");
