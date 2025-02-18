import { JSX } from "react";

interface IconProps {
  className?: string;
  title?: string;
}

export function BackIcon({
  className = "w-5 h-5",
  title = "Go back",
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
        d="M10 19l-7-7m0 0l7-7m-7 7h18"
      />
    </svg>
  );
}
