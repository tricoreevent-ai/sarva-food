export const orderDelayThresholdOptions = [10, 15, 20, 25, 30] as const;
export const defaultOrderDelayThresholdMinutes = 15;

export type OrderDelayThresholdMinutes = (typeof orderDelayThresholdOptions)[number];
export type OperationalSettings = {
  orderDelayThresholdMinutes: OrderDelayThresholdMinutes;
};

export const defaultOperationalSettings: OperationalSettings = {
  orderDelayThresholdMinutes: defaultOrderDelayThresholdMinutes,
};

export function normalizeOrderDelayThreshold(value: unknown): OrderDelayThresholdMinutes {
  const number = Number(value);
  return orderDelayThresholdOptions.includes(number as OrderDelayThresholdMinutes)
    ? number as OrderDelayThresholdMinutes
    : defaultOrderDelayThresholdMinutes;
}

export function normalizeOperationalSettings(value: unknown): OperationalSettings {
  const data = value && typeof value === "object" ? value as Partial<OperationalSettings> : {};
  return { orderDelayThresholdMinutes: normalizeOrderDelayThreshold(data.orderDelayThresholdMinutes) };
}
