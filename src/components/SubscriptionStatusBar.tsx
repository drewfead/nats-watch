import { JSX, ReactNode } from "react";
import { SubscribeIcon, CloseIcon } from "@/components/icons";

type SubscriptionStatusBarProps = {
  isSubscribed: boolean;
  isConnecting: boolean;
  isDisabled: boolean;
  onSubscribe: () => void;
  onUnsubscribe: () => void;
  children?: ReactNode;
};

export function SubscriptionStatusBar({
  isSubscribed,
  isConnecting,
  isDisabled,
  onSubscribe,
  onUnsubscribe,
  children,
}: SubscriptionStatusBarProps): JSX.Element {
  return (
    <div className="relative flex items-center justify-between py-2 pl-2">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div
            className={`w-3 h-3 rounded-full ${
              isConnecting
                ? "bg-yellow-400 dark:bg-yellow-500"
                : isSubscribed
                  ? "bg-green-400 dark:bg-green-500"
                  : "bg-gray-300 dark:bg-gray-600"
            }`}
          >
            {(isConnecting || isSubscribed) && (
              <div className="absolute inset-0 rounded-full animate-ping bg-current opacity-75" />
            )}
          </div>
        </div>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {isConnecting
            ? "Connecting..."
            : isSubscribed
              ? "Subscribed"
              : "Not Subscribed"}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {children}
        {!isSubscribed ? (
          <button
            onClick={onSubscribe}
            disabled={isDisabled || isConnecting}
            className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${
              isDisabled || isConnecting
                ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                : "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40"
            }`}
          >
            {isConnecting ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Connecting...
              </>
            ) : (
              <>
                <SubscribeIcon className="-ml-0.5 mr-1.5 h-4 w-4" />
                Subscribe
              </>
            )}
          </button>
        ) : (
          <button
            onClick={onUnsubscribe}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40"
          >
            <CloseIcon className="-ml-0.5 mr-1.5 h-4 w-4" />
            Unsubscribe
          </button>
        )}
      </div>
    </div>
  );
}
