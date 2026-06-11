"use client";

import { forwardRef, useEffect, useId, useRef, useState, useSyncExternalStore, type ButtonHTMLAttributes, type KeyboardEvent } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AlertButtonVariant, AlertRequest } from "@/types/alert.types";

type AlertModalProps = {
  request: AlertRequest | null;
  stackCount: number;
  onResolve: (request: AlertRequest, value: unknown) => void;
};

const buttonStyles: Record<AlertButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  secondary: "border bg-background text-foreground hover:bg-muted",
};

export function AlertModal({ request, stackCount, onResolve }: AlertModalProps) {
  return (
    <AnimatePresence>
      {request ? (
        <AlertDialogCard key={request.id} request={request} stackCount={stackCount} onResolve={onResolve} />
      ) : null}
    </AnimatePresence>
  );
}

function AlertDialogCard({ request, stackCount, onResolve }: { request: AlertRequest; stackCount: number; onResolve: AlertModalProps["onResolve"] }) {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const firstButtonRef = useRef<HTMLButtonElement>(null);
  const [inputValue, setInputValue] = useState(request.defaultValue ?? "");
  const [loading, setLoading] = useState(false);
  const dragY = useMotionValue(0);
  const backdropOpacity = useTransform(dragY, [0, 180], [1, 0.35]);
  const tone = request.options.tone ?? (request.options.confirmVariant === "danger" ? "danger" : "default");
  const closeOnBackdrop = request.options.closeOnBackdrop ?? true;
  const title = request.options.title ?? defaultTitle(request.kind, tone);
  const okText = request.options.okText ?? "OK";
  const cancelText = request.options.cancelText ?? "Cancel";
  const confirmText = request.options.confirmText ?? (request.kind === "confirm" ? "Confirm" : okText);
  const confirmVariant = request.options.confirmVariant ?? (tone === "danger" ? "danger" : "primary");

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (request.kind === "prompt") inputRef.current?.focus();
      else firstButtonRef.current?.focus();
    }, 40);
    return () => window.clearTimeout(id);
  }, [request.kind]);

  async function complete(value: unknown) {
    if (loading) return;
    if (value !== false && value !== null && request.options.onConfirm) {
      setLoading(true);
      try {
        await request.options.onConfirm(request.kind === "prompt" ? inputValue : undefined);
      } finally {
        setLoading(false);
      }
    }
    onResolve(request, value);
  }

  function cancel() {
    onResolve(request, request.kind === "confirm" ? false : null);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])');
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const content = (
    <motion.div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={typeof request.message === "string" ? descriptionId : undefined}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      drag={isMobile ? "y" : false}
      dragConstraints={{ top: 0, bottom: 220 }}
      dragElastic={0.08}
      style={isMobile ? { y: dragY } : undefined}
      onDragEnd={(_, info) => {
        if (isMobile && (info.offset.y > 110 || info.velocity.y > 700)) {
          if (navigator.vibrate) navigator.vibrate(12);
          cancel();
        }
      }}
      initial={isMobile ? { y: "100%", opacity: 0 } : { scale: 0.9, opacity: 0 }}
      animate={isMobile ? { y: 0, opacity: 1 } : { scale: 1, opacity: 1 }}
      exit={isMobile ? { y: "100%", opacity: 0 } : { scale: 0.95, opacity: 0 }}
      transition={isMobile ? { type: "spring", damping: 25, stiffness: 260 } : { duration: 0.2 }}
      className={cn(
        "fixed inset-x-0 bottom-0 z-[100000] max-h-[88dvh] overflow-hidden rounded-t-2xl border bg-card text-card-foreground shadow-2xl outline-none md:inset-auto md:left-1/2 md:top-1/2 md:w-[min(92vw,28rem)] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl",
        stackCount > 1 && "md:shadow-[0_24px_80px_rgba(0,0,0,0.28)]",
      )}
    >
      <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-muted-foreground/30 md:hidden" />
      <div className="max-h-[88dvh] overflow-y-auto p-5">
        <div className="flex items-start gap-3">
          <span className={cn("mt-0.5 grid size-9 shrink-0 place-items-center rounded-full", toneClasses(tone).iconBg)}>
            <AlertIcon tone={tone} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-black leading-6">{title}</h2>
            <div id={descriptionId} className="mt-2 text-sm font-semibold leading-6 text-muted-foreground">
              <AlertMessage message={request.message} typewriter={Boolean(request.options.typewriter)} />
            </div>
          </div>
        </div>

        {request.options.content ? <div className="mt-4">{request.options.content}</div> : null}
        {request.options.confetti || tone === "success" ? <ConfettiBurst /> : null}

        {request.kind === "prompt" ? (
          <label className="mt-4 grid gap-2 text-sm font-bold" htmlFor={`alert-prompt-${request.id}`}>
            {request.inputLabel ?? "Value"}
            <input
              ref={inputRef}
              id={`alert-prompt-${request.id}`}
              name="alertPromptValue"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder={request.placeholder}
              className="h-11 rounded-xl border bg-background px-3 text-sm font-semibold outline-none focus:ring-4 focus:ring-primary/15"
            />
          </label>
        ) : null}

        <div className={cn("mt-5 grid gap-2", request.kind === "alert" ? "grid-cols-1" : "grid-cols-2")}>
          {request.kind !== "alert" ? (
            <AlertButton variant={request.options.cancelVariant ?? "secondary"} onClick={cancel} disabled={loading}>
              {cancelText}
            </AlertButton>
          ) : null}
          <AlertButton
            ref={firstButtonRef}
            variant={confirmVariant}
            onClick={() => void complete(request.kind === "prompt" ? inputValue : request.kind === "confirm" ? true : undefined)}
            disabled={loading}
          >
            {loading ? "Working..." : confirmText}
          </AlertButton>
        </div>
      </div>
    </motion.div>
  );

  return (
    <>
      <motion.button
        type="button"
        aria-label="Close alert"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ opacity: isMobile ? backdropOpacity : undefined }}
        transition={{ duration: 0.18 }}
        onClick={() => closeOnBackdrop && cancel()}
        className={cn("fixed inset-0 z-[99999] bg-black/45 backdrop-blur-sm", stackCount > 1 && "backdrop-blur-md")}
      />
      {content}
    </>
  );
}

