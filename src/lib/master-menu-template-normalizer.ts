import type { MasterMenuTemplateDoc } from "@/types/firebase";

export type MasterTemplateInput = Partial<MasterMenuTemplateDoc> & Record<string, unknown>;
export type TemplateImportMode = "overwrite" | "merge" | "create-only";
export type TemplateImportFormat = "json" | "csv" | "xlsx";

export const keralaStarterMenuTemplates: MasterTemplateInput[] = [
  {
    id: "kerala-malabar-chicken-biryani",
    templateName: "kerala-malabar-chicken-biryani",
    displayName: "Malabar Chicken Biryani",
    categoryId: "biryani",
    cuisineIds: ["kerala", "malabar", "indian"],
    foodType: "nonveg",
    description: "Layered Kerala-style chicken biryani with short-grain rice, fried onion, mint, coriander, ghee, and warm spices.",
    shortDescription: "Kerala Malabar chicken biryani with ghee rice and fried onion.",
    ingredients: ["Chicken", "Jeerakasala rice", "Onion", "Tomato", "Mint", "Coriander", "Ghee", "Biryani masala"],
    nutrition: { calories: 720, protein: 34, carbs: 78, fat: 28 },
    allergens: ["Dairy"],
    searchKeywords: ["biryani", "malabar", "chicken", "kerala", "rice"],
    badges: ["Popular", "Chef Special"],
    tags: ["biryani", "rice", "malabar"],
    prepTime: 25,
    cookTime: 45,
    recommendedPrice: 249,
    packingCharge: 15,
    gst: 5,
    images: [],
    primaryImage: "",
    thumbnail: "",
    displayOrder: 1,
    rating: 4.7,
    difficulty: "medium",
    servingSize: "1 portion",
    channelDefaults: { dineIn: true, parcel: true, delivery: true },
    availability: { active: true, soldOut: false },
  },
  {
    id: "kerala-appam-veg-stew",
    templateName: "kerala-appam-veg-stew",
    displayName: "Appam with Vegetable Stew",
    categoryId: "breakfast",
    cuisineIds: ["kerala", "south-indian"],
    foodType: "veg",
    description: "Soft fermented rice appam served with coconut milk vegetable stew.",
    shortDescription: "Appam with mild coconut vegetable stew.",
    ingredients: ["Rice batter", "Coconut milk", "Carrot", "Beans", "Potato", "Whole spices", "Curry leaves"],
    nutrition: { calories: 430, protein: 8, carbs: 64, fat: 14 },
    allergens: [],
    searchKeywords: ["appam", "stew", "kerala", "breakfast", "coconut"],
    badges: ["Vegetarian"],
    tags: ["breakfast", "kerala", "coconut"],
    prepTime: 20,
    cookTime: 25,
    recommendedPrice: 159,
    packingCharge: 10,
    gst: 5,
    displayOrder: 2,
    rating: 4.5,
    difficulty: "easy",
    servingSize: "2 appam + stew",
    channelDefaults: { dineIn: true, parcel: true, delivery: true },
    availability: { active: true, soldOut: false },
  },
  {
    id: "kerala-beef-fry",
    templateName: "kerala-beef-fry",
    displayName: "Kerala Beef Fry",
    categoryId: "starters",
    cuisineIds: ["kerala"],
    foodType: "nonveg",
    description: "Dry roasted Kerala beef fry with coconut slices, curry leaves, pepper, and garam masala.",
    shortDescription: "Peppery Kerala beef fry with coconut slices.",
    ingredients: ["Beef", "Coconut slices", "Curry leaves", "Pepper", "Garam masala", "Onion"],
    nutrition: { calories: 540, protein: 38, carbs: 12, fat: 38 },
    allergens: [],
    searchKeywords: ["beef", "fry", "kerala", "pepper", "starter"],
    badges: ["Spicy", "Chef Special"],
    tags: ["starter", "kerala", "spicy"],
    prepTime: 20,
    cookTime: 50,
    recommendedPrice: 289,
    packingCharge: 15,
    gst: 5,
    displayOrder: 3,
    rating: 4.6,
    difficulty: "medium",
    servingSize: "250 g",
    channelDefaults: { dineIn: true, parcel: true, delivery: true },
    availability: { active: true, soldOut: false },
  },
];

