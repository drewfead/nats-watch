import { JSX } from "react";
import { twMerge } from "tailwind-merge";

interface IconProps {
  className?: string;
  title?: string;
}

export function DurableIcon({
  className,
  title = "Durable Consumer",
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
        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
      />
    </svg>
  );
}
