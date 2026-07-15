export function safeClientReason(error: unknown) {
  return error instanceof Error ? error.name : typeof error;
}
