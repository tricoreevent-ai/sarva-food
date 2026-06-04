"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePublicAppName } from "@/hooks/use-public-app-name";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function InstallPrompt() {
  const productName = usePublicAppName();
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const dismissedTimer = window.setTimeout(() => {
      setDismissed(window.localStorage.getItem("sarva-install-dismissed") === "true");
    }, 0);

    const handlePrompt = (event: Event) => {
      if (process.env.NODE_ENV !== "production" || window.localStorage.getItem("sarva-install-dismissed") === "true") return;
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handlePrompt);
    return () => {
      window.clearTimeout(dismissedTimer);
      window.removeEventListener("beforeinstallprompt", handlePrompt);
    };
  }, []);

  if (!promptEvent || dismissed) {
    return null;
  }

  async function install() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice;
    setPromptEvent(null);
  }

  function dismiss() {
    window.localStorage.setItem("sarva-install-dismissed", "true");
    setDismissed(true);
  }

  return (
    <div className="fixed inset-x-4 bottom-40 z-50 rounded-lg border bg-card/92 p-3 shadow-2xl backdrop-blur-xl md:bottom-5 md:left-auto md:w-80">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
          <Download className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Install {productName}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Optional shortcut for repeat orders. Browser ordering stays fully supported.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={install}>
              Install
            </Button>
            <Button size="icon-sm" variant="ghost" onClick={dismiss} aria-label="Dismiss install prompt">
              <X className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
