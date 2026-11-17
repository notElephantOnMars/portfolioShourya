import { ProjectCard } from "./components/ProjectCard";
import { Reveal } from "./components/Reveal";
import { DeskHero } from "./desk/DeskHero";
import { projects } from "./projects";

const capabilities: [string, string[]][] = [
  ["Design & CAD", ["SolidWorks", "Onshape", "Fusion360", "ANSYS Simulation"]],
  ["Fabrication", ["Lathe", "3D Printing (PLA)", "Carbon Fiber Infusions", "Mill", "Waterjet"]],
  ["Controls & Electronics", ["Embedded C/C++", "Sensors & Actuators", "PCB Design Basics", "Arduino"]],
  ["Software", ["Python", "MATLAB", "Simulink", "Altium"]],
];

export default function Home() {
  return (
    <>

      <DeskHero />

      <Reveal className="about" id="about">
        <div className="wrap about-grid">
          <div>
            <p className="eyebrow">About</p>
            <h2 style={{ fontFamily: "var(--display)", fontSize: 32, margin: "14px 0 22px" }}>Background, in brief.</h2>
            <p>
              I&apos;m a mechanical engineering student who gravitates toward the automotive and mechatronics side of the field — where
              drivetrain, sensors, and control logic all have to work together. I&apos;m communicative and collaborative by nature, and I bring a
              steady, positive attitude to team environments, especially when a project hits the inevitable snag. What drives me is genuine
              curiosity: I want to understand a system well enough to improve it, and I care about the people I&apos;m building it with as much
              as the build itself. <strong>I studied Mechanical Engineering at the University of Calgary, graduating in 2029.</strong> Since
              then I&apos;ve worked across machine design, controls, and manufacturing.
            </p>
            <p>
              I like projects that force a full loop: sketch, simulate, machine, assemble, debug the firmware at 1am, and get it working on the
              bench. Most of what&apos;s below started as a napkin drawing.
            </p>
          </div>
          <dl className="facts">
            <dt>Location</dt>
            <dd>Calgary, AB — open to relocation</dd>
            <dt>Education</dt>
            <dd>B.Sc. Mechanical Engineering, University of Calgary, 2029</dd>
            <dt>Focus areas</dt>
            <dd>Robotics, Mechanism Design, Automotives</dd>
            <dt>Currently</dt>
            <dd>Engineering Manager at University of Calgary Solar Car Team</dd>
          </dl>
        </div>
      </Reveal>

      <Reveal className="capabilities" id="capabilities">
        <div className="wrap">
          <div className="section-head">
            <p className="eyebrow">Capabilities</p>
            <h2>What I build with.</h2>
            <p>A working set of tools across design, fabrication, and control:</p>
          </div>
          <div className="cap-table">
            {capabilities.map(([label, chips]) => (
              <div className="cap-row" key={label}>
                <div className="cap-label">{label}</div>
                <div className="cap-chips">
                  {chips.map((c) => (
                    <span className="chip" key={c}>
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal className="projects" id="work">
        <div className="wrap">
          <div className="section-head">
            <p className="eyebrow">Selected Work</p>
            <h2>Projects, by revision.</h2>
            <p>My builds include but are not limited to the following:</p>
          </div>
          <div className="proj-grid">
            {projects.map((p, i) => (
              <ProjectCard key={p.rev} project={p} index={i} />
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal className="contact" id="contact">
        <div className="wrap">
          <div className="contact-block">
            <p className="eyebrow" style={{ justifyContent: "center" }}>
              Contact
            </p>
            <h2>Let&apos;s build something.</h2>
            <p style={{ color: "var(--text-muted)", maxWidth: 480, margin: "0 auto 8px" }}>
              Open to internships Winter 2027, Fall 2027. Building something cool? Let&apos;s connect I would love to know what you are working
              on!
            </p>
            <a className="btn btn-primary" href="mailto:baranwalshourya@gmail.com">
              Email me
            </a>

            <div className="field-grid">
              <div>
                NAME<span>Shourya Baranwal</span>
              </div>
              <div>
                EMAIL<span>baranwalshourya@gmail.com</span>
              </div>
              <div>
                LOCATION<span>Calgary, AB</span>
              </div>
              <div>
                LINKS
                <span className="social-links">
                  <a href="https://github.com/notElephantOnMars" target="_blank" rel="noopener" aria-label="GitHub">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.78-.25.78-.55 0-.27-.01-1.16-.02-2.11-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.64 1.59.24 2.76.12 3.05.74.8 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.15 0 1.55-.01 2.8-.01 3.18 0 .3.2.66.79.55A10.52 10.52 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
                    </svg>
                  </a>
                  <a href="https://www.linkedin.com/in/shourya-baranwal/" target="_blank" rel="noopener" aria-label="LinkedIn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.15 1.45-2.15 2.94v5.67H9.35V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45Z" />
                    </svg>
                  </a>
                </span>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      <footer className="wrap">
        <span>© 2026 Shourya Baranwal</span>
      </footer>
    </>
  );
}
