import type { CleaningReport } from "@/lib/clean";

export default function CleaningNotes({ report }: { report: CleaningReport }) {
  const lines = [
    `${report.rowsRead} rows read${report.rowsSkipped ? `, ${report.rowsSkipped} skipped (no amount)` : ""}.`,
    `${report.datesReformatted} dates in other formats were converted${report.datesUnreadable ? `; ${report.datesUnreadable} could not be read and only count when no date filter is set` : ""}.`,
    `${report.categoryNamesBefore} category spellings were merged into ${report.categoryNamesAfter} categories.`,
    `${report.itemNamesTrimmed} ${report.itemNamesTrimmed === 1 ? "item name" : "item names"} had extra spaces removed.`,
    `${report.discountsReadAsPercent} discounts written as percentages or words were understood.`,
    `${report.unknownCustomers} orders have an unknown customer or no email (still counted).`,
    ...(report.totalsRecomputed ? [`${report.totalsRecomputed} blank totals were worked out from qty, price and discount.`] : []),
  ];
  return (
    <details className="card notes">
      <summary>What was cleaned</summary>
      <ul>
        {lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </details>
  );
}
