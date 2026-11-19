import * as THREE from "three";
import { siteFont } from "./textures";

// What's inside the drawer tower's openable drawers, built from simple shapes at true size (metres): an Arduino
// kit's worth of parts. Each builder fills a drawer's inside (width x depth, floor at y = 0, front at z = depth) and
// lays its parts out the same way every time (a seeded shuffle), so the view is stable between visits.

export type DrawerContents = "jumpers" | "lcd" | "resistors" | "leds" | "capacitors" | "buttons";

const mm = (x: number) => x / 1000;
function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

// shared materials (one set for every drawer)
const mat = (color: string, o: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0, ...o });
const M = {
  wire: mat("#c9ccd2", { metalness: 0.9, roughness: 0.3 }),
  resistor: mat("#d9c497", { roughness: 0.6 }),
  black: mat("#141518", { roughness: 0.55 }),
  pcb: mat("#1f6b3a", { roughness: 0.45 }),
  bezel: mat("#0c0d10", { roughness: 0.4 }),
  capBlue: mat("#1f3f93", { roughness: 0.35 }),
  capStripe: mat("#c9d2e6", { roughness: 0.4 }),
  ceramic: mat("#d98a2b", { roughness: 0.5 }),
  steel: mat("#b8bcc4", { metalness: 0.85, roughness: 0.35 }),
};
const BAND = ["#000000", "#7a4a1e", "#d1281f", "#f07a12", "#f2d21b", "#2f9a3c", "#2453c9", "#7e3fb2", "#808080", "#f2f2f2"];
const GOLD = mat("#c9a23a", { metalness: 0.8, roughness: 0.35 });
const bandMats = BAND.map((c) => mat(c, { roughness: 0.45 }));
const ledMats = ["#ff3b30", "#34c759", "#2f7bff", "#ffd60a", "#f2f2f2"].map(
  (c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.25, transparent: true, opacity: 0.82, roughness: 0.15 }),
);
const wireColours = ["#e53935", "#fb8c00", "#fdd835", "#43a047", "#1e88e5", "#8e24aa", "#212121", "#fafafa", "#6d4c41", "#757575"].map((c) =>
  mat(c, { roughness: 0.55 }),
);

// shared geometries
const G = {
  lead: new THREE.CylinderGeometry(mm(0.25), mm(0.25), 1, 6), // length 1, scaled per use
  resBody: new THREE.CapsuleGeometry(mm(1.15), mm(4), 4, 12),
  band: new THREE.CylinderGeometry(mm(1.22), mm(1.22), mm(0.55), 12),
  ledBody: new THREE.CylinderGeometry(mm(2.5), mm(2.5), mm(5.5), 16),
  ledDome: new THREE.SphereGeometry(mm(2.5), 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
  ledFlange: new THREE.CylinderGeometry(mm(2.9), mm(2.9), mm(1), 16),
  cap: new THREE.CylinderGeometry(mm(3), mm(3), mm(7), 16),
  capStripe: new THREE.CylinderGeometry(mm(3.02), mm(3.02), mm(7), 16, 1, true, 0, 0.9),
  capTop: new THREE.CylinderGeometry(mm(2.7), mm(2.7), mm(0.2), 16),
  ceramic: new THREE.SphereGeometry(mm(2.4), 12, 8),
  btnBase: new THREE.BoxGeometry(mm(6), mm(3.4), mm(6)),
  btnPlate: new THREE.BoxGeometry(mm(6.05), mm(0.3), mm(6.05)),
  btnCap: new THREE.CylinderGeometry(mm(1.75), mm(1.75), mm(1.5), 16),
  pin: new THREE.BoxGeometry(mm(0.64), mm(6), mm(0.64)),
};

// a straight wire lead from a to b
function lead(a: THREE.Vector3, b: THREE.Vector3, m = M.wire) {
  const l = new THREE.Mesh(G.lead, m);
  l.position.copy(a).add(b).multiplyScalar(0.5);
  l.scale.y = a.distanceTo(b);
  l.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return l;
}

// ---- parts, each built lying in its own frame, then dropped into a drawer ----
function resistor(r: () => number) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(G.resBody, M.resistor);
  body.rotation.z = Math.PI / 2;
  g.add(body);
  // four colour bands: two digits, a multiplier, gold tolerance
  const bands = [bandMats[1 + Math.floor(r() * 9)], bandMats[Math.floor(r() * 10)], bandMats[Math.floor(r() * 6)], GOLD];
  bands.forEach((m, i) => {
    const b = new THREE.Mesh(G.band, m);
    b.rotation.z = Math.PI / 2;
    b.position.x = mm(-2.1 + i * 1.3 + (i === 3 ? 0.6 : 0));
    g.add(b);
  });
  g.add(lead(new THREE.Vector3(mm(-3), 0, 0), new THREE.Vector3(mm(-12), 0, 0)));
  g.add(lead(new THREE.Vector3(mm(3), 0, 0), new THREE.Vector3(mm(12), 0, 0)));
  g.position.y = mm(1.2);
  return g;
}

