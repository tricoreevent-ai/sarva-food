import type { AppCuisine } from "@/lib/types";

type CuisineSeed = Pick<AppCuisine, "name" | "icon" | "color" | "description" | "image">;

const cloudinaryCuisineBase = "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,dpr_auto,w_900,h_600,c_fill";

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
  {
    name: "Punjabi",
    icon: "wheat",
    color: "#d97706",
    image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=900&q=80",
    description: "Butter chicken, paneer, dal makhani, naan, lassi, and robust dhaba-style plates.",
  },
  {
    name: "Hyderabadi",
    icon: "rice",
    color: "#f97316",
    image: "https://images.unsplash.com/photo-1701579231305-d84d8af9a3fd?auto=format&fit=crop&w=900&q=80",
    description: "Dum biryani, haleem, kebabs, salan, and royal Deccan flavors.",
  },
  {
    name: "Bengali",
    icon: "fish",
    color: "#be123c",
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80",
    description: "Fish curry, kosha mangsho, rolls, sweets, rice plates, and mustard-forward gravies.",
  },
  {
    name: "Gujarati",
    icon: "sprout",
    color: "#65a30d",
    image: "https://images.unsplash.com/photo-1543352634-a1c51d9f1fa7?auto=format&fit=crop&w=900&q=80",
    description: "Thali, dhokla, farsan, kadhi, khichdi, and balanced sweet-spicy vegetarian dishes.",
  },
  {
    name: "Rajasthani",
    icon: "flame",
    color: "#c2410c",
    image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80",
    description: "Dal baati churma, laal maas, gatte, kachori, and desert-state specialties.",
  },
  {
    name: "Maharashtrian",
    icon: "store",
    color: "#ea580c",
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80",
    description: "Vada pav, misal, poha, bhakri, coastal curries, and homestyle meals.",
  },
  {
    name: "Goan",
    icon: "fish",
    color: "#0284c7",
    image: "https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=900&q=80",
    description: "Goan fish curry, vindaloo, xacuti, seafood fry, and coconut-rich coastal food.",
  },
  {
    name: "Awadhi",
    icon: "chef-hat",
    color: "#7c3aed",
    image: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=900&q=80",
    description: "Lucknowi kebabs, biryani, korma, sheermal, and slow-cooked royal dishes.",
  },
  {
    name: "Kashmiri",
    icon: "cloche",
    color: "#be185d",
    image: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=900&q=80",
    description: "Rogan josh, yakhni, dum aloo, kahwa, and aromatic mountain cuisine.",
  },
  {
    name: "North East Indian",
    icon: "leaf",
    color: "#059669",
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80",
    description: "Momos, thukpa, smoked meats, bamboo shoot dishes, and fresh herb-led plates.",
  },
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
    image: seed.image ?? `${cloudinaryCuisineBase}/samples/food/${index % 2 === 0 ? "spices" : "pot-mussels"}.jpg`,
    icon: seed.icon,
    color: seed.color,
    sortOrder: index + 1,
    active: true,
    description: seed.description,
  };
});
