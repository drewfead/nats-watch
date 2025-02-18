import { JSX } from "react";
import { twMerge } from "tailwind-merge";

interface IconProps {
  direction?: "asc" | "desc" | false;
  className?: string;
}

export function SortIcon({
  direction = false,
  className,
}: IconProps): JSX.Element {
  if (!direction) {
    return (
      <span
        className={twMerge(
          "w-4 h-4 opacity-0 group-hover:opacity-50",
          className
        )}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
      </span>
    );
  }

  return (
    <span className={twMerge("w-4 h-4", className)}>
      {direction === "asc" ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7l4-4m0 0l4 4m-4-4v18"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 17l-4 4m0 0l-4-4m4 4V3"
          />
        </svg>
      )}
    </span>
  );
}
