import { JSX } from "react";
import { twMerge } from "tailwind-merge";

interface IconProps {
  className?: string;
  title?: string;
}

export function CoreNatsIcon({
  className,
  title = "Core NATS Message",
}: IconProps): JSX.Element {
  return (
    <svg
      className={twMerge("w-5 h-5", className)}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      {title && <title>{title}</title>}
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
      />
    </svg>
  );
}
