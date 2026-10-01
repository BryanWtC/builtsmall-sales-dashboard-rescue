import { money } from "@/lib/analyze";

type Props = {
  revenueCents: number;
  netCents: number;
  orderCount: number;
  avgOrderCents: number;
  refundCents: number;
  refundedOrders: number;
};

export default function KpiCards(p: Props) {
  const cards = [
    { label: "Total revenue", value: money(p.revenueCents), note: `After discounts. Net of refunds: ${money(p.netCents)}` },
    { label: "Orders", value: p.orderCount.toLocaleString("en-US"), note: "Number of orders" },
    { label: "Average order value", value: money(p.avgOrderCents), note: "Revenue divided by orders" },
    { label: "Total refunds", value: money(p.refundCents), note: `${p.refundedOrders} refunded ${p.refundedOrders === 1 ? "order" : "orders"}` },
  ];
  return (
    <section className="kpis" aria-label="Key numbers">
      {cards.map((c) => (
        <div className="card kpi" key={c.label}>
          <div className="kpi-label">{c.label}</div>
          <div className="kpi-value">{c.value}</div>
          <div className="kpi-note">{c.note}</div>
        </div>
      ))}
    </section>
  );
}
