import { asset } from "./asset";
import { ProjectCard } from "./components/ProjectCard";
import { Reveal } from "./components/Reveal";
import { projects } from "./projects";

const capabilities: [string, string[]][] = [
  ["Design & CAD", ["SolidWorks", "Onshape", "Fusion360", "ANSYS Simulation"]],
  ["Fabrication", ["Lathe", "3D Printing (PLA)", "Carbon Fiber Infusions", "Mill", "Waterjet"]],
  ["Controls & Electronics", ["Embedded C/C++", "Sensors & Actuators", "PCB Design Basics", "Arduino"]],
  ["Software", ["Python", "MATLAB", "Simulink", "Altium"]],
];

function Wheel({ x, cls }: { x: number; cls: string }) {
  return (
    <g className={`wheel ${cls}`}>
      <circle cx={x} cy="278" r="26" fill="#0B0F16" stroke="#26314A" strokeWidth="2" />
      <circle cx={x} cy="278" r="9" fill="none" stroke="#6FD3F2" strokeWidth="2" />
      <line x1={x} y1="256" x2={x} y2="300" stroke="#6FD3F2" strokeWidth="2" />
      <line x1={x - 22} y1="278" x2={x + 22} y2="278" stroke="#6FD3F2" strokeWidth="2" />
    </g>
  );
}

export default function Home() {
  return (
    <>
      <header className="nav">
        <div className="nav-inner">
          <div className="brand">
            <span className="brand-mark">SB</span>
            SHOURYA BARANWAL
          </div>
          <nav className="links">
            <a href="#work">Work</a>
            <a href="#capabilities">Capabilities</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
          </nav>
          <div className="nav-cta">
            <a className="btn btn-ghost" href={asset("Shourya Baranwal.pdf")} download="Shourya Baranwal.pdf" target="_blank" rel="noopener">
              Resume ↓
            </a>
            <a className="btn btn-primary" href="#contact">
              Let&apos;s Connect!
            </a>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <p className="eyebrow">Mechanical Engineer</p>
            <h1>
              Designing projects
              <br />
              that <span className="accent">move, adapt,</span>
              <br />
              and innovate.
            </h1>
            <p className="sub">
              I&apos;m a third year mechanical engineering student, who yearns to learn more about the complex systems around us that seem
              simple at first. Mistakes are how I learn, and persistence is key to my unwaivering drive.
            </p>
            <div className="hero-actions">
              <a className="btn btn-primary" href="#work">
                View projects
              </a>
              <a className="btn btn-ghost" href="#contact">
                Get in touch
              </a>
            </div>
          </div>

          <div className="rig" aria-hidden="true">
            <svg viewBox="0 0 460 460">
              <line x1="30" y1="308" x2="430" y2="308" stroke="#26314A" strokeWidth="1.5" />
              <g className="car">
                <ellipse cx="240" cy="295" rx="150" ry="9" fill="#000" opacity="0.32" />
                <Wheel x={320} cls="wheel-rear" />
                <Wheel x={156} cls="wheel-front" />
                <path
                  d="M90,258 C96,236 114,214 138,200 C172,178 208,167 240,164 C272,167 304,176 330,190 C356,204 376,222 388,244 C392,254 388,264 378,270 L360,272 C356,266 348,262 338,262 L142,262 C132,262 124,266 120,272 L102,270 C92,266 88,262 90,258 Z"
                  fill="#D7DCE4"
                  stroke="#8A94A6"
                  strokeWidth="1.5"
                />
                <path
                  d="M110,262 L370,262 C374,266 374,272 370,276 L110,276 C106,272 106,266 110,262 Z"
                  fill="#B9C1CE"
                  stroke="#8A94A6"
                  strokeWidth="1"
                />
                <rect x="110" y="270" width="260" height="4" rx="2" fill="#6FD3F2" />
                <path
                  d="M185,170 C202,160 238,159 262,165 C282,170 296,180 302,192 L182,192 C180,184 180,176 185,170 Z"
                  fill="#171D2C"
                  stroke="#6FD3F2"
                  strokeWidth="1.5"
                />
                <line x1="195" y1="174" x2="240" y2="168" stroke="rgba(111,211,242,0.5)" strokeWidth="2" />
                <circle cx="96" cy="248" r="4" fill="#FF6A39" />
              </g>
            </svg>
          </div>
        </div>

        <div className="wrap">
          <div className="titleblock">
            <div>
              VIBECODED BY <span>SHOURYA BARANWAL</span>
            </div>
            <div>
              PERSISTENCE <span>100 of 100</span>
            </div>
            <div>
              MATERIAL <span>I &lt;3 Carbon Fiber</span>
            </div>
            <div>
              STATUS <span>Open for internship</span>
            </div>
          </div>
        </div>
      </section>

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
            {projects.map((p) => (
              <ProjectCard key={p.rev} project={p} />
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
