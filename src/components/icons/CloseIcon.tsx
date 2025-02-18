import { JSX } from "react";
import { twMerge } from "tailwind-merge";

interface IconProps {
  className?: string;
  title?: string;
}

export function CloseIcon({
  className,
  title = "Close",
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
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}
