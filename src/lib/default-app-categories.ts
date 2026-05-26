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

export const defaultAppCategories: AppCategory[] = names.map((name, index) => ({
  id: slugifyCategory(name),
  name,
  slug: slugifyCategory(name),
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
