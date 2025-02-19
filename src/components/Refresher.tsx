import { JSX, useCallback, useEffect, useRef, useState } from "react";

const REFRESH_INTERVALS = [
  { label: "Manual", value: 0 },
  { label: "1s", value: 1000 },
  { label: "2s", value: 2000 },
  { label: "3s", value: 3000 },
  { label: "5s", value: 5000 },
  { label: "10s", value: 10000 },
  { label: "30s", value: 30000 },
  { label: "60s", value: 60000 },
] as const;

export interface RefreshPickerProps {
  /** The callback to execute when refresh is needed */
  onRefresh: () => Promise<void> | void;
  /** Default refresh interval in milliseconds. Set to 0 for manual mode. */
  defaultInterval?: number;
  /** Class name for the container */
  className?: string;
}

export function Refresher({
  onRefresh,
  defaultInterval = 5000,
  className = "",
}: RefreshPickerProps): JSX.Element {
  const [interval, setInterval] = useState<number>(defaultInterval);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [nextRefresh, setNextRefresh] = useState<Date>(
    new Date(Date.now() + interval)
  );
  const [progress, setProgress] = useState(0);
  const [showIntervals, setShowIntervals] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<number | null>(null);
  const updateIntervalRef = useRef<number | null>(null);

  const handleRefresh = useCallback(async () => {
    await onRefresh();
    setLastRefresh(new Date());
    setNextRefresh(new Date(Date.now() + interval));
  }, [onRefresh, interval]);

  const handleIntervalChange = useCallback(
    (newInterval: number) => {
      setInterval(newInterval);
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (newInterval > 0) {
        intervalRef.current = window.setInterval(
          () => void handleRefresh(),
          newInterval
        );
      }
      // Force an immediate refresh when changing interval
      void handleRefresh();
    },
    [handleRefresh]
  );

  useEffect(() => {
    if (interval === 0) {
      setProgress(0);
      return;
    }

    if (updateIntervalRef.current !== null) {
      window.clearInterval(updateIntervalRef.current);
    }

    updateIntervalRef.current = window.setInterval(() => {
      const now = new Date();
      const total = nextRefresh.getTime() - lastRefresh.getTime();
      const elapsed = now.getTime() - lastRefresh.getTime();
      const newProgress = Math.min((elapsed / total) * 100, 100);
      setProgress(newProgress);
    }, 100);

    return () => {
      if (updateIntervalRef.current !== null) {
        window.clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
    };
  }, [lastRefresh, nextRefresh, interval]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowIntervals(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (interval > 0) {
      intervalRef.current = window.setInterval(
        () => void handleRefresh(),
        interval
      );
    }

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [interval, handleRefresh]);

  return (
    <div
      className={`relative flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 ${className}`}
      ref={menuRef}
    >
      <button
        onClick={handleRefresh}
        className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
        title="Click to refresh now"
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        {interval > 0 && (
          <div className="w-16 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 dark:bg-blue-400 rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </button>
      <button
        onClick={() => setShowIntervals(!showIntervals)}
        className="px-1.5 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {showIntervals && (
        <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
          <div className="py-1">
            {REFRESH_INTERVALS.map((option) => (
              <button
                key={option.value}
                className={`w-full px-4 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  interval === option.value
                    ? "text-blue-500 dark:text-blue-400"
                    : ""
                }`}
                onClick={() => {
                  handleIntervalChange(option.value);
                  setShowIntervals(false);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
