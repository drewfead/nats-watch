import { JSX } from "react";

interface IconProps {
  className?: string;
  title?: string;
}

export function EphemeralIcon({
  className = "w-5 h-5",
  title = "Ephemeral Consumer",
}: IconProps): JSX.Element {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      {title && <title>{title}</title>}
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
