import type { AppCuisine } from "@/lib/types";

type CuisineSeed = Pick<AppCuisine, "name" | "icon" | "color" | "description">;

const cloudinaryCuisineBase = "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_900,h_600,c_fill";

const cuisineSeeds: CuisineSeed[] = [
  { name: "Kerala", icon: "leaf", color: "#0f8a5f", description: "Kerala meals, appam, stew, seafood, and coconut-rich dishes." },
  { name: "Malabar", icon: "flame", color: "#c2410c", description: "Malabar biryani, grills, snacks, and coastal Muslim cuisine." },
  { name: "South Indian", icon: "utensils", color: "#16a34a", description: "Dosa, idli, meals, chutneys, and regional tiffin plates." },
  { name: "Tamil", icon: "soup", color: "#d97706", description: "Tamil meals, Chettinad-style gravies, tiffin, and snacks." },
  { name: "Andhra", icon: "pepper", color: "#dc2626", description: "Spicy Andhra meals, biryani, pulusu, and pickles." },
  { name: "Karnataka", icon: "wheat", color: "#ca8a04", description: "Bisi bele bath, dosa, ragi, coastal, and local Bengaluru favorites." },
  { name: "Chettinad", icon: "chef-hat", color: "#b45309", description: "Pepper-forward Chettinad curries, roast items, and masala dishes." },
  { name: "Arabic", icon: "moon", color: "#0f766e", description: "Mandi, shawarma, grills, hummus, and Middle Eastern plates." },
  { name: "Mughlai", icon: "crown", color: "#7c3aed", description: "Rich gravies, kebabs, biryani, tandoor, and royal North Indian plates." },
  { name: "North Indian", icon: "naan", color: "#ea580c", description: "Paneer, dal, naan, chaat, tandoor, and curries." },
  { name: "Chinese", icon: "box", color: "#2563eb", description: "Indo-Chinese noodles, rice, starters, gravies, and soups." },
  { name: "Tandoor", icon: "flame", color: "#ef4444", description: "Tikkas, kebabs, naan, rotis, and clay-oven grilled items." },
  { name: "Grill", icon: "grill", color: "#64748b", description: "Charcoal grills, barbecue, broast, and roasted platters." },
  { name: "Biryani", icon: "rice", color: "#f97316", description: "Layered biryani, mandi rice, family packs, and regional rice specials." },
  { name: "Seafood", icon: "fish", color: "#0284c7", description: "Fish curry, prawns, crab, fry items, and coastal meals." },
  { name: "Vegetarian", icon: "sprout", color: "#15803d", description: "Vegetarian meals, curries, snacks, breakfast, and thali options." },
  { name: "Vegan", icon: "leaf", color: "#65a30d", description: "Plant-based meals, dairy-free dishes, and vegan-friendly options." },
  { name: "Cafe", icon: "coffee", color: "#7c2d12", description: "Coffee, sandwiches, pasta, snacks, bakes, and casual cafe plates." },
  { name: "Bakery", icon: "cake", color: "#be185d", description: "Breads, cakes, pastries, puffs, cookies, and fresh bakery items." },
  { name: "Juice & Shakes", icon: "cup-soda", color: "#0891b2", description: "Fresh juices, shakes, smoothies, mocktails, and cool drinks." },
  { name: "Fast Food", icon: "burger", color: "#eab308", description: "Burgers, pizza, fries, rolls, fried chicken, and quick bites." },
  { name: "Street Food", icon: "store", color: "#f59e0b", description: "Chaat, momos, rolls, pani puri, and regional street snacks." },
  { name: "Healthy", icon: "heart-pulse", color: "#059669", description: "Salads, protein bowls, low-oil dishes, millet, and wellness meals." },
  { name: "Continental", icon: "cloche", color: "#475569", description: "Pasta, steaks, baked dishes, soups, salads, and global cafe plates." },
];

export function slugifyCuisine(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const defaultAppCuisines: AppCuisine[] = cuisineSeeds.map((seed, index) => {
  const slug = slugifyCuisine(seed.name);
  return {
    id: slug,
    name: seed.name,
    slug,
    image: `${cloudinaryCuisineBase}/samples/food/${index % 2 === 0 ? "spices" : "pot-mussels"}.jpg`,
    icon: seed.icon,
    color: seed.color,
    sortOrder: index + 1,
    active: true,
    description: seed.description,
  };
});
