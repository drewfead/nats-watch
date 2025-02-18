import { JSX, useState } from "react";
import { CheckIcon } from "@/components/icons";

interface CopyButtonProps {
  value: string;
  className?: string;
  showBackground?: boolean;
  iconClassName?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export function CopyButton({
  value,
  className = "",
  showBackground = true,
  iconClassName = "w-4 h-4",
  onClick,
}: CopyButtonProps): JSX.Element {
  const [copied, setCopied] = useState(false);

  const handleClick = (e: React.MouseEvent): void => {
    if (onClick) {
      onClick(e);
    }
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      onClick={handleClick}
      className={`${className} ${
        showBackground
          ? "p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          : ""
      }`}
      title="Copy to clipboard"
    >
      {copied ? (
        <CheckIcon className={iconClassName} />
      ) : (
        <svg
          className={`${iconClassName} text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
          <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
        </svg>
      )}
    </button>
  );
}
