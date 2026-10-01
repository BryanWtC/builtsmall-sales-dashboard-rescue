// Cleaning module: turns messy CSV rows into tidy orders.
// Pure functions only (no React, no browser APIs) so it is easy to test and change.
// All money is stored in whole cents to avoid floating-point surprises.

export type Order = {
  orderId: string;
  date: string | null; // "YYYY-MM-DD", or null when the date could not be read
  item: string;
  category: string;
  store: string;
  qty: number;
  revenueCents: number; // the Total column: AFTER discounts, BEFORE refunds
  refundCents: number;
  customer: string | null; // null = Unknown Customer / blank
  email: string | null; // null = blank
};

export type CleaningReport = {
  rowsRead: number;
  rowsSkipped: number;
  datesReformatted: number;
  datesUnreadable: number;
  categoryNamesBefore: number;
  categoryNamesAfter: number;
  itemNamesTrimmed: number;
  unknownCustomers: number;
  discountsReadAsPercent: number;
  totalsRecomputed: number;
};

export type CleanResult =
  | { ok: true; orders: Order[]; report: CleaningReport }
  | { ok: false; error: string };

type RawRow = Record<string, string | undefined>;

// ---- Category merging (edit this list to teach the dashboard new spellings) ----
const CATEGORY_ALIASES: Record<string, string> = {
  "home decor": "Home Decor",
  decor: "Home Decor",
  kitchenware: "Kitchenware",
  kitchen: "Kitchenware",
  "table linens": "Table Linens",
  linens: "Table Linens",
  seasonal: "Seasonal",
  holiday: "Seasonal",
  stationery: "Stationery",
  office: "Stationery",
  bath: "Bath",
};

const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

const collapse = (s: string | undefined) => (s ?? "").replace(/\s+/g, " ").trim();

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

export function cleanCategory(raw: string | undefined): string {
  const key = collapse(raw).toLowerCase();
  if (!key) return "Uncategorized";
  return CATEGORY_ALIASES[key] ?? titleCase(key);
}

export function cleanStore(raw: string | undefined): string {
  const s = collapse(raw);
  return s ? titleCase(s) : "Unknown";
}

export function cleanItem(raw: string | undefined): string {
  return collapse(raw) || "Unnamed item";
}

/** "$1,234.50" -> 123450 cents. Returns null for blank or unreadable values. */
export function parseCents(raw: string | undefined): number | null {
  const s = collapse(raw).replace(/[$,\s]/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

/** "10%", "0.10", "10", "loyalty", "0", blank -> fraction (0.1). Returns null if unknown text. */
export function parseDiscount(raw: string | undefined): number | null {
  const s = collapse(raw).toLowerCase();
  if (!s || s === "0") return 0;
  if (s === "loyalty") return 0.1; // loyalty discount = 10% (matches every loyalty row's Total)
  if (s.endsWith("%")) {
    const n = Number(s.slice(0, -1));
    return Number.isFinite(n) ? n / 100 : null;
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return n > 1 ? n / 100 : n;
}

function iso(y: number, m: number, d: number): string | null {
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Reads the date styles found in the sample file:
 *   2024-09-14 | Jan 1 2024 | December 18 2024 | 07/16/2024 | 05-05-2024 | 10/18/24
 * Numeric dates with slashes or dashes are read as US order, month first (MM/DD/YYYY).
 * Returns "YYYY-MM-DD" or null.
 */
export function parseDate(raw: string | undefined): string | null {
  const s = collapse(raw);
  if (!s) return null;
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = /^([A-Za-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})$/.exec(s);
  if (m) {
    const name = m[1].toLowerCase();
    const idx = MONTH_NAMES.findIndex((full) => full === name || full.slice(0, 3) === name.slice(0, 3));
    return idx === -1 ? null : iso(+m[3], idx + 1, +m[2]);
  }
  m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/.exec(s);
  if (m) {
    const year = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    return iso(year, +m[1], +m[2]);
  }
  return null;
}

// Column names vary ("Customer Email", "customer_email"), so match on letters and digits only.
const normKey = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, "");

function indexRow(row: Record<string, unknown>): RawRow {
  const out: RawRow = {};
  for (const [k, v] of Object.entries(row)) out[normKey(k)] = typeof v === "string" ? v : v == null ? "" : String(v);
  return out;
}

const REQUIRED: { key: string; label: string }[] = [
  { key: "date", label: "Date" },
  { key: "itemname", label: "item_name" },
  { key: "category", label: "category" },
  { key: "storelocation", label: "store_location" },
];

export function cleanRows(rows: Record<string, unknown>[], fields: string[]): CleanResult {
  const have = new Set(fields.map(normKey));
  const missing = REQUIRED.filter((r) => !have.has(r.key)).map((r) => r.label);
  if (!have.has("total") && !(have.has("unitprice") && have.has("qty"))) missing.push("Total");
  if (missing.length) {
    return {
      ok: false,
      error: `This file is missing these columns: ${missing.join(", ")}. Is it the sales CSV (retail_store_data.csv)?`,
    };
  }

  const orders: Order[] = [];
  const rawCats = new Set<string>();
  const cleanCats = new Set<string>();
  const report: CleaningReport = {
    rowsRead: rows.length,
    rowsSkipped: 0,
    datesReformatted: 0,
    datesUnreadable: 0,
    categoryNamesBefore: 0,
    categoryNamesAfter: 0,
    itemNamesTrimmed: 0,
    unknownCustomers: 0,
    discountsReadAsPercent: 0,
    totalsRecomputed: 0,
  };

  rows.forEach((original, i) => {
    const r = indexRow(original);
    const qty = Number(collapse(r.qty)) || 0;
    const unitCents = parseCents(r.unitprice);
    const discount = parseDiscount(r.discountapplied);
    if (collapse(r.discountapplied).includes("%") || collapse(r.discountapplied).toLowerCase() === "loyalty") {
      report.discountsReadAsPercent++;
    }

    // Revenue = the Total column (already after discounts). If it is blank, work it out.
    let revenueCents = parseCents(r.total);
    if (revenueCents === null) {
      if (unitCents === null) {
        report.rowsSkipped++;
        return;
      }
      revenueCents = Math.round(qty * unitCents * (1 - (discount ?? 0)));
      report.totalsRecomputed++;
    }

    const rawDate = collapse(r.date);
    const date = parseDate(rawDate);
    if (!date) report.datesUnreadable++;
    else if (date !== rawDate) report.datesReformatted++;

    const category = cleanCategory(r.category);
    rawCats.add(collapse(r.category).toLowerCase());
    cleanCats.add(category);

    const itemRaw = r.itemname ?? "";
    if (itemRaw !== collapse(itemRaw)) report.itemNamesTrimmed++;

    const name = collapse(r.customername);
    const email = collapse(r.customeremail);
    const unknownCustomer = !name || name.toLowerCase() === "unknown customer";
    if (unknownCustomer || !email) report.unknownCustomers++;

    orders.push({
      orderId: collapse(r.orderid) || `row-${i + 1}`,
      date,
      item: cleanItem(itemRaw),
      category,
      store: cleanStore(r.storelocation),
      qty,
      revenueCents,
      refundCents: parseCents(r.refundamount) ?? 0,
      customer: unknownCustomer ? null : name,
      email: email || null,
    });
  });

  report.categoryNamesBefore = rawCats.size;
  report.categoryNamesAfter = cleanCats.size;

  if (orders.length === 0) {
    return { ok: false, error: "No usable rows were found in this file." };
  }
  return { ok: true, orders, report };
}
