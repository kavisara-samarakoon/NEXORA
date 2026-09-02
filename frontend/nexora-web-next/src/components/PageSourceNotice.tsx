import DataSourceBadge from "@/components/DataSourceBadge";
import {
  getFrontendDataSourceDetails,
  type FrontendDataSource,
} from "@/lib/data-source";

type PageSourceNoticeProps = {
  label: string;
  endpoint: string;
  source: FrontendDataSource;
};

export default function PageSourceNotice({
  label,
  endpoint,
  source,
}: PageSourceNoticeProps) {
  const { detail } = getFrontendDataSourceDetails(source);

  return (
    <aside
      className="page-source-notice"
      aria-label={`${label} source information`}
    >
      <div className="page-source-notice__copy">
        <strong>{label}</strong>
        <p>{detail}</p>
        <p className="page-source-notice__meta">
          Endpoint: <code>{endpoint}</code>
        </p>
      </div>
      <DataSourceBadge source={source} />
    </aside>
  );
}
