export function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 10) return digits;
  return digits.slice(-10);
}
