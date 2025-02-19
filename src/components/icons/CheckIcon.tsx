import { JSX } from "react";
import { twMerge } from "tailwind-merge";

interface IconProps {
  className?: string;
  title?: string;
}

export function CheckIcon({
  className,
  title = "Success",
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
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}
