import { ALL_STORES, type Filters as FilterState } from "@/lib/analyze";

type Props = {
  filters: FilterState;
  stores: string[];
  minDate: string;
  maxDate: string;
  onChange: (next: FilterState) => void;
};

export default function Filters({ filters, stores, minDate, maxDate, onChange }: Props) {
  const invalidRange = filters.from !== "" && filters.to !== "" && filters.from > filters.to;
  const isFiltered = filters.store !== ALL_STORES || filters.from !== "" || filters.to !== "";
  return (
    <section className="card filters" aria-label="Filters">
      <label>
        <span>Store location</span>
        <select value={filters.store} onChange={(e) => onChange({ ...filters, store: e.target.value })}>
          <option>{ALL_STORES}</option>
          {stores.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <label>
        <span>From</span>
        <input type="date" value={filters.from} min={minDate} max={maxDate} onChange={(e) => onChange({ ...filters, from: e.target.value })} />
      </label>
      <label>
        <span>To</span>
        <input type="date" value={filters.to} min={minDate} max={maxDate} onChange={(e) => onChange({ ...filters, to: e.target.value })} />
      </label>
      <button type="button" className="btn btn-quiet" disabled={!isFiltered} onClick={() => onChange({ store: ALL_STORES, from: "", to: "" })}>
        Clear filters
      </button>
      {invalidRange && <p className="warn" role="alert">The start date is after the end date, so nothing matches.</p>}
    </section>
  );
}
