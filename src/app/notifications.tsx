"use client";

import {
  createContext,
  useContext,
  useCallback,
  useState,
  ReactNode,
  JSX,
} from "react";
import {
  ErrorIcon,
  SuccessIcon,
  InfoIcon,
} from "@/components/icons/NotificationIcons";

type NotificationContextType = {
  showNotification: (
    message: string,
    type?: "error" | "success" | "info"
  ) => void;
  clearNotification: () => void;
  notification: { message: string; type: "error" | "success" | "info" } | null;
};

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

const NotificationIcon = ({
  type,
}: {
  type: "error" | "success" | "info";
}): JSX.Element => {
  switch (type) {
    case "error":
      return <ErrorIcon className="w-5 h-5" />;
    case "success":
      return <SuccessIcon className="w-5 h-5" />;
    case "info":
      return <InfoIcon className="w-5 h-5" />;
  }
};

export function NotificationProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const [notification, setNotification] = useState<{
    message: string;
    type: "error" | "success" | "info";
  } | null>(null);

  const showNotification = useCallback(
    (message: string, type: "error" | "success" | "info" = "info") => {
      setNotification({ message, type });
      // Auto-clear after 5 seconds
      setTimeout(() => {
        setNotification(null);
      }, 5000);
    },
    []
  );

  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);

  return (
    <NotificationContext.Provider
      value={{ showNotification, clearNotification, notification }}
    >
      {children}
      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
              notification.type === "error"
                ? "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400"
                : notification.type === "success"
                  ? "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400"
                  : "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400"
            }`}
          >
            <NotificationIcon type={notification.type} />
            <span className="font-medium">{notification.message}</span>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotification must be used within a NotificationProvider"
    );
  }
  return context;
}
