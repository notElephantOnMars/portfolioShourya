import type { Project } from "./components/ProjectCard";

export const projects: Project[] = [
  {
    rev: "REV A",
    video: "Door.mp4",
    title: "Door Hinge - University of Calgary Solar Car Team",
    summary: "A pop-out and up door opening design complimenting the aeroshell of the 6th gen solar car Schulich Helios.",
    tags: ["GD&T", "ANSYS FEA", "SolidWorks", "Collaboration"],
    details: [
      {
        heading: "Purpose",
        body: "This was the first mechanical design project I took upon myselft to complete. The purpose of this type of door hinge relies behind the complicated shape of the side skirts on our car - see more details in the breakdown below.",
      },
      {
        heading: "Design",
        body: "The hinge was loaded in the worst case scenario, where the expected force of 20 lbf for the door was applied at the furthest point from the hinge. The beauty of this design is its repeatability, and attention to deformation under the load of the door- see the full write-up for more details.",
      },
      {
        heading: "Building it in real life",
        body: "A combination of off the shelf parts, waterjet, and recycling previous parts was used for this design process to make these hinges work- see the deep dive below to see exactly how.",
      },
      {
        heading: "What I learned",
        body: "This was my first project in solar car, and there were many things I did not account for during this design process. A lack of design reviews prohibited an efficient design from being made, as collaboration increases creavity and innovation of every design. Some issues for this design include mounting arms from the door to the hinge, and a loose, almost wobbly hinge. I am working on fixing this currently and an increased importance in design reviews will surely help me achieve a better design.",
      },
    ],
    deepDive: "door-hinge-deep-dive.html",
    model: {
      file: "hinge.glb",
      focus: ["SBR16UU", "New Door Hinge", "Rail", "ShaftSupport", "Mounting Arm", "Mounts"],
      ghost: ["CarBody"],
      hinge: true,
      parts: [
        {
          match: ["Door"],
          title: "Door",
          body: "About 9.07 kg (20 lbf), estimated from the density of the already-built front hood. Helios's door shape rules out a horizontal hinge, so it slides out, then lifts 30°, rising about 35 in.",
        },
        {
          match: ["SBR16UU"],
          title: "Linear bearing",
          body: "Slides along the supported rail so the door clears its frame before it lifts. The sliders' documented dynamic load rating of 372 N is well above the 90 N door load.",
        },
        {
          match: ["Rail"],
          title: "Supported rail",
          body: "Off-the-shelf rail, sourced from Amazon to keep costs down, then cut to length on the makerspace's metal bandsaw.",
        },
        {
          match: ["New Door Hinge"],
          title: "Hinge plate",
          body: "6061-T6 aluminium. In FEA with 90 N at the tip: 83.2 MPa peak stress against 241 MPa yield, a safety factor of 3.0, and 0.86 mm deflection with the centre support beam.",
        },
        {
          match: ["ShaftSupport"],
          title: "Shaft supports",
          body: "The door's weight moved from two pins onto a shaft, carried by pillow-block supports chosen to match the slider block's hole pattern.",
        },
        {
          match: ["Mounting Arm"],
          title: "Mounting arms",
          body: "Lengthened to stop the door colliding with the car (Issue 01). The longer arm amplified a wobble from the mount spacing (Issue 02), which I'm still fixing.",
        },
        {
          match: ["Mounts"],
          title: "Door mounts",
          body: "Where the door meets the hinge. Uneven surface contact here (Issue 03) is being solved with modular mounting methods, now in testing.",
        },
      ],
    },
  },
  {
    rev: "REV B",
    video: "delivery-robot-thumb.mp4",
    title: "Sensor-Feedback Delivery Robot",
    summary:
      "An autonomous delivery robot that navigates an obstacle course, picks up a 3D-printed payload, and drops it at a delivery zone — repeating as many loops as possible in a 10-minute window.",
    tags: ["Onshape", "Embedded", "3D Printing"],
    details: [
      {
        heading: "Purpose",
        body: "The challenge was to build a robot that could run a course of obstacles, pick up a 3D-printed payload, and deliver it to a marked delivery area — then repeat that cycle as many times as possible inside a 10-minute window. Speed, reliability, and repeatability mattered as much as getting the pickup and drop-off right.",
      },
      {
        heading: "Design",
        body: "Navigation relied on two HC-SR04 ultrasonic sensors for wall following through the course, paired with an IR emitter/receiver setup for line following. I did the overall CAD model for the robot, including the full assembly of every component I could source online — chassis, sensor mounts, payload gripper, and drivetrain — so everything fit and moved together before it was ever built.",
      },
      {
        heading: "Building it in real life",
        body: "Getting the motors to work together reliably took a lot of iteration — see the full write-up for the specific issues we ran into and how we solved each one.",
      },
      {
        heading: "What I learned",
        body: "Balancing two different sensor feedback loops (wall-following distance control and line-following steering) taught me a lot about tuning control logic for competing priorities, and about how much fabrication tolerance matters when a robot has to repeat the same run over and over under a time limit.",
      },
    ],
    deepDive: "delivery-robot-deep-dive.html",
    model: {
      file: "robot.glb",
      upZ: true,
      parts: [
        {
          match: ["Part_1"],
          title: "T-shaped chassis",
          body: "Chosen to fit all the actuators and sensors: open sides and front for sensors, an open rear for the lift, and an open top for wiring.",
        },
        {
          match: ["MIUZEI_MS18"],
          title: "Lift servos",
          body: "The first stepper motor couldn't lift the payload (Issue 01), so two calibrated servos now lift it in sync, carrying it with ease on the 9 V battery.",
        },
        {
          match: ["RaspBerryPi_Pico", "RPI_RP2040"],
          title: "Controller",
          body: "Runs both feedback loops: wall following with two HC-SR04 ultrasonic sensors and line following with an IR emitter/receiver.",
        },
        {
          match: ["HalfBreadboard"],
          title: "Breadboards",
          body: "Wiring for the sensors and servos. A falling battery voltage made runs inconsistent (Issue 02); a fresh battery and on-site calibration fixed it.",
        },
      ],
    },
  },
  {
    rev: "REV C",
    video: "LinkedInVid.mp4",
    title: "Aston Martin One-77 — Full Surface Model",
    summary: "A from-scratch SolidWorks rebuild of the Aston Martin One-77, complete with a custom steering system that actually turns the wheels.",
    tags: ["SolidWorks", "Surface Modelling", "Tutorial-Guided"],
    model: {
      file: "aston.glb",
      parts: [
        {
          match: ["Aston_Martin"],
          title: "Body surfaces",
          body: "Built with 3D projected curves to raise the surface detail, capturing the character lines of a modern car body.",
        },
        {
          match: ["Lights"],
          title: "Headlights",
          body: "Ruled surfaces fill the patches and add debossed details like the headlight backplates.",
        },
        {
          match: ["Door"],
          title: "Door",
          body: "Debossed details such as the door handles were added with ruled surfaces.",
        },
        {
          match: ["Wheel27"],
          title: "Steering",
          body: "Beyond the tutorial: I designed a custom steering system so the front wheels actually turn.",
        },
        {
          match: ["BrakeDIsc"],
          title: "Wheels and brakes",
          body: "Tyres, rims and brake discs assembled into the rest of the modelled car.",
        },
      ],
    },
    details: [
      {
        heading: "Purpose",
        body: (
          <>
            I wanted to push my SolidWorks skills up a steep learning curve, so over two months I set out to rebuild the Aston Martin One-77
            entirely from scratch. I followed a guided tutorial from{" "}
            <a href="https://www.linkedin.com/company/learnsolidworks/" target="_blank" rel="noopener">
              LearnSOLIDWORKS.com
            </a>
            , led by{" "}
            <a href="https://www.linkedin.com/in/zuyderduyn/" target="_blank" rel="noopener">
              Jan-Willem Zuyderduyn
            </a>
            , rather than working from my own design — a deliberate choice to learn advanced surfacing technique before applying it to my own
            projects.
          </>
        ),
      },
      {
        heading: "Design",
        body: "The body relies heavily on 3D projected curves to raise the level of surface detail, and ruled surfaces to fill patches and add debossed details like the headlight backplates and door handles. I pushed past the tutorial's base scope by designing a custom steering system so the front wheels actually turn.",
      },
      {
        heading: "Building it in real life",
        body: "This was a full digital build: assembling the tires, rims, and steering system into the rest of the modelled car, and using surface modelling throughout to capture the intricate character lines seen on modern automotive bodies.",
      },
      {
        heading: "What I learned",
        body: "I couldn't rebuild this car from scratch without the tutorial yet — but that's not really the point. It gave me the fundamentals of surface modelling, which is exactly the barrier that was stopping me from starting my own personal projects with well-designed, complex components.",
      },
    ],
  },
  {
    rev: "REV D",
    video: "Drawer.mp4",
    title: "Custom Drawer Tower",
    summary: "A 3D printed drawer tower, designed using SolidWorks, fitted with 15 small drawers, 1 medium, and 1 large drawer.",
    tags: ["SolidWorks", "For Fun", "3D Printing"],
    details: [
      {
        heading: "Purpose",
        body: "Starting on my arduino kit, I noticed how messy it would get to play with different sensors, switches, and resistors. This motivated me to build my own drawer tower, where I could control exactly how many drawers I needed, and how much desk space it would occupy.",
      },
      {
        heading: "Design",
        body: "I noticed the long print time when I first created the design. This was due to an overly high infill density, and an inefficient structure for space optimization. I used a 5% infill density and removed material between supporting shelves to reduce 2 hours of print time! I also added pokeballs as door handles for fun!",
      },
      {
        heading: "Building it in real life",
        body: "The build was not hard to assemble because of it's simplicity but more importantly, my attention to tolerance. The drawers had a profile that was 0.3 mm lower than the hold profiles in the hull of the drawer tower. This ensured a smooth fit for all my drawers as shown in the video.",
      },
      {
        heading: "What I learned",
        body: "I use the 0.3 mm tolerance for all sliding parts in my prints now as they fit precisely. This project taught me to minimize print times by decreasing infill density, and removing uneccesary material to ensure cost and time efficiency. P.S. Mom liked it so much I have to print one for her now :).",
      },
    ],
  },
];