function led(r: () => number) {
  const g = new THREE.Group();
  const m = ledMats[Math.floor(r() * ledMats.length)];
  const body = new THREE.Group();
  const cyl = new THREE.Mesh(G.ledBody, m);
  cyl.position.y = mm(2.75);
  const dome = new THREE.Mesh(G.ledDome, m);
  dome.position.y = mm(5.5);
  const flange = new THREE.Mesh(G.ledFlange, m);
  flange.position.y = mm(0.5);
  body.add(cyl, dome, flange);
  body.add(lead(new THREE.Vector3(mm(-1.27), 0, 0), new THREE.Vector3(mm(-1.27), mm(-19), 0)));
  body.add(lead(new THREE.Vector3(mm(1.27), 0, 0), new THREE.Vector3(mm(1.27), mm(-17), 0)));
  // lying on its side
  body.rotation.z = Math.PI / 2;
  g.add(body);
  g.position.y = mm(2.9);
  return g;
}

function capacitor(r: () => number) {
  const g = new THREE.Group();
  if (r() < 0.65) {
    // electrolytic, on its side
    const can = new THREE.Group();
    can.add(new THREE.Mesh(G.cap, M.capBlue), new THREE.Mesh(G.capStripe, M.capStripe));
    const top = new THREE.Mesh(G.capTop, M.steel);
    top.position.y = mm(3.5);
    can.add(top);
    can.add(lead(new THREE.Vector3(mm(-1), mm(-3.5), 0), new THREE.Vector3(mm(-1), mm(-16), 0)));
    can.add(lead(new THREE.Vector3(mm(1), mm(-3.5), 0), new THREE.Vector3(mm(1), mm(-14), 0)));
    can.rotation.z = Math.PI / 2;
    can.rotation.y = r() * Math.PI;
    g.add(can);
    g.position.y = mm(3);
  } else {
    // ceramic disc
    const disc = new THREE.Mesh(G.ceramic, M.ceramic);
    disc.scale.set(1, 1, 0.45);
    disc.rotation.x = Math.PI / 2;
    g.add(disc);
    g.add(lead(new THREE.Vector3(mm(-1.2), 0, mm(2)), new THREE.Vector3(mm(-1.2), 0, mm(12))));
    g.add(lead(new THREE.Vector3(mm(1.2), 0, mm(2)), new THREE.Vector3(mm(1.2), 0, mm(12))));
    g.position.y = mm(1.1);
  }
  return g;
}

function button() {
  const g = new THREE.Group();
  const base = new THREE.Mesh(G.btnBase, M.black);
  base.position.y = mm(1.7);
  const plate = new THREE.Mesh(G.btnPlate, M.steel);
  plate.position.y = mm(3.45);
  const cap = new THREE.Mesh(G.btnCap, M.black);
  cap.position.y = mm(4.3);
  g.add(base, plate, cap);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const leg = new THREE.Mesh(G.pin, M.steel);
      leg.scale.y = 0.35;
      leg.position.set(sx * mm(3.3), mm(1), sz * mm(2.2));
      g.add(leg);
    }
  return g;
}

// the 16x2 character LCD's screen: a canvas of blocky characters on the backlight green
let lcdTex: THREE.CanvasTexture | null = null;
function lcdTexture() {
  if (lcdTex) return lcdTex;
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "#7fbf3a";
  g.fillRect(0, 0, 512, 128);
  g.fillStyle = "rgba(20,50,10,0.12)"; // the unlit character cells
  for (let row = 0; row < 2; row++) for (let col = 0; col < 16; col++) g.fillRect(14 + col * 30.5, 14 + row * 56, 26, 44);
  g.fillStyle = "#16300c";
  g.font = `500 44px ${siteFont("pixel")}`;
  const line = (s: string, row: number) => [...s].forEach((ch, col) => g.fillText(ch, 16 + col * 30.5, 52 + row * 56));
  line("HELLO, WORLD!", 0);
  line("> READY_", 1);
  lcdTex = new THREE.CanvasTexture(c);
  lcdTex.colorSpace = THREE.SRGBColorSpace;
  return lcdTex;
}

