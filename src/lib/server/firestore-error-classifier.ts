import "server-only";

export type FirestoreFailureKind =
  | "quota_exceeded"
  | "permission_denied"
  | "authentication_failed"
  | "deadline_exceeded"
  | "network_unavailable"
  | "service_unavailable"
  | "missing_configuration"
  | "unknown";

export function classifyFirestoreError(error: unknown): {
  kind: FirestoreFailureKind;
  issue: string;
  publicMessage: string;
  retryable: boolean;
} {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const code = String((error as { code?: unknown } | null)?.code ?? "").toLowerCase();
  const text = `${code} ${message}`.toLowerCase();

  if (/resource[_ -]?exhausted|quota|8\b/.test(text)) {
    return {
      kind: "quota_exceeded",
      issue: "firestore_quota_exceeded",
      publicMessage: "Restaurant data is temporarily unavailable because the database quota is exhausted.",
      retryable: true,
    };
  }
  if (/permission[_ -]?denied|7\b/.test(text)) {
    return {
      kind: "permission_denied",
      issue: "firestore_permission_denied",
      publicMessage: "Restaurant data is temporarily unavailable because database access was denied.",
      retryable: false,
    };
  }
  if (/unauthenticated|credential|invalid_grant|16\b/.test(text)) {
    return {
      kind: "authentication_failed",
      issue: "firestore_authentication_failed",
      publicMessage: "Restaurant data is temporarily unavailable because database credentials are not valid.",
      retryable: false,
    };
  }
  if (/deadline|timeout|timed out|4\b/.test(text)) {
    return {
      kind: "deadline_exceeded",
      issue: "firestore_timeout",
      publicMessage: "Restaurant data is taking too long to respond.",
      retryable: true,
    };
  }
  if (/unavailable|econnreset|enotfound|network|14\b/.test(text)) {
    return {
      kind: "network_unavailable",
      issue: "firestore_network_unavailable",
      publicMessage: "Restaurant data is temporarily unavailable because the database network connection failed.",
      retryable: true,
    };
  }
  if (/missing .*firebase|missing .*firestore|project id|private key|client email/.test(text)) {
    return {
      kind: "missing_configuration",
      issue: "firestore_configuration_missing",
      publicMessage: "Restaurant data is temporarily unavailable because database configuration is incomplete.",
      retryable: false,
    };
  }
  return {
    kind: "unknown",
    issue: "firestore_unavailable",
    publicMessage: "Restaurant data is temporarily unavailable.",
    retryable: true,
  };
}
