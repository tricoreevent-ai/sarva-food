export type EnhancementTestCategory =
  | "lifecycle"
  | "load"
  | "stress"
  | "memory"
  | "performance"
  | "isolation"
  | "permission"
  | "feature-flag"
  | "lazy-loading"
  | "error-recovery"
  | "hot-toggle";

export const enhancementTestCategories = [
  "lifecycle",
  "load",
  "stress",
  "memory",
  "performance",
  "isolation",
  "permission",
  "feature-flag",
  "lazy-loading",
  "error-recovery",
  "hot-toggle",
] satisfies EnhancementTestCategory[];
