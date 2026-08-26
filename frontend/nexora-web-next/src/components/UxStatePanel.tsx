import type { ReactNode } from "react";

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
  return (
    <div
      className={`ux-state ux-state--${tone}${className ? ` ${className}` : ""}`}
      role={role}
      aria-busy={tone === "loading" ? true : undefined}
    >
      <span className="ux-state__icon" aria-hidden="true">{icon ?? stateIcons[tone]}</span>
      <div className="ux-state__body">
        <strong className="ux-state__title">{title}</strong>
        <div className="ux-state__description">{description}</div>
        {children ? <div className="ux-state__actions">{children}</div> : null}
      </div>
    </div>
  );
}