export function normalizeMasterTemplate(input: MasterTemplateInput, index = 0): MasterTemplateInput {
  const displayName = String(input.displayName || input.templateName || input.name || input.itemName || "").trim();
  const templateName = slug(String(input.templateName || displayName));
  const images = uniqueStrings([...(Array.isArray(input.images) ? input.images : []), input.primaryImage, input.thumbnail, input.imageURL, input.imageUrl, input.image]).filter(isSafeImageUrl);
  const price = Number(input.recommendedPrice ?? input.price ?? input.basePrice ?? input.dineInPrice ?? 0);
  const active = input.active !== false && input.isAvailable !== false;
  return {
    ...input,
    id: String(input.id || templateName),
    templateName,
    displayName,
    categoryId: String(input.categoryId || input.category || "").trim(),
    subcategoryId: String(input.subcategoryId || input.subCategory || input.subcategory || "").trim(),
    cuisineIds: uniqueStrings(input.cuisineIds || input.cuisines || []),
    foodType: normalizeFoodType(input.foodType),
    description: String(input.description || input.longDescription || input.shortDescription || displayName),
    shortDescription: String(input.shortDescription || input.description || input.longDescription || "").slice(0, 180),
    ingredients: uniqueStrings(input.ingredients || []),
    allergens: uniqueStrings(input.allergens || []),
    searchKeywords: uniqueStrings(input.searchKeywords || input.keywords || []),
    badges: uniqueStrings(input.badges || []),
    tags: uniqueStrings(input.tags || []),
    nutrition: asRecord(input.nutrition || input.nutritionInfo),
    modifiers: normalizeModifierGroups(input.modifiers),
    addonGroups: normalizeAddons(input.addonGroups || input.addOns || input.addons),
    images,
    primaryImage: String(input.primaryImage || images[0] || ""),
    thumbnail: String(input.thumbnail || input.primaryImage || images[0] || ""),
    displayOrder: Number(input.displayOrder ?? index + 1),
    recommendedPrice: price,
    basePrice: Number(input.basePrice ?? price),
    dineInPrice: Number(input.dineInPrice ?? price),
    parcelPrice: Number(input.parcelPrice ?? price),
    deliveryPrice: Number(input.deliveryPrice ?? price),
    packingCharge: Number(input.packingCharge ?? 0),
    gst: Number(input.gst ?? input.GST ?? 5),
    prepTime: parseMinutes(input.prepTime),
    cookTime: parseMinutes(input.cookTime),
    totalTime: parseMinutes(input.totalTime),
    rating: Number(input.rating ?? 0),
    reviewCount: Number(input.reviewCount ?? 0),
    channelDefaults: input.channelDefaults || { dineIn: true, parcel: true, delivery: true },
    availability: input.availability || { active, soldOut: !active },
    version: Number(input.version ?? 1),
    scope: input.scope || "master",
    active,
    archived: input.archived === true,
  };
}

export function templateToOwnerMenuDraft(template: MasterTemplateInput) {
  const images = uniqueStrings([...(Array.isArray(template.images) ? template.images : []), template.primaryImage, template.thumbnail]);
  const price = Number(template.recommendedPrice ?? 0);
  const templateId = String(template.id ?? template.templateName ?? "");
  const templateVersion = Number(template.version ?? 1);
  return {
    name: template.displayName,
    category: template.categoryId,
    categoryId: template.categoryId,
    cuisineIds: template.cuisineIds ?? [],
    foodType: normalizeFoodType(template.foodType),
    description: template.shortDescription || template.description,
    longDescription: template.description,
    ingredients: template.ingredients ?? [],
    allergens: template.allergens ?? [],
    tags: template.tags ?? [],
    badges: template.badges ?? [],
    searchKeywords: template.searchKeywords ?? [],
    prepTime: String(template.prepTime ?? "20 min"),
    cookTime: template.cookTime,
    price,
    dineInPrice: Number(template.dineInPrice ?? price),
    parcelPrice: Number(template.parcelPrice ?? price),
    deliveryPrice: Number(template.deliveryPrice ?? price),
    packingCharge: template.packingCharge,
    gstRate: template.gst,
    image: template.primaryImage || images[0] || "",
    imagePath: template.primaryImage || images[0] || "",
    imagePaths: images,
    modifiers: template.modifiers ?? [],
    modifierGroups: template.modifierGroups ?? [],
    addOns: template.addonGroups ?? [],
    templateId,
    templateVersion,
    masterTemplateId: templateId,
    masterTemplateVersion: templateVersion,
    importedFromTemplateAt: new Date().toISOString(),
  };
}

export function parseTemplatePayload(payload: unknown, format: TemplateImportFormat): MasterTemplateInput[] {
  if (format === "csv") return parseTemplatesFromCsv(String(payload ?? ""));
  const value = typeof payload === "string" ? JSON.parse(payload) : payload;
  if (Array.isArray(value)) return value as MasterTemplateInput[];
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const rows = record.templates || record.items || record.data || record.menuTemplates || record.keralaFoods;
    if (Array.isArray(rows)) return rows as MasterTemplateInput[];
  }
  return [];
}

