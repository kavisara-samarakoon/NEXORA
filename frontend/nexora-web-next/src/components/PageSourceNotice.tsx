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
  const idBase =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "page-source";
  const labelId = `${idBase}-source-label`;
  const detailId = `${idBase}-source-detail`;
  const metaId = `${idBase}-source-meta`;

  return (
    <aside
      className="page-source-notice"
      aria-labelledby={labelId}
      aria-describedby={`${detailId} ${metaId}`}
    >
      <div className="page-source-notice__copy">
        <strong id={labelId}>{label}</strong>
        <p id={detailId}>{detail}</p>
        <p className="page-source-notice__meta" id={metaId}>
          Endpoint: <code>{endpoint}</code>
        </p>
      </div>
      <DataSourceBadge source={source} />
    </aside>
  );
}
