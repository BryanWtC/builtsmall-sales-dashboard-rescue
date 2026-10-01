# Expected numbers for `sample-data/retail_store_data.csv`

For the facilitator: compare the dashboard (no filters) to these totals. They were computed by
`verify.py` (standard-library Python, no shared code with the app), and the live app was checked
against them: every headline number, category, top-10 item, month, the Brooklyn filter and the
Jun-Sep 2024 date filter matched exactly.

Regenerate any time: `python3 verify.py` (add a path to check a different CSV).

## Rules applied (the dashboard uses the same rules)

1. **Revenue = the `Total` column.** `Total` is already after discounts (verified: it equals
   qty x unit_price x (1 - discount) on 99 of 100 rows). The discount column is NOT applied a second time.
2. **Refunds are NOT subtracted from revenue.** Total refunds (`refund_amount`) is its own card.
   Net revenue after refunds is shown as a small note under Total revenue and in this file.
   Charts and the top-10 table use revenue before refunds. Refunds are not moved to their refund date;
   they stay on the original order's date and store.
3. **Orders = number of unique `order_id`s** (100 rows, 100 unique ids, no duplicates). Refunded orders still count.
4. **Average order value = revenue / orders** (before refunds).
5. **Dates:** all formats read; slash and dash numeric dates are read **month first (US)**. Every numeric
   date with a part above 12 is month-first (e.g. 07/16/2024, 12/15/2024), and refund dates are
   month-first too, so this is consistent. No row has a blank or unreadable date, so nothing is dropped.
   If a date were unreadable it would be left out of the month chart and any date filter, but still be counted
   in totals when no date filter is set.
6. **Categories merged into 6:** Home Decor (home decor, Home Decor, HOME DECOR, decor), Kitchenware (kitchen,
   kitchenware, Kitchenware, KITCHENWARE), Table Linens (table linens, linens, any case), Seasonal (seasonal,
   Holiday), Stationery (stationery, Office), Bath (bath, any case).
7. **Item names trimmed** ("  Desk Calendar  " is order 1097 and counts as Desk Calendar). Store names get
   title case (manhattan -> Manhattan).
8. **Unknown Customer / blank email:** 28 orders. They are kept in every total.
9. **Discount spellings** (10%, 0.10, 0, blank, "loyalty") only matter when Total is blank (never, in this file).
   "loyalty" is treated as 10% because every loyalty row's Total is exactly 10% off.
10. **Top 10 ties:** sorted by revenue, then item name A-Z. Cast Iron Skillet 10" and Wooden Spoon Set tie at $211.50.

## Rows to flag (ambiguous or odd)

- **Order 1036 (Mei Park, Scented Candle, 11-19-2024):** discount says 15% but `Total` is $12.00, the full price.
  Computed with the discount it would be $10.20. We trust `Total` (the dashboard is $1.80 higher than it would be otherwise).
  It is the only row where Total and the discount disagree.
- **11 ambiguous dates** (both numbers 12 or less, so DD/MM would also be possible): orders 1012, 1023, 1032, 1042,
  1048, 1051, 1064, 1080, 1083, 1090, 1100. Each is read month first. If read the other way, each would move to a
  different month (see list at the bottom). Order 1090 (5/12/24) is supportive evidence: its refund date is 2024-06-01,
  which only makes sense if the order was May 12, not December 5.
- **Order 1028 (Desk Calendar):** a partial refund. Refund $18.00 on a $32.40 order. All other 8 refunds are full refunds.
- **Order 1008:** the date 05-05-2024 is the same either way. Orders 1095 (10/10/24) likewise.
- Two-digit years (10/18/24, 5/12/24, 10/10/24) are read as 20xx.
- 41 rows have a blank discount, 5 have "0", 7 have "0.10", 6 have "loyalty". The rest are percentages.

# Verified output of verify.py

Source file: retail_store_data.csv   rows read: 100   unique order_ids: 100

### Headline numbers (all rows, no filters)

| Metric | Value |
|---|---|
| Total revenue (sum of Total column, after discounts, BEFORE refunds) | $3,824.56 |
| Number of orders (rows / unique order_id) | 100 |
| Average order value (revenue / orders) | $38.25 |
| Total refunds (sum of refund_amount) | $321.52 |
| Refunded orders (rows with a refund_amount) | 9 |
| Net revenue after refunds (revenue - refunds) | $3,503.04 |

### Revenue by cleaned category

| Category | Revenue | Orders |
|---|---|---|
| Kitchenware | $1,298.54 | 23 |
| Home Decor | $939.92 | 24 |
| Seasonal | $508.60 | 14 |
| Table Linens | $407.08 | 13 |
| Bath | $371.32 | 10 |
| Stationery | $299.10 | 16 |

### Top 10 items by revenue (names trimmed)

| Rank | Item | Revenue | Units |
|---|---|---|---|
| 1 | Wall Mirror | $365.75 | 7 |
| 2 | Bamboo Cutting Board | $251.92 | 8 |
| 3 | Holiday Wreath | $216.00 | 5 |
| 4 | Cast Iron Skillet 10" | $211.50 | 5 |
| 5 | Wooden Spoon Set | $211.50 | 12 |
| 6 | Knife Block Set | $179.98 | 2 |
| 7 | Linen Napkins (set of 4) | $174.38 | 8 |
| 8 | Stoneware Bowl | $169.95 | 11 |
| 9 | Glass Pitcher | $165.30 | 6 |
| 10 | Ceramic Vase | $161.18 | 7 |

