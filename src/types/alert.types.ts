import type { ReactNode } from "react";

export type AlertButtonVariant = "primary" | "danger" | "secondary";
export type AlertTone = "default" | "success" | "warning" | "danger";
export type AlertKind = "alert" | "confirm" | "prompt";

export type AlertOptions = {
  title?: ReactNode;
  content?: ReactNode;
  okText?: string;
  cancelText?: string;
  confirmText?: string;
  confirmVariant?: AlertButtonVariant;
  cancelVariant?: AlertButtonVariant;
  closeOnBackdrop?: boolean;
  tone?: AlertTone;
  confetti?: boolean;
  typewriter?: boolean;
  onConfirm?: (value?: string) => void | Promise<void>;
};

export type PromptOptions = AlertOptions & {
  defaultValue?: string;
  placeholder?: string;
  inputLabel?: string;
};

export type AlertRequest = {
  id: string;
  kind: AlertKind;
  message: ReactNode;
  defaultValue?: string;
  placeholder?: string;
  inputLabel?: string;
  options: AlertOptions;
  resolve: (value: unknown) => void;
};

export type AlertApi = {
  alert: (message: ReactNode, options?: AlertOptions) => Promise<void>;
  confirm: (message: ReactNode, options?: AlertOptions) => Promise<boolean>;
  prompt: (message: ReactNode, defaultValueOrOptions?: string | PromptOptions, options?: PromptOptions) => Promise<string | null>;
};

export type NativeAlertOverrideController = {
  enable: () => void;
  disable: () => void;
  useNative: () => void;
  useCustom: () => void;
  isCustomEnabled: () => boolean;
  restore: () => void;
};
