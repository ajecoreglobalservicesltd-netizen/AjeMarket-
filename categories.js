// AjeMarket — Shared Category System
// Keep all marketplace categories in one place.

export const CATEGORIES = [
  {
    name: "Electronics & Phones",
    subcategories: [
      "Phones & Tablets",
      "Laptops & Computers",
      "TVs & Audio",
      "Cameras",
      "Gaming",
      "Accessories"
    ]
  },
  {
    name: "Fashion",
    subcategories: [
      "Men",
      "Women",
      "Kids",
      "Shoes",
      "Bags",
      "Watches & Jewelry"
    ]
  },
  {
    name: "Home & Furniture",
    subcategories: [
      "Furniture",
      "Appliances",
      "Kitchen",
      "Home Decor",
      "Household Items"
    ]
  },
  {
    name: "Cars & Vehicles",
    subcategories: [
      "Cars",
      "SUVs",
      "Motorcycles",
      "Trucks & Buses",
      "Spare Parts",
      "Accessories"
    ]
  },
  {
    name: "Real Estate",
    subcategories: [
      "Land",
      "Houses",
      "Apartments",
      "Short Lets",
      "Commercial Property",
      "Warehouses"
    ]
  },
  {
    name: "Services",
    subcategories: [
      "Repairs",
      "Cleaning",
      "Beauty & Salon",
      "Photography",
      "IT & Digital",
      "Professional Services"
    ]
  },
  {
    name: "Jobs & Business",
    subcategories: [
      "Jobs",
      "Business Opportunities",
      "Business Equipment",
      "Office Equipment"
    ]
  },
  {
    name: "Agriculture",
    subcategories: [
      "Farm Produce",
      "Livestock",
      "Poultry",
      "Fish",
      "Seeds & Plants",
      "Farming Equipment"
    ]
  },
  {
    name: "Baby, Kids & Toys",
    subcategories: [
      "Toys",
      "Baby Clothing",
      "Baby Equipment",
      "Kids' Items"
    ]
  },
  {
    name: "Beauty & Personal Care",
    subcategories: [
      "Skincare",
      "Hair",
      "Cosmetics",
      "Personal Care"
    ]
  },
  {
    name: "Sports, Hobbies & Entertainment",
    subcategories: [
      "Sports Equipment",
      "Musical Instruments",
      "Books",
      "Games",
      "Collectibles"
    ]
  },
  {
    name: "Tools, Equipment & Machinery",
    subcategories: [
      "Tools",
      "Construction Equipment",
      "Industrial Machinery",
      "Generators",
      "Other Equipment"
    ]
  },
  {
    name: "Other / General",
    subcategories: [
      "Other"
    ]
  }
];

export const CATEGORY_NAMES = CATEGORIES.map(category => category.name);

export function findCategory(name) {
  return CATEGORIES.find(category => category.name === name);
}

export function categoryOptions(includeAll = false) {
  const names = includeAll ? ["All", ...CATEGORY_NAMES] : CATEGORY_NAMES;

  return names.map(name => ({
    value: name,
    label: name === "All" ? "All categories" : name
  }));
}
