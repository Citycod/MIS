export const SAMTL_PRODUCTS = [
  { code: "PROD-SESA-WITHOUT-TAX", name: "SESA without TAX" },
  { code: "PROD-SESA-WITH-TAX", name: "SESA with TAX" },
  { code: "PROD-SHYTA", name: "SHYTA", sourceName: "Shyta" },
  { code: "PROD-SKET", name: "SKET" },
  { code: "PROD-SKIT", name: "SKIT" },
  { code: "PROD-SIRA", name: "SIRA", sourceName: "Sira" },
  { code: "PROD-SAMTL-REIT", name: "SAMTL REIT" },
] as const;

export const MIS_PRODUCTS = [{ code: "PROD-ALL", name: "All Products" }, ...SAMTL_PRODUCTS];
export const SAMTL_PRODUCT_CODES = new Set<string>(SAMTL_PRODUCTS.map(product => product.code));
