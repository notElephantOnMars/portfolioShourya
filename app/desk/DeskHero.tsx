"use client";

import { ChevronDown, ChevronLeft, ChevronRight, CornerDownLeft, Download, Mail, Power, Undo2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { asset } from "../asset";
import { projects } from "../projects";
import { story } from "./story";
import "./desk.css";

// The 3D scene only runs in the browser, so it's loaded there (and split out of the page's main bundle).
const Scene = dynamic(() => import("./Scene"), { ssr: false });

type Mode = "intro" | "zooming" | "holo";

// Opens a project's case study in the "Selected Work" section below (ProjectCard listens for this).
export function openProject(i: number) {
  window.dispatchEvent(new CustomEvent("open-project", { detail: i }));
  document.getElementById(`project-${i}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function DeskHero() {
  const [mode, setMode] = useState<Mode>("intro");
  const [index, setIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    const set = () => setReducedMotion(q.matches);
    set();
    q.addEventListener("change", set);
    return () => q.removeEventListener("change", set);
  }, []);

  const n = projects.length;
  const step = useCallback((d: number) => setIndex((i) => (i + d + n) % n), [n]);
  const back = useCallback(() => setMode("intro"), []);

  // keyboard: arrows cycle, Enter opens, Escape goes back to the desk
  useEffect(() => {
    if (mode !== "holo") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "Escape") back();
      else if (e.key === "Enter" && !(e.target instanceof HTMLButtonElement)) openProject(index);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, index, step, back]);

  const p = projects[index];
  const on = mode === "intro" ? 0 : -1; // tab order: screen controls only while they're showing
  return (
    <section className="desk-hero" aria-label="Shourya's workbench">
      <div className="desk-canvas">
        <Scene
          projects={projects}
          index={index}
          zoomed={mode !== "intro"}
          reducedMotion={reducedMotion}
          onArrive={() => setMode("holo")}
          onSelect={openProject}
        />
      </div>

      {/* intro: a quiet welcome line in the empty space above the monitor */}
      <div className={`desk-intro ${mode === "intro" ? "is-on" : ""}`} aria-hidden={mode !== "intro"}>
        <h1>Welcome to my workbench</h1>
      </div>

      {/* the monitor's screen: Monitor.tsx pins this layer onto it every frame */}
      <div
        ref={(el) => {
          story.screenEl = el;
        }}
        className={`desk-screen ${mode === "intro" ? "is-on" : ""}`}
        aria-hidden={mode !== "intro"}
      >
        <div className="desk-screen-center">
          <button className="desk-power" type="button" onClick={() => setMode("zooming")} tabIndex={on} aria-describedby="desk-hint">
            <Power strokeWidth={2.2} aria-hidden />
            <span className="sr-only">Power on the hologram</span>
          </button>
          <p className="desk-hint" id="desk-hint">
            Powers on the hologram to show my projects
          </p>
        </div>
        <div className="desk-screen-links">
          <a className="desk-link" href={asset("Shourya Baranwal.pdf")} download="Shourya Baranwal.pdf" tabIndex={on}>
            <Download aria-hidden /> Resume
          </a>
          <a className="desk-link" href="#contact" tabIndex={on}>
            <Mail aria-hidden /> Let&apos;s connect
          </a>
        </div>
      </div>
      <a className={`desk-scroll ${mode === "intro" ? "is-on" : ""}`} href="#about" tabIndex={mode === "intro" ? 0 : -1}>
        Or scroll for the full portfolio <ChevronDown size={14} />
      </a>

      {/* hologram controls */}
      <div className={`desk-controls ${mode === "holo" ? "is-on" : ""}`} aria-hidden={mode !== "holo"}>
        <button className="desk-back" type="button" onClick={back} tabIndex={mode === "holo" ? 0 : -1}>
          <Undo2 size={15} /> Back to desk <kbd>Esc</kbd>
        </button>
        <div className="desk-bar" role="group" aria-label="Projects">
          <button className="desk-arrow" type="button" onClick={() => step(-1)} aria-label="Previous project" tabIndex={mode === "holo" ? 0 : -1}>
            <ChevronLeft size={20} />
          </button>
          <div className="desk-now" aria-live="polite">
            <span className="desk-count">
              {String(index + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
            </span>
            <span className="desk-title">{p.title}</span>
          </div>
          <button className="desk-arrow" type="button" onClick={() => step(1)} aria-label="Next project" tabIndex={mode === "holo" ? 0 : -1}>
            <ChevronRight size={20} />
          </button>
          <button className="btn btn-primary desk-open" type="button" onClick={() => openProject(index)} tabIndex={mode === "holo" ? 0 : -1}>
            Open case study <CornerDownLeft size={14} />
          </button>
        </div>
      </div>
    </section>
  );
}
