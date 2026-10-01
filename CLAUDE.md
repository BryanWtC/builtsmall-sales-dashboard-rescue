# Sales Data Dashboard

## What we are building
A simple website for a small home-goods and gift shop. The owner picks a sales CSV file
with a file picker and instantly sees their numbers. Before a file is chosen, the page
shows a friendly empty state that points to the file picker.

## Tech stack
- Next.js (App Router) with React and TypeScript
- Chart.js with react-chartjs-2 for charts
- PapaParse to read the CSV
- Plain CSS in app/globals.css. No other UI libraries.
- Use the latest stable versions (install with @latest). Older Next.js versions have
  known security warnings. Lint uses eslint (`next lint` was removed in Next.js 16).

## Data and cleaning rules
Columns: order_id, Date, customer_name, Customer Email, item_name, category, qty,
unit_price, Total, discount_applied, refund_amount, refund_date, refund_reason,
payment_method, store_location, sales_rep, notes. Put all cleaning in lib/clean.ts.
- Revenue is the Total column. It already has the discount applied. Refunds are NOT
  subtracted from revenue; show total refunds as their own number.
- Dates come in mixed styles (Jan 1 2024, December 18 2024, 2024-09-14, 07/16/2024,
  05-05-2024, 10/18/24). Read slash and dash dates as month first. Unreadable dates are
  left out of the month chart and any date filter, but still count when no date is set.
- Merge categories: home decor, Home Decor, decor = Home Decor. kitchen, kitchenware =
  Kitchenware. linens, table linens = Table Linens. holiday, seasonal = Seasonal.
  office, stationery = Stationery. bath = Bath.
- Trim extra spaces in item names ("  Desk Calendar  "). Fix store name case.
- "Unknown Customer" or a blank email is fine. Keep those orders.
- Discounts can be "10%", "0.10", "0", blank, or "loyalty" (10%). Only use the discount
  if Total is blank (qty x unit_price x (1 - discount)).
- Do the money math in whole cents so totals add up exactly.

## Features
- File picker. Parse and clean in the browser. Show a clear message if columns are missing.
- Four number cards: total revenue, number of orders, average order value, total refunds.
- Bar chart: sales by category. Line chart: sales by month.
- Table: top 10 items by revenue (ties broken by name).
- Filters: store location and date range. They change every number, chart, and table.
- Look: clean and simple. Navy #111f75 and yellow #e5e138 on a light grey page. Works on phones.

## Rules
- The user uploads the CSV in the browser. All parsing and math happen in the browser.
- No database, no login, no API routes. Nothing is stored or sent anywhere.
- Do not put the CSV in the public folder. The live site must start empty.
- It must pass `npm run build` (and `npm run lint`) and be ready to deploy on Vercel.
- Keep cleaning code in lib/, separate from components in components/.
- This folder already holds CLAUDE.md and the sample CSV. Never delete or overwrite them.
  If create-next-app refuses because the folder is not empty, write the files by hand.
- Explain changes in plain language. Ask before adding new libraries.

## Commands
- `npm install` then `npm run dev` and open http://localhost:3000
- `npm run build` must finish with no errors before every commit
- `npm run lint` to check the code
