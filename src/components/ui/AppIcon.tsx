import type { SVGProps } from "react";

export type IconName =
  | "arrow-left"
  | "arrow-right"
  | "calendar"
  | "check"
  | "chevron-down"
  | "chevron-right"
  | "clipboard"
  | "close"
  | "download"
  | "eye"
  | "file"
  | "lock"
  | "menu"
  | "pencil"
  | "plus"
  | "search"
  | "share"
  | "shield"
  | "spinner"
  | "trophy"
  | "user"
  | "users";

export function AppIcon({
  name,
  size = 18,
  className = "",
  ...props
}: { name: IconName; size?: number; className?: string } & SVGProps<SVGSVGElement>) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
  };

  return (
    <svg
      aria-hidden="true"
      className={className}
      height={size}
      viewBox="0 0 24 24"
      width={size}
      {...common}
      {...props}
    >
      {name === "arrow-left" && <><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></>}
      {name === "arrow-right" && <><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></>}
      {name === "calendar" && <><rect height="16" rx="2" width="18" x="3" y="4" /><path d="M16 2v4M8 2v4M3 10h18" /></>}
      {name === "check" && <path d="m5 12 4 4L19 6" />}
      {name === "chevron-down" && <path d="m6 9 6 6 6-6" />}
      {name === "chevron-right" && <path d="m9 18 6-6-6-6" />}
      {name === "clipboard" && <><rect height="16" rx="2" width="14" x="5" y="5" /><path d="M9 5V3h6v2M9 12h6M9 16h4" /></>}
      {name === "close" && <><path d="m6 6 12 12M18 6 6 18" /></>}
      {name === "download" && <><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></>}
      {name === "eye" && <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" /></>}
      {name === "file" && <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></>}
      {name === "lock" && <><rect height="10" rx="2" width="14" x="5" y="10" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>}
      {name === "menu" && <><path d="M4 7h16M4 12h16M4 17h16" /></>}
      {name === "pencil" && <><path d="m4 16-.8 4.8L8 20l11-11-3.8-3.8zM13.5 6.5l4 4" /></>}
      {name === "plus" && <><path d="M12 5v14M5 12h14" /></>}
      {name === "search" && <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></>}
      {name === "share" && <><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5" /></>}
      {name === "shield" && <path d="M12 3 20 6v5c0 5.1-3.2 8.7-8 10-4.8-1.3-8-4.9-8-10V6z" />}
      {name === "spinner" && <path d="M12 3a9 9 0 1 0 9 9" />}
      {name === "trophy" && <><path d="M8 4h8v5a4 4 0 0 1-8 0zM12 13v5M8 21h8M5 5H3v2a4 4 0 0 0 4 4M19 5h2v2a4 4 0 0 1-4 4" /></>}
      {name === "user" && <><circle cx="12" cy="8" r="3.5" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></>}
      {name === "users" && <><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0M16 5.5a3 3 0 0 1 0 5.8M18 14a5 5 0 0 1 3 4.5" /></>}
    </svg>
  );
}
