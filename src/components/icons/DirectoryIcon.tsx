import { JSX } from "react";
import { twMerge } from "tailwind-merge";

interface DirectoryIconProps {
  className?: string;
  variant?: "folder" | "folder-plus" | "folder-open";
  title?: string;
}

export function DirectoryIcon({
  className = "w-4 h-4",
  variant = "folder",
  title,
}: DirectoryIconProps): JSX.Element {
  // Common SVG properties
  const svgProps = {
    className: twMerge("w-4 h-4", className),
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (variant === "folder-plus") {
    return (
      <svg {...svgProps}>
        {title && <title>{title}</title>}
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        <line x1="12" y1="13" x2="12" y2="17" />
        <line x1="10" y1="15" x2="14" y2="15" />
      </svg>
    );
  }

  if (variant === "folder-open") {
    return (
      <svg {...svgProps}>
        {title && <title>{title}</title>}
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v10z" />
        <path d="M2 10v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3" />
      </svg>
    );
  }

  // Default folder icon
  return (
    <svg {...svgProps}>
      {title && <title>{title}</title>}
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}
