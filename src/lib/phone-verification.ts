export type PhoneVerificationContext =
  | "customer-login"
  | "customer-registration"
  | "qr-ordering"
  | "customer-profile"
  | "waiter-login"
  | "delivery-login";

export function normalizeIndiaPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  const local = digits.length === 12 && digits.startsWith("91")
    ? digits.slice(2)
    : digits.length === 11 && digits.startsWith("0")
      ? digits.slice(1)
      : digits;
  return /^[6-9]\d{9}$/.test(local) ? `+91${local}` : "";
}

export function maskPhone(value: string) {
  const phone = normalizeIndiaPhone(value);
  return phone ? `+91 ***** ${phone.slice(-4)}` : "";
}
