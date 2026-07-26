const PROD_PROJECTS = new Set(["sarva-food-app"]);

export function productionFirestorePlan({
  name,
  projectId,
  reads = 0,
  writes = 0,
  deletes = 0,
  details = [],
}) {
  return { name, projectId, reads, writes, deletes, details };
}

export function assertProductionFirestoreAllowed(plan) {
  const details = plan.details ?? [];
  const isProductionProject = PROD_PROJECTS.has(String(plan.projectId ?? ""));
  if (!isProductionProject) return;

  const confirmed = process.env.ALLOW_PRODUCTION_FIRESTORE === "true" || process.argv.includes("--production-confirm");
  const summary = [
    `[production-firestore] ${plan.name}`,
    `project=${plan.projectId}`,
    `estimatedReads=${plan.reads}`,
    `estimatedWrites=${plan.writes}`,
    `estimatedDeletes=${plan.deletes}`,
    ...details.map((item) => `detail=${item}`),
  ].join("\n");

  console.error(summary);
  if (!confirmed) {
    console.error("Refusing to access production Firestore. Set ALLOW_PRODUCTION_FIRESTORE=true or pass --production-confirm.");
    process.exit(2);
  }
}