### Revenue by month

| Month | Revenue | Orders |
|---|---|---|
| Jan 2024 | $304.57 | 7 |
| Feb 2024 | $219.80 | 7 |
| Mar 2024 | $126.33 | 3 |
| Apr 2024 | $398.60 | 6 |
| May 2024 | $296.44 | 8 |
| Jun 2024 | $158.56 | 6 |
| Jul 2024 | $216.63 | 6 |
| Aug 2024 | $150.35 | 5 |
| Sep 2024 | $338.44 | 11 |
| Oct 2024 | $524.56 | 10 |
| Nov 2024 | $525.70 | 15 |
| Dec 2024 | $564.58 | 16 |

Rows with no usable date: 0

### Revenue by store location (use to check the store filter)

| Store | Revenue | Orders | Refunds |
|---|---|---|---|
| Manhattan | $1,466.25 | 37 | $28.00 |
| Brooklyn | $1,342.91 | 35 | $152.48 |
| Queens | $563.19 | 16 | $51.30 |
| Bronx | $452.21 | 12 | $89.74 |

### Filter check: dates 2024-06-01 to 2024-09-30, all stores

| Metric | Value |
|---|---|
| Revenue | $863.98 |
| Orders | 28 |
| Average order value | $30.86 |
| Refunds | $0.00 |

### Filter check: store = Brooklyn, all dates

| Metric | Value |
|---|---|
| Revenue | $1,342.91 |
| Orders | 35 |
| Average order value | $38.37 |
| Refunds | $152.48 |

### Data quality report

Raw category spellings merged into each clean category:
- Bath: BATH, bath, Bath
- Home Decor: decor, Home Decor, HOME DECOR, home decor
- Kitchenware: Kitchen, kitchen, kitchenware, KITCHENWARE, Kitchenware
- Seasonal: Holiday, Seasonal, seasonal
- Stationery: Office, Stationery, stationery
- Table Linens: linens, table linens, TABLE LINENS, Table Linens

Item names with extra whitespace trimmed: [('1097', '  Desk Calendar  ')]
Orders with Unknown Customer or blank email (kept in all totals): 28
Duplicate order_ids: none

Ambiguous dates (both parts <= 12, read as MM/DD): 11
- order 1012: '07/11/2024' read as 2024-07-11 (swapped reading would be day/month 11/07); revenue 16.50; month changes if swapped: True
- order 1023: '11-01-2024' read as 2024-11-01 (swapped reading would be day/month 01/11); revenue 40.50; month changes if swapped: True
- order 1032: '05/06/2024' read as 2024-05-06 (swapped reading would be day/month 06/05); revenue 45.00; month changes if swapped: True
- order 1042: '12-03-2024' read as 2024-12-03 (swapped reading would be day/month 03/12); revenue 16.20; month changes if swapped: True
- order 1048: '12/07/2024' read as 2024-12-07 (swapped reading would be day/month 07/12); revenue 55.00; month changes if swapped: True
- order 1051: '07/05/2024' read as 2024-07-05 (swapped reading would be day/month 05/07); revenue 125.96; month changes if swapped: True
- order 1064: '08/05/2024' read as 2024-08-05 (swapped reading would be day/month 05/08); revenue 44.00; month changes if swapped: True
- order 1080: '09/07/2024' read as 2024-09-07 (swapped reading would be day/month 07/09); revenue 32.00; month changes if swapped: True
- order 1083: '12/09/2024' read as 2024-12-09 (swapped reading would be day/month 09/12); revenue 8.00; month changes if swapped: True
- order 1090: '5/12/24' read as 2024-05-12 (swapped reading would be day/month 12/05); revenue 19.98; month changes if swapped: True
- order 1100: '11/09/2024' read as 2024-11-09 (swapped reading would be day/month 09/11); revenue 25.60; month changes if swapped: True
Unparseable / blank dates: none

Rows where Total differs from qty x unit_price x (1 - discount) by more than 1 cent: 1
- order 1036: Total 12.00 vs computed 10.20 (qty 1, unit 12.00, discount 0.15)

Refund rows (refund_amount vs Total):
- order 1008: refund 18.50 vs Total 18.50 (full)
- order 1028: refund 18.00 vs Total 32.40 (PARTIAL/DIFFERENT)
- order 1044: refund 51.30 vs Total 51.30 (full)
- order 1057: refund 28.00 vs Total 28.00 (full)
- order 1069: refund 96.00 vs Total 96.00 (full)
- order 1072: refund 12.74 vs Total 12.74 (full)
- order 1081: refund 45.00 vs Total 45.00 (full)
- order 1087: refund 32.00 vs Total 32.00 (full)
- order 1090: refund 19.98 vs Total 19.98 (full)

Discount spellings seen: (blank) x41, 0 x5, 0.10 x7, 10% x15, 15% x12, 20% x8, 5% x6, loyalty x6
