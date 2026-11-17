// State shared between the camera and the hologram every frame, kept outside React so it doesn't re-render 60 times a second.
// p: 0 = wide view of the room, 1 = zoomed in on the hologram. The camera moves it; the hologram powers up with it.
// screenEl: the page layer DeskHero lays over the monitor screen; Monitor.tsx keeps it lined up with the screen.
export const story: { p: number; screenEl: HTMLElement | null } = { p: 0, screenEl: null };

export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
