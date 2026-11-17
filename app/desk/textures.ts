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

function wrap(g: CanvasRenderingContext2D, text: string, maxW: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const test = line ? `${line} ${word}` : word;
    if (g.measureText(test).width > maxW && line) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

// The hologram's card for one project. The right-hand area is left empty: the project's video plays there on its own plane.
export const CARD = { w: 1280, h: 800, video: { x: 700, y: 150, w: 540, h: 420 } };
export function projectCard(p: Project, i: number, n: number) {
  return canvasTexture(CARD.w, CARD.h, (g) => {
    const display = siteFont("display");
    const body = siteFont("body");
    const mono = siteFont("mono");
    const cyan = "#7fe3ff";
    g.clearRect(0, 0, CARD.w, CARD.h);
    // faint fill so the text has something to sit on
    g.fillStyle = "rgba(14,40,60,0.55)";
    g.fillRect(0, 0, CARD.w, CARD.h);
    // frame with corner brackets
    g.strokeStyle = "rgba(127,227,255,0.35)";
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
    // header
    g.fillStyle = cyan;
    g.font = `500 26px ${mono}`;
    g.fillText(`PROJECT ${String(i + 1).padStart(2, "0")} / ${String(n).padStart(2, "0")}`, 60, 92);
    g.fillStyle = "#FF8a5c";
    g.fillText(p.rev, 400, 92);
    g.fillStyle = "rgba(127,227,255,0.4)";
    g.fillRect(60, 116, 580, 2);
    // title
    g.fillStyle = "#eafaff";
    g.font = `600 54px ${display}`;
    let y = 186;
    for (const line of wrap(g, p.title, 590).slice(0, 3)) {
      g.fillText(line, 60, y);
      y += 62;
    }
    // summary
    g.fillStyle = "rgba(220,244,255,0.85)";
    g.font = `400 26px ${body}`;
    y += 14;
    for (const line of wrap(g, p.summary, 590).slice(0, 6)) {
      g.fillText(line, 60, y);
      y += 38;
    }
    // tags
    g.font = `500 22px ${mono}`;
    let x = 60;
    y = Math.max(y + 24, 600);
    for (const t of p.tags) {
      const w = g.measureText(t).width + 28;
      if (x + w > 660) break;
      g.strokeStyle = "rgba(127,227,255,0.6)";
      g.lineWidth = 2;
      g.strokeRect(x, y - 30, w, 42);
      g.fillStyle = cyan;
      g.fillText(t, x + 14, y);
      x += w + 12;
    }
    // video frame and call to action
    const v = CARD.video;
    g.strokeStyle = "rgba(127,227,255,0.6)";
    g.lineWidth = 2;
    g.strokeRect(v.x - 8, v.y - 8, v.w + 16, v.h + 16);
    g.fillStyle = cyan;
    g.font = `500 24px ${mono}`;
    g.fillText("▸ SELECT TO OPEN CASE STUDY", 700, 680);
    g.fillStyle = "rgba(127,227,255,0.55)";
    g.font = `500 20px ${mono}`;
    g.fillText("◂ ▸  CYCLE PROJECTS", 700, 720);
  });
}
