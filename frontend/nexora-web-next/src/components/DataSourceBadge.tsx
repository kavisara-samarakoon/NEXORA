import {
  getFrontendDataSourceDetails,
  type FrontendDataSource,
} from "@/lib/data-source";

type DataSourceBadgeProps = {
  source: FrontendDataSource;
};

export default function DataSourceBadge({ source }: DataSourceBadgeProps) {
  const { detail, label } = getFrontendDataSourceDetails(source);

  return (
    <span
      className={`data-source-badge data-source-badge--${source}`}
      aria-label={`${label}. ${detail}`}
      title={detail}
    >
      {label}
    </span>
  );
}
