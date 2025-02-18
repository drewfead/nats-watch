import { JSX, ReactNode, useCallback, useEffect } from "react";

interface DetailOverlayProps {
  children: ReactNode;
  onClose: () => void;
}

export function DetailOverlay({
  children,
  onClose,
}: DetailOverlayProps): JSX.Element {
  const handleEscape = useCallback(
    (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [handleEscape]);

  return (
    <div
      className="fixed inset-0 bg-black/20 dark:bg-black/40 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="absolute inset-y-0 right-0 w-full max-w-2xl">
        {children}
      </div>
    </div>
  );
}
