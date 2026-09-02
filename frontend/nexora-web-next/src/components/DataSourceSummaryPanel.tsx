import DataSourceBadge from "@/components/DataSourceBadge";
import {
  getFrontendDataSourceDetails,
  type FrontendDataSource,
} from "@/lib/data-source";

export type DataSourceSummaryItem = {
  id: string;
  label: string;
  endpoint?: string;
  source: FrontendDataSource;
  note?: string;
};

type DataSourceSummaryPanelProps = {
  items: readonly DataSourceSummaryItem[];
};

export default function DataSourceSummaryPanel({
  items,
}: DataSourceSummaryPanelProps) {
  return (
    <section
      className="data-source-summary"
      aria-labelledby="data-source-summary-title"
    >
      <header className="data-source-summary__header">
        <div>
          <h2 id="data-source-summary-title">Data source transparency</h2>
          <p>
            Shows whether dashboard data came from the local backend API or
            safe static fallback data.
          </p>
        </div>
      </header>

      <ul className="data-source-summary__grid">
        {items.map((item) => {
          const { detail } = getFrontendDataSourceDetails(item.source);

          return (
            <li className="data-source-summary__item" key={item.id}>
              <div className="data-source-summary__item-header">
                <h3>{item.label}</h3>
                <DataSourceBadge source={item.source} />
              </div>
              {item.endpoint ? (
                <code className="data-source-summary__endpoint">
                  {item.endpoint}
                </code>
              ) : null}
              <p className="data-source-note">
                {detail}
                {item.note ? ` — ${item.note}` : ""}
              </p>
            </li>
          );
        })}
      </ul>

      <p className="data-source-summary__boundary">
        Local reviewer visibility only — not production monitoring.
      </p>
    </section>
  );
}
