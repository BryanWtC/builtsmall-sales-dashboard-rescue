"use client";

import Papa from "papaparse";
import { useMemo, useState } from "react";
import { ALL_STORES, applyFilters, byCategory, byMonth, dateBounds, kpis, storeOptions, topItems, type Filters as FilterState } from "@/lib/analyze";
import { cleanRows, type CleaningReport, type Order } from "@/lib/clean";
import { CategoryChart, MonthChart } from "./Charts";
import CleaningNotes from "./CleaningNotes";
import Filters from "./Filters";
import KpiCards from "./KpiCards";
import TopItems from "./TopItems";

type Loaded = { fileName: string; orders: Order[]; report: CleaningReport };

const NO_FILTERS: FilterState = { store: ALL_STORES, from: "", to: "" };

export default function Dashboard() {
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(NO_FILTERS);

  function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    // Everything below runs in this browser tab. The file is never uploaded anywhere.
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const res = cleanRows(result.data, result.meta.fields ?? []);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        setData({ fileName: file.name, orders: res.orders, report: res.report });
        setFilters(NO_FILTERS);
      },
      error: () => setError("Sorry, that file could not be read. Please choose a .csv file."),
    });
  }

  const orders = data?.orders;
  const stores = useMemo(() => (orders ? storeOptions(orders) : []), [orders]);
  const bounds = useMemo(() => (orders ? dateBounds(orders) : { min: "", max: "" }), [orders]);
  const filtered = useMemo(() => (orders ? applyFilters(orders, filters) : []), [orders, filters]);
  const totals = useMemo(() => kpis(filtered), [filtered]);
  const categories = useMemo(() => byCategory(filtered), [filtered]);
  const months = useMemo(() => byMonth(filtered), [filtered]);
  const top = useMemo(() => topItems(filtered, 10), [filtered]);

  return (
    <>
      <header className="site-header">
        <div className="wrap header-row">
          <div>
            <h1>Sales Data Dashboard</h1>
            <p>Built with BuiltSmall. Your file stays in your browser.</p>
          </div>
          <label className="btn btn-primary">
            {data ? "Choose a different CSV" : "Choose your CSV file"}
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => {
                handleFile(e.target.files?.[0]);
                e.target.value = ""; // lets you pick the same file again
              }}
            />
          </label>
        </div>
        <div className="awning" aria-hidden="true" />
      </header>

      <main className="wrap">
        {error && (
          <p className="card error" role="alert">
            {error}
          </p>
        )}

        {!data && (
          <section className="card empty">
            <h2>No data yet</h2>
            <p>
              Click <strong>Choose your CSV file</strong> at the top right and pick your sales file (for example{" "}
              <code>retail_store_data.csv</code>). Your charts and numbers will appear here.
            </p>
            <p className="muted">Nothing is uploaded or saved. Everything is worked out inside this browser tab.</p>
          </section>
        )}

        {data && (
          <>
            <p className="muted file-line">
              Showing <strong>{data.fileName}</strong>: {filtered.length} of {data.orders.length} orders match your filters.
            </p>
            <Filters filters={filters} stores={stores} minDate={bounds.min} maxDate={bounds.max} onChange={setFilters} />
            <KpiCards {...totals} />
            <div className="grid-2">
              <section className="card">
                <h2>Sales by category</h2>
                <p className="muted">Revenue after discounts, before refunds</p>
                {categories.length ? <CategoryChart data={categories} /> : <p className="muted">No sales match these filters.</p>}
              </section>
              <section className="card">
                <h2>Sales by month</h2>
                <p className="muted">Orders with an unreadable date are left out of this chart</p>
                {months.length ? <MonthChart data={months} /> : <p className="muted">No sales match these filters.</p>}
              </section>
            </div>
            <section className="card">
              <h2>Top 10 items</h2>
              <TopItems rows={top} />
            </section>
            <CleaningNotes report={data.report} />
          </>
        )}
      </main>
      <footer className="wrap site-footer">Practice dashboard. Nothing is stored or sent anywhere.</footer>
    </>
  );
}