export function templatesToCsv(rows: MasterTemplateInput[]) {
  const headers = templateExportHeaders;
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((key) => csvCell(csvValue(row, key))).join(",")),
  ].join("\n");
}

export function templatesToExcelRows(rows: MasterTemplateInput[]) {
  return rows.map((row) => Object.fromEntries(templateExportHeaders.map((key) => [key, csvValue(row, key)])));
}

export function parseTemplatesFromCsv(csv: string): MasterTemplateInput[] {
  const rows = csv.split(/\r?\n/).map((line) => splitCsvLine(line)).filter((line) => line.some(Boolean));
  const [headers, ...body] = rows;
  if (!headers?.length) return [];
  return body.map((row) => Object.fromEntries(headers.map((header, index) => [header.trim(), parseCsvValue(header, row[index] ?? "")])));
}

export function validateMasterTemplate(input: MasterTemplateInput) {
  const errors: string[] = [];
  if (!String(input.displayName || input.templateName || input.name || "").trim()) errors.push("Name is required.");
  if (!String(input.categoryId || input.category || "").trim()) errors.push("Category is required.");
  if (!uniqueStrings(input.cuisineIds || input.cuisines || []).length) errors.push("Cuisine is required.");
  if (!["veg", "nonveg", "egg", "vegan", "jain"].includes(normalizeFoodType(input.foodType))) errors.push("Food type is invalid.");
  if (Number(input.recommendedPrice ?? input.price ?? 0) < 0) errors.push("Suggested price cannot be negative.");
  for (const url of uniqueStrings([...(Array.isArray(input.images) ? input.images : []), input.primaryImage, input.thumbnail])) {
    if (url && !isSafeImageUrl(url)) errors.push(`Image URL is invalid: ${url}`);
  }
  return errors;
}

function csvValue(row: MasterTemplateInput, key: string) {
  const value = row[key];
  if (Array.isArray(value)) return value.every((item) => typeof item !== "object" || item === null) ? value.join("|") : JSON.stringify(value);
  if (value && typeof value === "object") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return value ?? "";
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

function parseCsvValue(key: string, value: string) {
  const text = value.trim();
  if (["cuisineIds", "tags", "badges", "images", "allergens", "searchKeywords", "ingredients"].includes(key)) return uniqueStrings(text.split("|"));
  if (["nutrition", "modifiers", "addonGroups", "availability", "channelDefaults"].includes(key)) return parseJsonCell(text);
  if (["recommendedPrice", "basePrice", "dineInPrice", "parcelPrice", "deliveryPrice", "prepTime", "cookTime", "totalTime", "packingCharge", "gst", "version", "displayOrder", "rating", "reviewCount"].includes(key)) return Number(text || 0);
  if (["active", "archived"].includes(key)) return text.toLowerCase() === "true";
  return text;
}

function parseJsonCell(text: string) {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function normalizeFoodType(value: unknown) {
  const text = String(value || "veg").toLowerCase().replace(/[\s_-]+/g, "");
  if (text === "nonveg" || text === "nonvegetarian" || text === "non") return "nonveg";
  if (text === "vegetarian") return "veg";
  return text;
}

function normalizeModifierGroups(value: unknown) {
  if (Array.isArray(value)) return value as Array<Record<string, unknown>>;
  if (!value || typeof value !== "object") return [];
  return Object.entries(value as Record<string, unknown>).map(([name, options]) => ({
    name,
    options: Array.isArray(options) ? options : [],
  }));
}

function normalizeAddons(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [{
    name: "Add-ons",
    options: value.map((item) => typeof item === "object" && item ? item : { name: String(item), price: 0 }),
  }];
}

function parseMinutes(value: unknown) {
  if (typeof value === "number") return value;
  const match = String(value ?? "").match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function uniqueStrings(value: unknown) {
  const list = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  return Array.from(new Set(list.map((item) => String(item ?? "").trim()).filter(Boolean)));
}

function isSafeImageUrl(value: string) {
  return !value || /^https?:\/\//i.test(value) || value.startsWith("/");
}

function slug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `template-${Date.now()}`;
}

const templateExportHeaders = [
  "id",
  "displayName",
  "templateName",
  "categoryId",
  "subcategoryId",
  "cuisineIds",
  "foodType",
  "recommendedPrice",
  "basePrice",
  "dineInPrice",
  "parcelPrice",
  "deliveryPrice",
  "packingCharge",
  "prepTime",
  "cookTime",
  "totalTime",
  "tags",
  "badges",
  "searchKeywords",
  "ingredients",
  "allergens",
  "description",
  "shortDescription",
  "primaryImage",
  "thumbnail",
  "images",
  "nutrition",
  "modifiers",
  "addonGroups",
  "availability",
  "rating",
  "reviewCount",
  "active",
  "archived",
  "version",
];
