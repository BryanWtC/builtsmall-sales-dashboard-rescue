// Math for the dashboard: filters, totals, and chart data.
// Pure functions, no React. Money is in cents.
import type { Order } from "./clean";

export type Filters = { store: string; from: string; to: string }; // from/to = "YYYY-MM-DD" or ""

export const ALL_STORES = "All stores";

export function applyFilters(orders: Order[], f: Filters): Order[] {
  const dateFiltered = f.from !== "" || f.to !== "";
  return orders.filter((o) => {
    if (f.store !== ALL_STORES && o.store !== f.store) return false;
    if (dateFiltered) {
      // Orders with an unreadable date cannot be placed in a range, so they drop out.
      if (!o.date) return false;
      if (f.from && o.date < f.from) return false;
      if (f.to && o.date > f.to) return false;
    }
    return true;
  });
}

export function storeOptions(orders: Order[]): string[] {
  return [...new Set(orders.map((o) => o.store))].sort((a, b) => a.localeCompare(b));
}

export function dateBounds(orders: Order[]): { min: string; max: string } {
  const dates = orders.map((o) => o.date).filter((d): d is string => d !== null).sort();
  return { min: dates[0] ?? "", max: dates[dates.length - 1] ?? "" };
}

export function kpis(orders: Order[]) {
  const revenueCents = orders.reduce((s, o) => s + o.revenueCents, 0);
  const refundCents = orders.reduce((s, o) => s + o.refundCents, 0);
  const orderCount = new Set(orders.map((o) => o.orderId)).size;
  return {
    revenueCents,
    refundCents,
    orderCount,
    refundedOrders: orders.filter((o) => o.refundCents > 0).length,
    avgOrderCents: orderCount ? Math.round(revenueCents / orderCount) : 0,
    netCents: revenueCents - refundCents,
  };
}

export function byCategory(orders: Order[]): { label: string; cents: number }[] {
  const map = new Map<string, number>();
  for (const o of orders) map.set(o.category, (map.get(o.category) ?? 0) + o.revenueCents);
  return [...map.entries()]
    .map(([label, cents]) => ({ label, cents }))
    .sort((a, b) => b.cents - a.cents || a.label.localeCompare(b.label));
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function byMonth(orders: Order[]): { key: string; label: string; cents: number }[] {
  const map = new Map<string, number>();
  for (const o of orders) {
    if (!o.date) continue;
    const key = o.date.slice(0, 7);
    map.set(key, (map.get(key) ?? 0) + o.revenueCents);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, cents]) => ({
      key,
      label: `${MONTH_LABELS[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`,
      cents,
    }));
}

export function topItems(orders: Order[], n = 10): { item: string; units: number; cents: number }[] {
  const map = new Map<string, { units: number; cents: number }>();
  for (const o of orders) {
    const cur = map.get(o.item) ?? { units: 0, cents: 0 };
    cur.units += o.qty;
    cur.cents += o.revenueCents;
    map.set(o.item, cur);
  }
  return [...map.entries()]
    .map(([item, v]) => ({ item, ...v }))
    .sort((a, b) => b.cents - a.cents || a.item.localeCompare(b.item))
    .slice(0, n);
}

export function money(cents: number, whole = false): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  });
}
