import { formatRequestIdSupportText } from "@/lib/api-client";

type RequestIdSupportTextProps = {
  requestId?: string | null;
};

export default function RequestIdSupportText({
  requestId,
}: RequestIdSupportTextProps) {
  const supportText = formatRequestIdSupportText(requestId);
  const normalizedRequestId = requestId?.trim();

  if (!supportText || !normalizedRequestId) return null;

  return (
    <small className="request-id-support" aria-label={supportText}>
      Request ID: <code aria-hidden="true">{normalizedRequestId}</code>
    </small>
  );
}
