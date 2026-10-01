import { money } from "@/lib/analyze";

export default function TopItems({ rows }: { rows: { item: string; units: number; cents: number }[] }) {
  if (rows.length === 0) return <p className="muted">No items match these filters.</p>;
  return (
    <div className="table-wrap">
      <table>
        <caption className="sr-only">Top 10 items by revenue</caption>
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Item</th>
            <th scope="col" className="num">Units</th>
            <th scope="col" className="num">Revenue</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.item}>
              <td>{i + 1}</td>
              <td>{r.item}</td>
              <td className="num">{r.units}</td>
              <td className="num">{money(r.cents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
