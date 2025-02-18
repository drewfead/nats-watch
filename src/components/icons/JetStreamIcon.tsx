import { JSX } from "react";

interface IconProps {
  className?: string;
  title?: string;
}

export function JetStreamIcon({
  className = "w-5 h-5",
  title = "JetStream Message",
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
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    </svg>
  );
}
