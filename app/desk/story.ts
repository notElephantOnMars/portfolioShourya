// State shared between the camera and the hologram every frame, kept outside React so it doesn't re-render 60 times a second.
// p: 0 = wide view of the room, 1 = zoomed in on the hologram. The camera moves it; the hologram powers up with it.
// screenEl: the page layer DeskHero lays over the monitor screen; Monitor.tsx keeps it lined up with the screen.
// Inspect view: inspecting (desk hidden), tabEls (the part tabs, positioned by InspectStage), hoverPart (the part
// whose tab is hovered, -1 for none), doorTarget (0 closed / 1 open, for the solar car door), drawerEls and drawerOpen
// (the drawer markers, and which drawers are asked to be open).
export const story: {
  p: number;
  screenEl: HTMLElement | null;
  inspecting: boolean;
  tabEls: (HTMLElement | null)[];
  hoverPart: number;
  doorTarget: number;
  drawerEls: (HTMLElement | null)[];
  drawerOpen: boolean[];
} = { p: 0, screenEl: null, inspecting: false, tabEls: [], hoverPart: -1, doorTarget: 0, drawerEls: [], drawerOpen: [] };

export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
