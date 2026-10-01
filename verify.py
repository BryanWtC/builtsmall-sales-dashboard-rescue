#!/usr/bin/env python3
"""Independent check of the dashboard numbers (pure Python 3, standard library only).

Usage:  python3 verify.py [path/to/retail_store_data.csv] [--markdown]

This script does NOT share any code with the web app. It re-implements the
cleaning rules from CLAUDE.md so the facilitator can compare the dashboard
against a second, independent calculation.
"""
import csv
import re
import sys
from collections import defaultdict
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

HERE = Path(__file__).resolve().parent
args = [a for a in sys.argv[1:] if not a.startswith("--")]
CSV_PATH = Path(args[0]) if args else HERE / "sample-data" / "retail_store_data.csv"
MARKDOWN = "--markdown" in sys.argv

MONTHS = ["January", "February", "March", "April", "May", "June", "July",
          "August", "September", "October", "November", "December"]

# Category merges (lowercase raw value -> clean name). Anything else is Title Cased.
CATEGORY_MAP = {
    "home decor": "Home Decor", "decor": "Home Decor",
    "kitchenware": "Kitchenware", "kitchen": "Kitchenware",
    "table linens": "Table Linens", "linens": "Table Linens",
    "seasonal": "Seasonal", "holiday": "Seasonal",
    "stationery": "Stationery", "office": "Stationery",
    "bath": "Bath",
}


def d(x):
    return Decimal(str(x))


def money(x):
    return d(x).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def parse_money(s):
    s = (s or "").strip().replace("$", "").replace(",", "")
    if not s:
        return None
    try:
        return Decimal(s)
    except Exception:
        return None


def parse_date(raw):
    """Return (date, note). note is '' normally, 'ambiguous' when day/month could swap."""
    s = (raw or "").strip()
    if not s:
        return None, "missing"
    m = re.fullmatch(r"(\d{4})-(\d{1,2})-(\d{1,2})", s)
    if m:
        return datetime(int(m[1]), int(m[2]), int(m[3])).date(), ""
    m = re.fullmatch(r"([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})", s)
    if m:
        name = m[1].lower()
        for i, full in enumerate(MONTHS):
            if full.lower() == name or full[:3].lower() == name[:3]:
                return datetime(int(m[3]), i + 1, int(m[2])).date(), ""
        return None, "unreadable"
    m = re.fullmatch(r"(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})", s)
    if m:
        a, b, y = int(m[1]), int(m[2]), int(m[3])
        if y < 100:
            y += 2000
        # Rule: US order, MM/DD/YYYY. (Every row where one part is > 12 confirms this.)
        note = "ambiguous" if (a <= 12 and b <= 12 and a != b) else ""
        try:
            return datetime(y, a, b).date(), note
        except ValueError:
            return None, "unreadable"
    return None, "unreadable"


def parse_discount(raw):
    """Fraction (0.10 = 10%). Used only to cross-check Total; Total already has it applied."""
    s = (raw or "").strip().lower()
    if not s or s == "0":
        return d(0)
    if s == "loyalty":
        return d("0.10")  # rule: 'loyalty' = 10% (confirmed by every loyalty row's Total)
    if s.endswith("%"):
        return d(s[:-1]) / 100
    v = d(s)
    return v / 100 if v > 1 else v


def clean_category(raw):
    k = " ".join((raw or "").split()).lower()
    return CATEGORY_MAP.get(k, k.title() if k else "Uncategorized")


def clean_store(raw):
    s = " ".join((raw or "").split())
    return s.title() if s else "Unknown"


