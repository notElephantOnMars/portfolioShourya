import type { DrawerContents } from "./drawerContents";

// How a project's 3D model is shown: on the hologram (spinning) and in the inspect view (fly around, part tabs).
export type ModelPart = {
  match: string[]; // node-name prefixes (as exported from CAD) that make up this part
  title: string;
  body: string;
};

// A drawer that slides open in the inspect view, with parts inside (see drawerContents.ts).
export type ModelDrawer = {
  node: string; // the drawer's node name, exactly
  contents: DrawerContents;
  label: string;
};

export type ProjectModel = {
  file: string; // in public/models/
  upZ?: boolean; // Onshape exports are Z-up; SolidWorks exports are Y-up
  focus?: string[]; // parts the inspect camera frames first (default: the whole model)
  ghost?: string[]; // parts drawn faint in the inspect view, for context
  hinge?: boolean; // the solar car door: animate slide-out then 30° lift
  parts: ModelPart[];
  drawers?: ModelDrawer[];
  testDrive?: TestDrive;
};

// The delivery robot's test drive: the fork (and the payload on it) tips up about the servo shafts, the payload slides
// down the fork until it meets the body, and the wheels spin in place.
export type TestDrive = {
  lift: string[]; // node names, exactly: what tips up (the fork and the payload)
  payload: string; // node name, exactly: what slides down the tipped fork
  servos: string; // node-name prefix of the two lift servos; their shafts set the pivot
  wheels: string; // node-name prefix of each wheel (with its tyre)
};
