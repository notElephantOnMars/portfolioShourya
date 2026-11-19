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
export function siteFont(kind: "display" | "body" | "mono" | "pixel") {
  const v = { display: "--font-instrument", body: "--font-instrument", mono: "--font-mono-face", pixel: "--font-pixel" }[kind];
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

// The hologram's card for one project: its title in pixel type, a frame, and the skills used, so the spinning model is
// the focus. The model (or, without one, the project's video) fills the `video` area on its own plane.
export const CARD = { w: 1280, h: 800, video: { x: 140, y: 120, w: 1000, h: 500 } };

export function projectCard(p: Project, logo?: HTMLImageElement) {
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
    // team logo in the top-left corner, recoloured to the hologram's cyan
    if (logo) {
      const h = 116,
        w = (logo.width / logo.height) * h;
      const tint = document.createElement("canvas");
      tint.width = w;
      tint.height = h;
      const tg = tint.getContext("2d")!;
      tg.drawImage(logo, 0, 0, w, h);
      tg.globalCompositeOperation = "source-in";
      tg.fillStyle = "#bff1ff";
      tg.fillRect(0, 0, w, h);
      g.shadowColor = "rgba(79,195,247,0.9)";
      g.shadowBlur = 20;
      g.drawImage(tint, 58, 40);
      g.shadowBlur = 0;
    }
    // title, centred along the top, shrunk to fit on one line
    const title = p.title.replace(/\s+[—-]\s+.*$/, ""); // "Door Hinge - University of ..." -> "Door Hinge"
    let size = 64;
    g.font = `500 ${size}px ${siteFont("pixel")}`;
    while (g.measureText(title).width > CARD.w - 220 && size > 32) g.font = `500 ${(size -= 2)}px ${siteFont("pixel")}`;
    g.textAlign = "center";
    g.fillStyle = "#dff8ff";
    g.shadowColor = "rgba(79,195,247,0.9)";
    g.shadowBlur = 18;
    g.fillText(title, CARD.w / 2, 104);
    g.shadowBlur = 0;
    g.textAlign = "left";
    g.fillStyle = "rgba(127,227,255,0.35)";
    g.fillRect(CARD.w / 2 - 260, 128, 520, 2);
    // skills, centred along the bottom
    g.font = `500 30px ${mono}`;
    const pad = 22,
      gap = 16,
      h = 54;
    const widths = p.tags.map((t) => g.measureText(t).width + pad * 2);
    const total = widths.reduce((a, b) => a + b, 0) + gap * (widths.length - 1);
    let x = (CARD.w - total) / 2;
    const y = 690;
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

// A pixel-art chevron for the hologram's arrows (points right; mirror it for left).
export function holoArrow() {
  const px = 16;
  // 7 x 11 cells
  const rows = ["##.....", ".##....", "..##...", "...##..", "....##.", ".....##", "....##.", "...##..", "..##...", ".##....", "##....."];
  return canvasTexture(7 * px + 32, 11 * px + 32, (g) => {
    g.shadowColor = "rgba(79,195,247,0.95)";
    g.shadowBlur = 14;
    g.fillStyle = "#bff1ff";
    rows.forEach((r, y) => [...r].forEach((c, x) => c === "#" && g.fillRect(16 + x * px, 16 + y * px, px - 2, px - 2)));
  });
}

// The hint that fades in while the hologram is hovered.
export const HINT = { w: 1000, h: 90 };
export function holoHint(text: string) {
  return canvasTexture(HINT.w, HINT.h, (g) => {
    g.font = `500 44px ${siteFont("pixel")}`;
    g.textAlign = "center";
    g.fillStyle = "#dff8ff";
    g.shadowColor = "rgba(79,195,247,0.95)";
    g.shadowBlur = 16;
    g.fillText(text, HINT.w / 2, 60);
  });
}
