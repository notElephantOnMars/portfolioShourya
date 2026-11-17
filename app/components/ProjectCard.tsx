"use client";

import { useState } from "react";
import { asset } from "../asset";

export type Project = {
  rev: string;
  video: string;
  title: string;
  summary: string;
  tags: string[];
  details: { heading: string; body: React.ReactNode }[];
  deepDive?: string;
};

// A project card whose case study expands in place (the .card.open styles in globals.css).
export function ProjectCard({ project: p }: { project: Project }) {
  const [open, setOpen] = useState(false);
  return (
    <article className={`card${open ? " open" : ""}`}>
      <div className="card-art">
        <span className="rev-tag">{p.rev}</span>
        <video
          src={asset(p.video)}
          autoPlay
          loop
          muted
          playsInline
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 42%", display: "block" }}
        />
      </div>
      <div className="card-body">
        <h3>{p.title}</h3>
        <p>{p.summary}</p>
        <div className="card-tags">
          {p.tags.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        <button className="card-link card-toggle" type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
          <span className="toggle-text">{open ? "Hide Project" : "View case study"}</span> <span className="arrow">→</span>
        </button>
        <div className="card-details">
          <div className="detail-inner">
            {p.details.map((d) => (
              <div className="detail-block" key={d.heading}>
                <h4>{d.heading}</h4>
                <p>{d.body}</p>
              </div>
            ))}
            {p.deepDive && (
              <a className="card-link" href={asset(p.deepDive)} style={{ display: "inline-flex", marginTop: 14 }}>
                <span>Full build breakdown &amp; issues log</span> <span className="arrow">→</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
