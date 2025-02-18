import { JSX } from "react";

interface IconProps {
  className?: string;
  title?: string;
}

export function ChevronDownIcon({
  className = "w-5 h-5",
  title = "Expand",
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
        d="M19 9l-7 7-7-7"
      />
    </svg>
  );
}
