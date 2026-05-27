import type { AppCategory } from "@/lib/types";

const names = [
  "Biryani",
  "Meals",
  "Pizza",
  "Burger",
  "Shawarma",
  "Grill",
  "Chinese",
  "South Indian",
  "North Indian",
  "Arabic",
  "Juices",
  "Desserts",
  "Ice Cream",
  "Cakes",
  "Tea & Coffee",
  "Sandwich",
  "Rolls",
  "Momos",
  "Tandoor",
  "Seafood",
  "Kebabs",
  "Healthy",
  "Breakfast",
  "Street Food",
];

const themes = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#84cc16",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#d946ef",
  "#ec4899",
];

const categoryAssets: Record<string, Pick<AppCategory, "image" | "icon">> = {
  Biryani: {
    image: "https://images.unsplash.com/photo-1603496987351-f84a3ba5ec85?auto=format&fit=crop&w=640&q=80",
    icon: "rice-bowl",
  },
  Meals: {
    image: "https://images.unsplash.com/photo-1543352634-a1c51d9f1fa7?auto=format&fit=crop&w=640&q=80",
    icon: "utensils",
  },
  Pizza: {
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=640&q=80",
    icon: "pizza",
  },
  Burger: {
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=640&q=80",
    icon: "sandwich",
  },
  Shawarma: {
    image: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=640&q=80",
    icon: "wrap",
  },
  Grill: {
    image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=640&q=80",
    icon: "flame",
  },
  Chinese: {
    image: "https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=640&q=80",
    icon: "bowl",
  },
  "South Indian": {
    image: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=640&q=80",
    icon: "dosa",
  },
  "North Indian": {
    image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=640&q=80",
    icon: "curry",
  },
  Arabic: {
    image: "https://images.unsplash.com/photo-1541518763669-27fef04b14ea?auto=format&fit=crop&w=640&q=80",
    icon: "kebab",
  },
  Juices: {
    image: "https://images.unsplash.com/photo-1622597467836-f3285f2131b8?auto=format&fit=crop&w=640&q=80",
    icon: "glass-water",
  },
  Desserts: {
    image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=640&q=80",
    icon: "cake-slice",
  },
  "Ice Cream": {
    image: "https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=640&q=80",
    icon: "ice-cream",
  },
  Cakes: {
    image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=640&q=80",
    icon: "cake",
  },
  "Tea & Coffee": {
    image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=640&q=80",
    icon: "coffee",
  },
  Sandwich: {
    image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=640&q=80",
    icon: "sandwich",
  },
  Rolls: {
    image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=640&q=80",
    icon: "wrap",
  },
  Momos: {
    image: "https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?auto=format&fit=crop&w=640&q=80",
    icon: "dumpling",
  },
  Tandoor: {
    image: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=640&q=80",
    icon: "flame-kindling",
  },
  Seafood: {
    image: "https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=640&q=80",
    icon: "fish",
  },
  Kebabs: {
    image: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=640&q=80",
    icon: "skewer",
  },
  Healthy: {
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=640&q=80",
    icon: "salad",
  },
  Breakfast: {
    image: "https://images.unsplash.com/photo-1493770348161-369560ae357d?auto=format&fit=crop&w=640&q=80",
    icon: "sunrise",
  },
  "Street Food": {
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=640&q=80",
    icon: "store",
  },
};

export const defaultAppCategories: AppCategory[] = names.map((name, index) => ({
  id: slugifyCategory(name),
  name,
  slug: slugifyCategory(name),
  image: categoryAssets[name]?.image,
  icon: categoryAssets[name]?.icon,
  sortOrder: index + 1,
  active: true,
  colorTheme: themes[index % themes.length],
}));

export function slugifyCategory(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
