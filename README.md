# Sales Data Dashboard

A small website that turns a messy sales CSV into clean numbers and charts.
Built with Next.js, React, Chart.js and PapaParse. BuiltSmall Build 102 practice project.

**How it works:** you pick a CSV file in the browser. All reading, cleaning and math happen
in your browser tab. There is no database, no login and no server code. Nothing is stored or sent anywhere.
The site starts empty and shows data only after you choose a file.

## Run it on your computer

```bash
npm install
npm run dev        # open http://localhost:3000
```

Then click **Choose your CSV file** and pick `sample-data/retail_store_data.csv`.

Other commands: `npm run build` (production build, must pass before deploying), `npm run lint`.

## Deploy

Push to GitHub, then import the repo in Vercel and leave the defaults (Next.js is detected).

## Where things are

- `lib/clean.ts` - cleaning rules (dates, categories, discounts, names). Edit category merges here.
- `lib/analyze.ts` - filters, totals, chart data.
- `components/` - the page pieces. `app/` - the page and styles.
- `CLAUDE.md` - the instructions Claude Code follows for this project.
- `sample-data/` - practice CSV. `EXPECTED_NUMBERS.md` and `verify.py` - the correct answers to check against.
  Run `python3 verify.py` to recompute them.

Practice data only. The live link is public, so never upload real customer or financial data.