const AlertButtonBase = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant: AlertButtonVariant }>(
  function AlertButtonBase({ className, variant, ...props }, ref) {
    return <button ref={ref} className={cn("inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-black transition-colors focus:outline-none focus:ring-4 focus:ring-primary/15 disabled:pointer-events-none disabled:opacity-50", buttonStyles[variant], className)} {...props} />;
  },
);
AlertButtonBase.displayName = "AlertButtonBase";

const AlertButton = motion.create(AlertButtonBase);

function AlertMessage({ message, typewriter }: { message: React.ReactNode; typewriter: boolean }) {
  const text = typeof message === "string" ? message : "";
  const [count, setCount] = useState(typewriter ? 0 : text.length);

  useEffect(() => {
    if (!typewriter || !text) return;
    const id = window.setInterval(() => {
      setCount((current) => {
        if (current >= text.length) {
          window.clearInterval(id);
          return current;
        }
        return current + 1;
      });
    }, 18);
    return () => window.clearInterval(id);
  }, [text, typewriter]);

  if (typeof message !== "string") return <>{message}</>;
  return <>{typewriter ? text.slice(0, count) : text}</>;
}

function ConfettiBurst() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-24 overflow-hidden">
      {Array.from({ length: 14 }).map((_, index) => (
        <motion.span
          key={index}
          className="absolute top-4 size-2 rounded-sm"
          style={{ left: `${8 + index * 6}%`, backgroundColor: ["#ff4d00", "#00a884", "#facc15", "#38bdf8"][index % 4] }}
          initial={{ y: -12, opacity: 0, rotate: 0 }}
          animate={{ y: 78, opacity: [0, 1, 0], rotate: 260 }}
          transition={{ duration: 1.2, delay: index * 0.025 }}
        />
      ))}
    </div>
  );
}

function AlertIcon({ tone }: { tone: string }) {
  if (tone === "success") return <CheckCircle2 className="size-5 text-emerald-600" />;
  if (tone === "danger") return <XCircle className="size-5 text-red-600" />;
  if (tone === "warning") return <AlertTriangle className="size-5 text-amber-600" />;
  return <Info className="size-5 text-primary" />;
}

function toneClasses(tone: string) {
  if (tone === "success") return { iconBg: "bg-emerald-500/10" };
  if (tone === "danger") return { iconBg: "bg-red-500/10" };
  if (tone === "warning") return { iconBg: "bg-amber-500/10" };
  return { iconBg: "bg-primary/10" };
}

function defaultTitle(kind: string, tone: string) {
  if (tone === "success") return "Success";
  if (tone === "danger") return "Warning";
  if (tone === "warning") return "Please check";
  if (kind === "confirm") return "Confirm action";
  if (kind === "prompt") return "Input required";
  return "Notice";
}

function useMediaQuery(query: string) {
  const subscribe = (callback: () => void) => {
    const media = window.matchMedia(query);
    media.addEventListener("change", callback);
    return () => media.removeEventListener("change", callback);
  };
  const getSnapshot = () => (typeof window === "undefined" ? false : window.matchMedia(query).matches);
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
