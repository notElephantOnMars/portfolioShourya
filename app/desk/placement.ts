// Shared measurements for the desk scene, in metres (a real desk is ~75 cm high).
export const DESK_TOP = 0.75;
export const DESK_W = 1.6;
export const DESK_D = 0.75;
export const MAT_TOP = DESK_TOP + 0.003; // the desk mat the keyboard and mouse sit on

// Where things sit on the desk (x = left/right, z = back/front; the camera looks toward -z).
export const SPOT = {
  monitor: [0, -0.27],
  psu: [-0.5, -0.12],
  figures: -0.17, // the figure row, just in front of the monitor
  projector: [0, 0.04],
  keyboard: [-0.04, 0.2],
  mouse: [0.31, 0.21],
  lamp: [0.68, -0.28],
} as const;

// Hologram panel: floats above the projector.
export const HOLO = {
  width: 0.4,
  height: 0.25,
  center: [0, DESK_TOP + 0.255, 0.04] as [number, number, number],
};

// Camera poses: the wide view of the room, and the close-up on the hologram.
export const POSE = {
  intro: { pos: [0.05, 1.33, 1.42] as [number, number, number], look: [0, 1.0, -0.12] as [number, number, number] },
  holo: { pos: [0, 1.04, 0.68] as [number, number, number], look: [0, 1.0, 0.04] as [number, number, number] },
};