function lcd() {
  // a 1602 module: 80 x 36 mm board, 71 x 24 mm bezel, 64 x 14 mm glass, 16 header pins along the top edge
  const g = new THREE.Group();
  const board = new THREE.Mesh(new THREE.BoxGeometry(mm(80), mm(1.6), mm(36)), M.pcb);
  board.position.y = mm(0.8);
  const bezel = new THREE.Mesh(new THREE.BoxGeometry(mm(71), mm(7), mm(24)), M.bezel);
  bezel.position.set(0, mm(1.6 + 3.5), mm(1.5));
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(mm(64), mm(14)),
    new THREE.MeshStandardMaterial({ map: lcdTexture(), emissive: "#ffffff", emissiveMap: lcdTexture(), emissiveIntensity: 0.55, roughness: 0.2 }),
  );
  glass.rotation.x = -Math.PI / 2;
  glass.position.set(0, mm(8.62), mm(1.5));
  g.add(board, bezel, glass);
  for (let i = 0; i < 16; i++) {
    const p = new THREE.Mesh(G.pin, M.steel);
    p.position.set(mm(-27.5 + i * 2.54 - 8), mm(3), mm(-15.5));
    g.add(p);
  }
  return g;
}

// a female-male jumper wire lying in a loose curve across the drawer, from (x0, z0) to (x1, z1)
function jumper(m: THREE.Material, x0: number, z0: number, x1: number, z1: number, lift: number, r: () => number) {
  const g = new THREE.Group();
  const y = mm(0.9) + lift;
  const pts = [new THREE.Vector3(x0, y, z0)];
  for (let i = 1; i < 4; i++) {
    const t = i / 4;
    pts.push(new THREE.Vector3(x0 + (x1 - x0) * t, y, z0 + (z1 - z0) * t + mm((r() - 0.5) * 12)));
  }
  pts.push(new THREE.Vector3(x1, y, z1));
  const curve = new THREE.CatmullRomCurve3(pts);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, mm(0.75), 6), m));
  // black connector housings at both ends, pointing along the wire
  for (const [t, dir] of [
    [0, -1],
    [1, 1],
  ]) {
    const p = curve.getPointAt(t);
    const tan = curve.getTangentAt(t).multiplyScalar(dir);
    const h = new THREE.Mesh(new THREE.BoxGeometry(mm(2.5), mm(2.5), mm(14)), M.black);
    h.position.copy(p).addScaledVector(tan, mm(7));
    h.lookAt(h.position.clone().add(tan));
    g.add(h);
  }
  return g;
}

// scatter n parts over the floor, in loose rows, each turned a little
function scatter(make: (r: () => number) => THREE.Object3D, n: number, w: number, d: number, seed: number, spread = 0.5) {
  const r = rng(seed);
  const g = new THREE.Group();
  const cols = Math.max(1, Math.round(Math.sqrt((n * w) / d)));
  const rows = Math.ceil(n / cols);
  for (let i = 0; i < n; i++) {
    const part = make(r);
    const cx = ((i % cols) + 0.5) / cols,
      cz = (Math.floor(i / cols) + 0.5) / rows;
    part.position.x = w * cx + (r() - 0.5) * mm(4);
    part.position.z = d * cz + (r() - 0.5) * mm(4);
    part.rotation.y = (r() - 0.5) * Math.PI * spread + (r() < 0.5 ? 0 : Math.PI / 2);
    g.add(part);
  }
  return g;
}

// Fill a drawer's inside (w wide, d deep, in metres); the group's origin is the inside's back-left floor corner.
export function drawerContents(kind: DrawerContents, w: number, d: number) {
  switch (kind) {
    case "resistors":
      return scatter(resistor, 7, w, d, 11, 0.35);
    case "leds":
      return scatter(led, 6, w, d, 23, 0.4);
    case "capacitors":
      return scatter(capacitor, 6, w, d, 37, 0.5);
    case "buttons":
      return scatter(() => button(), 6, w, d, 41, 0.15);
    case "lcd": {
      const g = new THREE.Group();
      const m = lcd();
      m.position.set(w / 2, 0, d / 2);
      g.add(m);
      return g;
    }
    case "jumpers": {
      const r = rng(53);
      const g = new THREE.Group();
      for (let i = 0; i < 14; i++) {
        const z0 = mm(6) + r() * (d - mm(12)),
          z1 = mm(6) + r() * (d - mm(12));
        g.add(jumper(wireColours[i % wireColours.length], mm(17), z0, w - mm(17), z1, mm(1.4) * (i % 3), r));
      }
      return g;
    }
  }
}
