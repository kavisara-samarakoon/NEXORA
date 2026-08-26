import { useId, type ReactNode } from "react";

export type UxStateTone =
  | "loading"
  | "empty"
  | "error"
  | "fallback"
  | "unavailable"
  | "auth"
  | "success";

const stateIcons: Record<UxStateTone, string> = {
  loading: "◇",
  empty: "○",
  error: "!",
  fallback: "↺",
  unavailable: "×",
  auth: "🔐",
  success: "✓",
};

export function UxSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <span className="ux-skeleton" aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <span className="ux-skeleton__line" key={index} />
      ))}
    </span>
  );
}

export default function UxStatePanel({
  children,
  className = "",
  description,
  icon,
  role,
  title,
  tone,
}: {
  children?: ReactNode;
  className?: string;
  description: ReactNode;
  icon?: string;
  role?: "alert" | "status";
  title: string;
  tone: UxStateTone;
}) {
  const stateId = useId();
  const titleId = `${stateId}-title`;
  const descriptionId = `${stateId}-description`;

  return (
    <div
      className={`ux-state ux-state--${tone}${className ? ` ${className}` : ""}`}
      role={role}
      aria-atomic={role ? true : undefined}
      aria-busy={tone === "loading" ? true : undefined}
      aria-describedby={role ? descriptionId : undefined}
      aria-labelledby={role ? titleId : undefined}
    >
      <span className="ux-state__icon" aria-hidden="true">{icon ?? stateIcons[tone]}</span>
      <div className="ux-state__body">
        <strong className="ux-state__title" id={titleId}>{title}</strong>
        <div className="ux-state__description" id={descriptionId}>{description}</div>
        {children ? <div className="ux-state__actions">{children}</div> : null}
      </div>
    </div>
  );
}
