export const ownerPosConfig = {
  route: "/owner/pos",
  legacyRedirects: ["/pos", "/pos/tables", "/pos/invoice"],
  storageScope: "sarva-owner-pos",
  requiredFeature: "pos",
  allowedRoles: ["owner", "manager", "cashier"],
} as const;