def load():
    rows = []
    with open(CSV_PATH, newline="", encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            qty = int(parse_money(r["qty"]) or 0)
            unit = parse_money(r["unit_price"]) or d(0)
            disc = parse_discount(r["discount_applied"])
            expected = money(qty * unit * (1 - disc))
            total = parse_money(r["Total"])
            used_total = total if total is not None else expected
            dt, dnote = parse_date(r["Date"])
            refund = parse_money(r["refund_amount"]) or d(0)
            rows.append({
                "order_id": r["order_id"].strip(),
                "date": dt, "date_raw": r["Date"], "date_note": dnote,
                "item": " ".join(r["item_name"].split()),
                "item_raw": r["item_name"],
                "category": clean_category(r["category"]),
                "category_raw": r["category"],
                "store": clean_store(r["store_location"]),
                "qty": qty, "unit": unit, "disc": disc,
                "total": used_total, "total_raw": total, "expected": expected,
                "refund": refund,
                "customer": r["customer_name"].strip(),
                "email": r["Customer Email"].strip(),
            })
    return rows


def summarize(rows):
    revenue = sum((r["total"] for r in rows), d(0))
    refunds = sum((r["refund"] for r in rows), d(0))
    orders = len({r["order_id"] for r in rows})
    aov = revenue / orders if orders else d(0)
    by_cat, by_month, items, by_store = (defaultdict(lambda: d(0)) for _ in range(4))
    item_units = defaultdict(int)
    for r in rows:
        by_cat[r["category"]] += r["total"]
        by_store[r["store"]] += r["total"]
        items[r["item"]] += r["total"]
        item_units[r["item"]] += r["qty"]
        if r["date"]:
            by_month[r["date"].strftime("%Y-%m")] += r["total"]
    return dict(revenue=revenue, refunds=refunds, orders=orders, aov=aov,
                by_cat=by_cat, by_month=by_month, items=items,
                item_units=item_units, by_store=by_store)


def table(headers, rows_):
    out = ["| " + " | ".join(headers) + " |", "|" + "|".join("---" for _ in headers) + "|"]
    out += ["| " + " | ".join(str(c) for c in r) + " |" for r in rows_]
    return "\n".join(out)


def main():
    rows = load()
    s = summarize(rows)
    p = print

    p(f"Source file: {CSV_PATH.name}   rows read: {len(rows)}   unique order_ids: {s['orders']}")
    p("")
    p("## Headline numbers (all rows, no filters)\n")
    p(table(["Metric", "Value"], [
        ["Total revenue (sum of Total column, after discounts, BEFORE refunds)", f"${money(s['revenue']):,}"],
        ["Number of orders (rows / unique order_id)", s["orders"]],
        ["Average order value (revenue / orders)", f"${money(s['aov']):,}"],
        ["Total refunds (sum of refund_amount)", f"${money(s['refunds']):,}"],
        ["Refunded orders (rows with a refund_amount)", sum(1 for r in rows if r["refund"] > 0)],
        ["Net revenue after refunds (revenue - refunds)", f"${money(s['revenue'] - s['refunds']):,}"],
    ]))
    p("\n## Revenue by cleaned category\n")
    p(table(["Category", "Revenue", "Orders"], [
        [c, f"${money(v):,}", sum(1 for r in rows if r["category"] == c)]
        for c, v in sorted(s["by_cat"].items(), key=lambda kv: -kv[1])
    ]))
    p("\n## Top 10 items by revenue (names trimmed)\n")
    top = sorted(s["items"].items(), key=lambda kv: (-kv[1], kv[0]))[:10]
    p(table(["Rank", "Item", "Revenue", "Units"], [
        [i + 1, n, f"${money(v):,}", s["item_units"][n]] for i, (n, v) in enumerate(top)
    ]))
    p("\n## Revenue by month\n")
    p(table(["Month", "Revenue", "Orders"], [
        [datetime.strptime(k, "%Y-%m").strftime("%b %Y"), f"${money(v):,}",
         sum(1 for r in rows if r["date"] and r["date"].strftime("%Y-%m") == k)]
        for k, v in sorted(s["by_month"].items())
    ]))
    undated = [r for r in rows if r["date"] is None]
    p(f"\nRows with no usable date: {len(undated)}")
    p("\n## Revenue by store location (use to check the store filter)\n")
    p(table(["Store", "Revenue", "Orders", "Refunds"], [
        [st, f"${money(v):,}", sum(1 for r in rows if r["store"] == st),
         f"${money(sum((r['refund'] for r in rows if r['store'] == st), d(0))):,}"]
        for st, v in sorted(s["by_store"].items(), key=lambda kv: -kv[1])
    ]))

    # Date-range example for the facilitator
    lo, hi = datetime(2024, 6, 1).date(), datetime(2024, 9, 30).date()
    sub = [r for r in rows if r["date"] and lo <= r["date"] <= hi]
    ss = summarize(sub)
    p("\n## Filter check: dates 2024-06-01 to 2024-09-30, all stores\n")
    p(table(["Metric", "Value"], [
        ["Revenue", f"${money(ss['revenue']):,}"], ["Orders", ss["orders"]],
        ["Average order value", f"${money(ss['aov']):,}"], ["Refunds", f"${money(ss['refunds']):,}"],
    ]))
    sub = [r for r in rows if r["store"] == "Brooklyn"]
    ss = summarize(sub)
    p("\n## Filter check: store = Brooklyn, all dates\n")
    p(table(["Metric", "Value"], [
        ["Revenue", f"${money(ss['revenue']):,}"], ["Orders", ss["orders"]],
        ["Average order value", f"${money(ss['aov']):,}"], ["Refunds", f"${money(ss['refunds']):,}"],
    ]))

    # ---- Data-quality / ambiguity report ----
    p("\n## Data quality report\n")
    raw_cats = defaultdict(set)
    for r in rows:
        raw_cats[r["category"]].add(r["category_raw"].strip())
    p("Raw category spellings merged into each clean category:")
    for c in sorted(raw_cats):
        p(f"- {c}: {', '.join(sorted(raw_cats[c], key=str.lower))}")
    p("")
    ws = [r for r in rows if r["item_raw"] != r["item"]]
    p(f"Item names with extra whitespace trimmed: {[(r['order_id'], r['item_raw']) for r in ws]}")
    unk = [r for r in rows if r["customer"].lower() == "unknown customer" or not r["email"]]
    p(f"Orders with Unknown Customer or blank email (kept in all totals): {len(unk)}")
    dup = {k for k in {r['order_id'] for r in rows} if sum(1 for r in rows if r['order_id'] == k) > 1}
    p(f"Duplicate order_ids: {sorted(dup) or 'none'}")
    amb = [r for r in rows if r["date_note"] == "ambiguous"]
    p(f"\nAmbiguous dates (both parts <= 12, read as MM/DD): {len(amb)}")
    for r in amb:
        alt = f"{r['date'].day:02d}/{r['date'].month:02d}"
        p(f"- order {r['order_id']}: '{r['date_raw']}' read as {r['date']} (swapped reading would be day/month {alt}); "
          f"revenue {money(r['total'])}; month changes if swapped: "
          f"{r['date'].month != r['date'].day}")
    bad = [r for r in rows if r["date"] is None]
    p(f"Unparseable / blank dates: {[(r['order_id'], r['date_raw']) for r in bad] or 'none'}")
    mism = [r for r in rows if r["total_raw"] is not None and abs(r["total_raw"] - r["expected"]) > Decimal("0.011")]
    p(f"\nRows where Total differs from qty x unit_price x (1 - discount) by more than 1 cent: {len(mism)}")
    for r in mism:
        p(f"- order {r['order_id']}: Total {r['total_raw']} vs computed {r['expected']} "
          f"(qty {r['qty']}, unit {r['unit']}, discount {r['disc']})")
    p("\nRefund rows (refund_amount vs Total):")
    for r in rows:
        if r["refund"] > 0:
            tag = "full" if r["refund"] == r["total"] else "PARTIAL/DIFFERENT"
            p(f"- order {r['order_id']}: refund {r['refund']} vs Total {r['total']} ({tag})")
    raw_discounts = defaultdict(int)
    with open(CSV_PATH, newline="", encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            raw_discounts[r["discount_applied"].strip() or "(blank)"] += 1
    p("\nDiscount spellings seen: " + ", ".join(f"{k} x{v}" for k, v in sorted(raw_discounts.items())))


if __name__ == "__main__":
    main()
