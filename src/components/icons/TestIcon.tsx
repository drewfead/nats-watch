import { JSX } from "react";
import { twMerge } from "tailwind-merge";

interface IconProps {
  className?: string;
  title?: string;
}

export function TestIcon({
  className,
  title = "Test Connection",
}: IconProps): JSX.Element {
  return (
    <svg
      className={twMerge("w-4 h-4", className)}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      {title && <title>{title}</title>}
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
