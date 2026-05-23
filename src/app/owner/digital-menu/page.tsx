"use client";

import { useMemo, useState } from "react";
import { Maximize2, QrCode, Tv } from "lucide-react";
import { IMAGE_FALLBACKS, SafeImage } from "@/components/media/safe-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAppStore } from "@/lib/app-store";
import { formatCurrency } from "@/lib/utils";

const themes = {
  midnight: "bg-[#10120f] text-white",
  ivory: "bg-[#fffaf0] text-[#211a12]",
  crimson: "bg-[#2a0f10] text-white",
};

export default function DigitalMenuPage() {
  const [fullscreen, setFullscreen] = useState(false);
  const [theme, setTheme] = useState<keyof typeof themes>("midnight");
  const [resolution, setResolution] = useState("1920x1080");
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape");
  const [fontScale, setFontScale] = useState(1);
  const [layoutScale, setLayoutScale] = useState(1);
  const [autoScroll, setAutoScroll] = useState(true);
  const authUser = useAppStore((state) => state.authUser);
  const allMenuItems = useAppStore((state) => state.menuItems);
  const offers = useAppStore((state) => state.offers);
  const restaurantId = authUser.restaurantSlug;
  const menuItems = useMemo(
    () => restaurantId ? allMenuItems.filter((item) => item.restaurantSlug === restaurantId) : allMenuItems,
    [allMenuItems, restaurantId],
  );

  return (
    <main className={`${fullscreen ? "fixed inset-0 z-50 overflow-auto" : "min-h-screen"} ${themes[theme]} p-4`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Tv className="size-7 text-secondary" />
          <div>
            <h1 className="text-2xl font-black">Digital menu display</h1>
            <p className="text-sm opacity-70">TV, monitor, and tablet display mode</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <select className="h-10 rounded-md border bg-background px-3 text-sm text-foreground" value={resolution} onChange={(event) => setResolution(event.target.value)}>
            <option>1920x1080</option>
            <option>1366x768</option>
            <option>1080x1920</option>
          </select>
          <select className="h-10 rounded-md border bg-background px-3 text-sm text-foreground" value={orientation} onChange={(event) => setOrientation(event.target.value as "landscape" | "portrait")}>
            <option value="landscape">Landscape</option>
            <option value="portrait">Portrait</option>
          </select>
          <select className="h-10 rounded-md border bg-background px-3 text-sm text-foreground" value={theme} onChange={(event) => setTheme(event.target.value as keyof typeof themes)}>
            <option value="midnight">Midnight</option>
            <option value="ivory">Ivory</option>
            <option value="crimson">Crimson</option>
          </select>
          <Button variant="secondary" onClick={() => setFullscreen((value) => !value)}>
            <Maximize2 className="size-4" />
            {fullscreen ? "Exit" : "Fullscreen"}
          </Button>
        </div>
      </div>
      <div className="mb-4 grid gap-3 rounded-md border border-white/15 bg-white/10 p-3 text-sm md:grid-cols-3">
        <label className="grid gap-1">
          Font scale {fontScale.toFixed(1)}x
          <input type="range" min="0.8" max="1.4" step="0.1" value={fontScale} onChange={(event) => setFontScale(Number(event.target.value))} />
        </label>
        <label className="grid gap-1">
          Layout scale {layoutScale.toFixed(1)}x
          <input type="range" min="0.8" max="1.3" step="0.1" value={layoutScale} onChange={(event) => setLayoutScale(Number(event.target.value))} />
        </label>
        <label className="flex items-center gap-2 font-semibold">
          <input type="checkbox" checked={autoScroll} onChange={(event) => setAutoScroll(event.target.checked)} />
          Auto-scroll banners
        </label>
      </div>
      <section
        className={`grid gap-4 ${orientation === "landscape" ? "xl:grid-cols-[1.2fr_0.8fr]" : ""}`}
        style={{ fontSize: `${fontScale}rem`, transform: `scale(${layoutScale})`, transformOrigin: "top left", width: `${100 / layoutScale}%` }}
      >
        <div className={`grid gap-4 ${orientation === "landscape" ? "md:grid-cols-2" : ""}`}>
          {menuItems.slice(0, 8).map((item) => (
            <Card key={item.id} className="border-white/10 bg-white/10 text-inherit">
              <CardContent className="grid grid-cols-[112px_1fr] gap-4 p-4 sm:grid-cols-[140px_1fr]">
                <div className="relative aspect-square overflow-hidden rounded-md bg-black/30">
                  <SafeImage src={item.image} alt={item.name} fill fallbackSrc={IMAGE_FALLBACKS.food} sizes="140px" className="object-cover" />
                </div>
                <div>
                  <Badge variant={item.soldOut ? "destructive" : "success"}>{item.soldOut ? "Sold out" : item.category}</Badge>
                  <h2 className="mt-3 text-2xl font-black">{item.name}</h2>
                  <p className="mt-2 text-sm leading-6 opacity-75">{item.description}</p>
                  <p className="mt-3 text-3xl font-black text-secondary">{formatCurrency(item.price)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <aside className="space-y-4">
          <Card className={`bg-secondary text-secondary-foreground ${autoScroll ? "animate-pulse" : ""}`}>
            <CardContent className="space-y-3 p-6">
              <p className="text-sm font-black uppercase">Slideshow banners</p>
              {offers.slice(0, 4).map((offer) => (
                <div key={offer.code} className="rounded-md bg-white/45 p-3">
                  <p className="text-2xl font-black">{offer.code}</p>
                  <p className="text-sm font-semibold">{offer.title}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-white/10 text-inherit">
            <CardContent className="grid place-items-center gap-4 p-8 text-center">
              <QrCode className="size-28 text-secondary" />
              <h2 className="text-3xl font-black">Scan to order</h2>
              <p className="opacity-75">QR ordering maps each order to the table.</p>
            </CardContent>
          </Card>
        </aside>
      </section>
    </main>
  );
}
