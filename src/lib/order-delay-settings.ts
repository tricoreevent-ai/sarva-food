export const orderDelayThresholdOptions = [10, 15, 20, 25, 30] as const;
export const defaultOrderDelayThresholdMinutes = 15;
const operationalSoundKeys = ["bell", "restaurant-bell", "kitchen-alert", "soft-ding", "loud-alarm", "pos-alert", "repeated-bell"] as const;

export type OrderDelayThresholdMinutes = (typeof orderDelayThresholdOptions)[number];
export type OperationalNotificationSound = (typeof operationalSoundKeys)[number];
export type OperationalNotificationSoundTarget = "newOrder" | "kitchenAccepted" | "preparing" | "readyForPickup" | "urgentDelay" | "customerRequest";
export type OperationalNotificationSoundPrefs = {
  sound: OperationalNotificationSound;
  volume: number;
  repeatCount: number;
  repeatUntilAcknowledged: boolean;
  muted: boolean;
};
export type OperationalNotificationSounds = Record<OperationalNotificationSoundTarget, OperationalNotificationSoundPrefs>;
export type PosDisplayPreferenceDefaults = {
  showImages: boolean;
  cardDensity: "compact" | "comfortable";
  viewMode: "grid" | "list";
  showDescription: boolean;
  touchMode: "large" | "compact";
};
export type PosWorkflowMode = "payment-first" | "kitchen-first" | "flexible";
export type OperationalSettings = {
  orderDelayThresholdMinutes: OrderDelayThresholdMinutes;
  notificationSounds: OperationalNotificationSounds;
  posDisplayDefaults: PosDisplayPreferenceDefaults;
  posWorkflowMode: PosWorkflowMode;
  sequentialOrderNumbering: boolean;
};

export const defaultOperationalNotificationSounds: OperationalNotificationSounds = {
  newOrder: { sound: "loud-alarm", volume: 85, repeatCount: 3, repeatUntilAcknowledged: true, muted: false },
  kitchenAccepted: { sound: "restaurant-bell", volume: 65, repeatCount: 1, repeatUntilAcknowledged: false, muted: false },
  preparing: { sound: "soft-ding", volume: 60, repeatCount: 1, repeatUntilAcknowledged: false, muted: false },
  readyForPickup: { sound: "kitchen-alert", volume: 80, repeatCount: 2, repeatUntilAcknowledged: true, muted: false },
  urgentDelay: { sound: "loud-alarm", volume: 90, repeatCount: 3, repeatUntilAcknowledged: true, muted: false },
  customerRequest: { sound: "pos-alert", volume: 75, repeatCount: 2, repeatUntilAcknowledged: true, muted: false },
};

export const defaultOperationalSettings: OperationalSettings = {
  orderDelayThresholdMinutes: defaultOrderDelayThresholdMinutes,
  notificationSounds: defaultOperationalNotificationSounds,
  posDisplayDefaults: {
    showImages: true,
    cardDensity: "comfortable",
    viewMode: "grid",
    showDescription: true,
    touchMode: "compact",
  },
  posWorkflowMode: "flexible",
  sequentialOrderNumbering: true,
};

export function normalizeOrderDelayThreshold(value: unknown): OrderDelayThresholdMinutes {
  const number = Number(value);
  return orderDelayThresholdOptions.includes(number as OrderDelayThresholdMinutes)
    ? number as OrderDelayThresholdMinutes
    : defaultOrderDelayThresholdMinutes;
}

export function normalizeOperationalSettings(value: unknown): OperationalSettings {
  const data = value && typeof value === "object" ? value as Partial<OperationalSettings> : {};
  return {
    orderDelayThresholdMinutes: normalizeOrderDelayThreshold(data.orderDelayThresholdMinutes),
    notificationSounds: normalizeOperationalNotificationSounds(data.notificationSounds),
    posDisplayDefaults: normalizePosDisplayPreferenceDefaults(data.posDisplayDefaults),
    posWorkflowMode: normalizePosWorkflowMode(data.posWorkflowMode),
    sequentialOrderNumbering: data.sequentialOrderNumbering !== false,
  };
}

export function normalizePosDisplayPreferenceDefaults(value: unknown): PosDisplayPreferenceDefaults {
  const data = value && typeof value === "object" ? value as Partial<PosDisplayPreferenceDefaults> : {};
  return {
    showImages: data.showImages !== false,
    cardDensity: data.cardDensity === "compact" ? "compact" : "comfortable",
    viewMode: data.viewMode === "list" ? "list" : "grid",
    showDescription: data.showDescription !== false,
    touchMode: data.touchMode === "large" ? "large" : "compact",
  };
}

export function normalizePosWorkflowMode(value: unknown): PosWorkflowMode {
  return value === "payment-first" || value === "kitchen-first" || value === "flexible" ? value : "flexible";
}

export function normalizeOperationalNotificationSounds(value: unknown): OperationalNotificationSounds {
  const data = value && typeof value === "object" ? value as Partial<OperationalNotificationSounds> : {};
  return Object.fromEntries(
    (Object.keys(defaultOperationalNotificationSounds) as OperationalNotificationSoundTarget[]).map((target) => [
      target,
      normalizeOperationalNotificationSound(data[target], defaultOperationalNotificationSounds[target]),
    ]),
  ) as OperationalNotificationSounds;
}

function normalizeOperationalNotificationSound(value: unknown, fallback: OperationalNotificationSoundPrefs): OperationalNotificationSoundPrefs {
  const data = value && typeof value === "object" ? value as Partial<OperationalNotificationSoundPrefs> : {};
  const sound = operationalSoundKeys.includes(data.sound as OperationalNotificationSound) ? data.sound as OperationalNotificationSound : fallback.sound;
  return {
    sound,
    volume: clamp(Number(data.volume), 0, 100, fallback.volume),
    repeatCount: clamp(Number(data.repeatCount), 1, 12, fallback.repeatCount),
    repeatUntilAcknowledged: Boolean(data.repeatUntilAcknowledged ?? fallback.repeatUntilAcknowledged),
    muted: Boolean(data.muted ?? fallback.muted),
  };
}

function clamp(value: number, min: number, max: number, fallback: number) {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}
