export type FrontendDataSource =
  | "api"
  | "fallback"
  | "external-api"
  | "unavailable";

export type FrontendDataSourceDetails = {
  label: string;
  detail: string;
};

const frontendDataSourceDetails = {
  api: {
    label: "Backend API",
    detail: "Loaded from local Spring Boot API",
  },
  fallback: {
    label: "Static fallback",
    detail: "Using bundled preview data",
  },
  "external-api": {
    label: "Backend external provider",
    detail: "Loaded through backend provider route",
  },
  unavailable: {
    label: "Unavailable",
    detail: "Backend data could not be reached",
  },
} satisfies Record<FrontendDataSource, FrontendDataSourceDetails>;

export function getFrontendDataSourceDetails(
  source: FrontendDataSource,
): FrontendDataSourceDetails {
  return frontendDataSourceDetails[source];
}
