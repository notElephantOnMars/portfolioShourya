// How a project's 3D model is shown: on the hologram (spinning) and in the inspect view (fly around, part tabs).
export type ModelPart = {
  match: string[]; // node-name prefixes (as exported from CAD) that make up this part
  title: string;
  body: string;
};

export type ProjectModel = {
  file: string; // in public/models/
  upZ?: boolean; // Onshape exports are Z-up; SolidWorks exports are Y-up
  focus?: string[]; // parts the inspect camera frames first (default: the whole model)
  ghost?: string[]; // parts drawn faint in the inspect view, for context
  hinge?: boolean; // the solar car door: animate slide-out then 30° lift
  parts: ModelPart[];
};
