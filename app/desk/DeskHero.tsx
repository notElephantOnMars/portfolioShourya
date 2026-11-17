"use client";

import { BookOpen, Box, ChevronDown, ChevronLeft, ChevronRight, CornerDownLeft, DoorOpen, Download, Mail, Move3d, Power, Undo2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { asset } from "../asset";
import { projects } from "../projects";
import { story } from "./story";
import "./desk.css";

// The 3D scene only runs in the browser, so it's loaded there (and split out of the page's main bundle).
const Scene = dynamic(() => import("./Scene"), { ssr: false });

type Mode = "intro" | "zooming" | "holo" | "inspect";
const FADE_MS = 450;

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

  // switching between the hologram and the inspect view: fade to black, swap while it's dark, fade back in
  const [fade, setFade] = useState(false);
  const [doorOpen, setDoorOpen] = useState(false);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const fadeTo = useCallback((next: Mode) => {
    setFade(true);
    timers.current.push(
      window.setTimeout(() => {
        story.inspecting = next === "inspect";
        story.doorTarget = 0;
        setDoorOpen(false);
        setMode(next);
        timers.current.push(window.setTimeout(() => setFade(false), 120));
      }, FADE_MS),
    );
  }, []);
  // selecting a project: inspect its 3D model if it has one, otherwise open its case study
  const select = useCallback((i: number) => (projects[i].model ? fadeTo("inspect") : openProject(i)), [fadeTo]);
  const toggleDoor = () => {
    story.doorTarget = doorOpen ? 0 : 1;
    setDoorOpen(!doorOpen);
  };

  // keyboard: arrows cycle, Enter opens, Escape goes back a step
  useEffect(() => {
    if (mode !== "holo" && mode !== "inspect") return;
    const onKey = (e: KeyboardEvent) => {
      if (mode === "inspect") {
        if (e.key !== "Escape") return;
        fadeTo("holo");
      } else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "Escape") back();
      else if (e.key === "Enter" && !(e.target instanceof HTMLButtonElement)) select(index);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, index, step, back, select, fadeTo]);

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
          onArrive={() => setMode((m) => (m === "zooming" ? "holo" : m))}
          onSelect={select}
          inspect={mode === "inspect" ? p : null}
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
          <button className="btn btn-primary desk-open" type="button" onClick={() => select(index)} tabIndex={mode === "holo" ? 0 : -1}>
            {p.model ? (
              <>
                Inspect in 3D <Box size={14} />
              </>
            ) : (
              <>
                Open case study <CornerDownLeft size={14} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* inspect view: part tabs (placed over their parts by InspectStage) and controls */}
      {mode === "inspect" && p.model && (
        <div className="inspect-ui">
          <div className="inspect-tabs">
            {p.model.parts.map((part, i) => (
              <div
                key={part.title}
                ref={(el) => {
                  story.tabEls[i] = el;
                }}
                className="inspect-tab"
                style={{ visibility: "hidden" }}
              >
                <button
                  type="button"
                  className="inspect-tab-square"
                  aria-label={part.title}
                  aria-describedby={`part-${i}`}
                  onMouseEnter={() => (story.hoverPart = i)}
                  onMouseLeave={() => (story.hoverPart = -1)}
                  onFocus={() => (story.hoverPart = i)}
                  onBlur={() => (story.hoverPart = -1)}
                />
                <div className="inspect-tab-card" id={`part-${i}`} role="tooltip">
                  <strong>{part.title}</strong>
                  <p>{part.body}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="desk-back" type="button" onClick={() => fadeTo("holo")}>
            <Undo2 size={15} /> Back to hologram <kbd>Esc</kbd>
          </button>
          <div className="inspect-head">
            <span className="desk-count">
              {String(index + 1).padStart(2, "0")} / {String(n).padStart(2, "0")} · {p.rev}
            </span>
            <h2>{p.title}</h2>
          </div>
          <div className="inspect-bar">
            <span className="inspect-hint">
              <Move3d size={15} aria-hidden /> Drag to orbit · scroll to zoom · right-drag to pan · hover a square for details
            </span>
            {p.model.hinge && (
              <button className="btn btn-primary inspect-door" type="button" onClick={toggleDoor}>
                <DoorOpen size={14} /> {doorOpen ? "Close the door" : "Open the door"}
              </button>
            )}
            <button className="btn btn-ghost inspect-case" type="button" onClick={() => openProject(index)}>
              <BookOpen size={14} /> Full case study
            </button>
          </div>
        </div>
      )}
      <div className={`desk-fade ${fade ? "is-on" : ""}`} aria-hidden />
    </section>
  );
}
