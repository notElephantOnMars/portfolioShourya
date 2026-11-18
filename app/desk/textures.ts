import * as THREE from "three";
import type { Project } from "../components/ProjectCard";

// Textures drawn on a <canvas> at runtime: the power supply's readouts and the hologram cards.
// Drawing them here means there are no image files to load and the text uses the site's own fonts.

export function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// The font families next/font generated (layout.tsx puts them in CSS variables).
export function siteFont(kind: "display" | "body" | "mono") {
  const v = { display: "--font-instrument", body: "--font-instrument", mono: "--font-mono-face" }[kind];
  const fam = getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  return fam || (kind === "mono" ? "monospace" : "sans-serif");
}

// A seven-segment-style readout on the bench power supply.
export function psuReadout(value: string, unit: string, color: string) {
  return canvasTexture(256, 96, (g) => {
    g.fillStyle = "#050607";
    g.fillRect(0, 0, 256, 96);
    g.fillStyle = color;
    g.shadowColor = color;
    g.shadowBlur = 10;
    g.font = `600 64px ${siteFont("mono")}`;
    g.fillText(value, 14, 70);
    g.font = `600 28px ${siteFont("mono")}`;
    g.fillText(unit, 214, 70);
  });
}

// The hologram's card for one project: just a frame and the skills used, so the spinning model is the focus. The model
// (or, without one, the project's video) fills the `video` area on its own plane.
export const CARD = { w: 1280, h: 800, video: { x: 140, y: 70, w: 1000, h: 560 } };

export function projectCard(p: Project) {
  return canvasTexture(CARD.w, CARD.h, (g) => {
    const mono = siteFont("mono");
    const cyan = "#7fe3ff";
    g.clearRect(0, 0, CARD.w, CARD.h);
    g.fillStyle = "rgba(14,40,60,0.45)";
    g.fillRect(0, 0, CARD.w, CARD.h);
    // frame with corner brackets
    g.strokeStyle = "rgba(127,227,255,0.3)";
    g.lineWidth = 2;
    g.strokeRect(14, 14, CARD.w - 28, CARD.h - 28);
    g.strokeStyle = cyan;
    g.lineWidth = 6;
    const L = 60;
    for (const [x, y, dx, dy] of [
      [14, 14, 1, 1],
      [CARD.w - 14, 14, -1, 1],
      [14, CARD.h - 14, 1, -1],
      [CARD.w - 14, CARD.h - 14, -1, -1],
    ]) {
      g.beginPath();
      g.moveTo(x + dx * L, y);
      g.lineTo(x, y);
      g.lineTo(x, y + dy * L);
      g.stroke();
    }
    // skills, centred along the bottom
    g.font = `500 30px ${mono}`;
    const pad = 22,
      gap = 16,
      h = 54;
    const widths = p.tags.map((t) => g.measureText(t).width + pad * 2);
    const total = widths.reduce((a, b) => a + b, 0) + gap * (widths.length - 1);
    let x = (CARD.w - total) / 2;
    const y = 680;
    p.tags.forEach((t, i) => {
      g.strokeStyle = "rgba(127,227,255,0.6)";
      g.lineWidth = 2;
      g.strokeRect(x, y, widths[i], h);
      g.fillStyle = cyan;
      g.fillText(t, x + pad, y + 37);
      x += widths[i] + gap;
    });
  });
}
