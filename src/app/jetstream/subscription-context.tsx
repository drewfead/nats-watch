"use client";

import { createContext, useContext, useState, ReactNode, JSX } from "react";

interface SubscriptionContextType {
  subject: string;
  setSubject: (subject: string) => void;
  isSubscribed: boolean;
  setIsSubscribed: (isSubscribed: boolean) => void;
  isConnecting: boolean;
  setIsConnecting: (isConnecting: boolean) => void;
  showUnsubscribeWarning: boolean;
  setShowUnsubscribeWarning: (show: boolean) => void;
  pendingSubjectChange: string | null;
  setPendingSubjectChange: (subject: string | null) => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(
  undefined
);

export function SubscriptionProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const [subject, setSubject] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showUnsubscribeWarning, setShowUnsubscribeWarning] = useState(false);
  const [pendingSubjectChange, setPendingSubjectChange] = useState<
    string | null
  >(null);

  return (
    <SubscriptionContext.Provider
      value={{
        subject,
        setSubject,
        isSubscribed,
        setIsSubscribed,
        isConnecting,
        setIsConnecting,
        showUnsubscribeWarning,
        setShowUnsubscribeWarning,
        pendingSubjectChange,
        setPendingSubjectChange,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionContextType {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error(
      "useSubscription must be used within a SubscriptionProvider"
    );
  }
  return context;
}
