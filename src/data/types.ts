export type Region =
  | "head-neck"
  | "back"
  | "thorax"
  | "abdomen-pelvis"
  | "shoulder-arm"
  | "forearm-hand"
  | "hip-thigh"
  | "leg-foot";
export type Layer = "superficial" | "deep";
export type Side = "left" | "right" | "midline";
export type PartType = "muscle" | "bone" | "connective";
export type Vec3 = [number, number, number];

export type CatalogPart = {
  /** Stable id: key plus "-l" / "-r" for bilateral parts, e.g. "lateral-head-of-gastrocnemius-l". */
  id: string;
  /** GLB node name, unique per mesh. */
  node: string;
  /** Side-agnostic slug shared by left and right copies. */
  key: string;
  /** Display name (nameDetail from the model, parentheses stripped). */
  name: string;
  /** Broader grouping name from the model when it differs from name, e.g. "Gastrocnemius". */
  group?: string;
  type: PartType;
  side: Side;
  region: Region;
  layer: Layer;
  /** Center of the part's bounding box, in model space after recentering. */
  centroid: Vec3;
  bbox: [Vec3, Vec3];
  /** English Wikipedia article URL, anchor removed. */
  wiki?: string;
};

export type Catalog = {
  meta: {
    source: string;
    generated: string;
    /** Subtract this from raw GLB coordinates to get catalog/model space. */
    modelCenter: Vec3;
    modelSize: Vec3;
    partCount: number;
  };
  parts: CatalogPart[];
};
