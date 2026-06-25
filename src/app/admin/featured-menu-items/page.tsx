"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Search, Star, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAdminRepositoryData } from "@/hooks/use-admin-repository-data";
import type { MenuItem } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export default function AdminFeaturedMenuItemsPage() {
  const { restaurants, menuItems, updateMenuItem } = useAdminRepositoryData();
  const [restaurantQuery, setRestaurantQuery] = useState("");
  const [itemQuery, setItemQuery] = useState("");
  const [savingId, setSavingId] = useState("");

  const restaurantMap = useMemo(() => new Map(restaurants.map((item) => [item.slug, item])), [restaurants]);
  const visibleItems = useMemo(() => {
    const restaurantSearch = restaurantQuery.trim().toLowerCase();
    const itemSearch = itemQuery.trim().toLowerCase();
    return menuItems
      .filter((item) => {
        const restaurant = restaurantMap.get(item.restaurantSlug);
        const restaurantText = [restaurant?.name, restaurant?.displayName, item.restaurantSlug].join(" ").toLowerCase();
        const itemText = [item.name, item.category, item.description].join(" ").toLowerCase();
        return (!restaurantSearch || restaurantText.includes(restaurantSearch)) && (!itemSearch || itemText.includes(itemSearch));
      })
      .sort((first, second) => Number(Boolean(second.featuredEnabled)) - Number(Boolean(first.featuredEnabled)) || (first.featuredOrder ?? 999) - (second.featuredOrder ?? 999) || first.name.localeCompare(second.name));
  }, [itemQuery, menuItems, restaurantMap, restaurantQuery]);
  const featuredItems = visibleItems.filter((item) => item.featuredEnabled);

  async function save(item: MenuItem, patch: Partial<MenuItem>) {
    setSavingId(item.id);
    try {
      await updateMenuItem({ ...item, ...patch });
    } finally {
      setSavingId("");
    }
  }

  function nextFeaturedOrder() {
    return Math.max(0, ...menuItems.map((item) => item.featuredOrder ?? 0)) + 1;
  }

  async function move(item: MenuItem, direction: -1 | 1) {
    const ordered = menuItems.filter((entry) => entry.featuredEnabled).sort((first, second) => (first.featuredOrder ?? 999) - (second.featuredOrder ?? 999));
    const index = ordered.findIndex((entry) => entry.id === item.id);
    const swap = ordered[index + direction];
    if (!swap) return;
    await Promise.all([
      save(item, { featuredOrder: swap.featuredOrder ?? index + direction + 1 }),
      save(swap, { featuredOrder: item.featuredOrder ?? index + 1 }),
    ]);
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Featured Menu Items" description="Promote menu items on the customer home page and control display order." />
      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-2">
          <label className="relative">
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input className="pl-9" value={restaurantQuery} onChange={(event) => setRestaurantQuery(event.target.value)} placeholder="Search restaurant" />
          </label>
          <label className="relative">
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input className="pl-9" value={itemQuery} onChange={(event) => setItemQuery(event.target.value)} placeholder="Search menu item" />
          </label>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {visibleItems.map((item) => {
          const restaurant = restaurantMap.get(item.restaurantSlug);
          const active = Boolean(item.featuredEnabled);
          return (
            <Card key={item.id} className={active ? "border-orange-200 bg-orange-50/40" : ""}>
              <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <p className="text-base font-black">{item.name}</p>
                  <p className="text-sm font-semibold text-muted-foreground">{restaurant?.name ?? item.restaurantSlug} - {item.category} - {formatCurrency(item.price)}</p>
                  <p className="text-xs font-bold text-muted-foreground">Featured order: {item.featuredOrder ?? "-"} - Orders: {item.orderCount ?? 0}</p>
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  <Button type="button" variant="outline" disabled={!active || savingId === item.id} onClick={() => void move(item, -1)}><ArrowUp className="size-4" />Up</Button>
                  <Button type="button" variant="outline" disabled={!active || savingId === item.id} onClick={() => void move(item, 1)}><ArrowDown className="size-4" />Down</Button>
                  <Button type="button" variant={active ? "default" : "outline"} disabled={savingId === item.id} onClick={() => void save(item, { featuredEnabled: !active, featuredOrder: active ? item.featuredOrder : nextFeaturedOrder() })}>
                    {active ? <ToggleRight className="size-4" /> : <ToggleLeft className="size-4" />}
                    {active ? "Enabled" : "Enable"}
                  </Button>
                  {active ? (
                    <Button type="button" variant="outline" disabled={savingId === item.id} onClick={() => void save(item, { featuredEnabled: false })}>
                      <Trash2 className="size-4" />
                      Remove
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {!visibleItems.length ? (
          <Card>
            <CardContent className="grid min-h-40 place-items-center p-6 text-center text-sm font-semibold text-muted-foreground">
              No menu items match this search.
            </CardContent>
          </Card>
        ) : null}
      </div>
      <p className="text-sm font-bold text-muted-foreground">
        <Star className="mr-1 inline size-4 text-orange-600" />
        {featuredItems.length} item{featuredItems.length === 1 ? "" : "s"} currently featured.
      </p>
    </div>
  );
}
