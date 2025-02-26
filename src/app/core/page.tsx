"use client";

import { JSX, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { MessageDetails } from "@/components/MessageDetails";
import { MessageList } from "@/components/MessageList";
import { FilterBuilder } from "@/components/FilterBuilder";
import { NatsMessage, EventEnvelope } from "@/types/nats";
import { Filter } from "@/types/filter";
import { FilterBar } from "@/components/FilterBar";
import { SubscriptionStatusBar } from "@/components/SubscriptionStatusBar";
import { isValidNatsSubject } from "@/lib/nats-client-ops";
import { DetailOverlay } from "@/components/DetailOverlay";
import { useCluster } from "@/components/ClusterPicker";

// Separate the main page content into its own component
function CorePageContent(): JSX.Element {
  const [subject, setSubject] = useState("");
  const [messages, setMessages] = useState<EventEnvelope[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<
    NatsMessage | undefined
  >(undefined);
  const eventSourceRef = useRef<EventSource | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showErrorTooltip, setShowErrorTooltip] = useState(false);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const validationTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const [isTyping, setIsTyping] = useState(false);
  const [filter, setFilter] = useState<Filter>({ type: "unfiltered" });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [showUnsubscribeWarning, setShowUnsubscribeWarning] = useState(false);
  const [pendingSubjectChange, setPendingSubjectChange] = useState<
    string | null
  >(null);
  const { currentCluster } = useCluster();

  const handleUnsubscribe = (): void => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsSubscribed(false);
  };

  const handleClearMessages = (): void => {
    setMessages([]);
    setSelectedMessage(undefined);
  };

  useEffect(() => {
    if (!isSubscribed || !subject) return;

    const url = new URL("/api/subscribe", window.location.origin);
    url.searchParams.set("subject", subject);
    if (currentCluster?.id) {
      url.searchParams.set("clusterId", currentCluster.id);
    }

    const eventSource = new EventSource(url.toString());
    eventSourceRef.current = eventSource;
    setIsConnecting(true);
    setError(null);

    eventSource.onmessage = (event): void => {
      try {
        const envelope = JSON.parse(event.data) as EventEnvelope;

        switch (envelope.type) {
          case "message":
            setMessages((prev) => [...prev, envelope]);
            break;

          case "control":
            if (envelope.payload.type === "connection_status") {
              if (envelope.payload.status === "connected") {
                setIsConnecting(false);
              } else if (envelope.payload.status === "disconnected") {
                setIsConnecting(false);
                setIsSubscribed(false);
                eventSource.close();
              }
            } else if (envelope.payload.type === "heartbeat") {
              setIsConnecting(false);
            }
            break;
        }
      } catch (err) {
        console.error("Error parsing message:", err);
      }
    };

    eventSource.onerror = (event): void => {
      console.error("EventSource error:", event);
      setError("Connection error. Please try again.");
      setIsConnecting(false);
      eventSource.close();
      setIsSubscribed(false);
    };

    return (): void => {
      eventSource.close();
      setIsConnecting(false);
    };
  }, [isSubscribed, subject, currentCluster?.id]);

  const handleSubscribe = (): void => {
    if (!subject) return;
    setMessages([]);
    setIsSubscribed(true);
  };

  const validation = useMemo(() => isValidNatsSubject(subject), [subject]);
  const isValidInput = validation.isValid;

  const handleSubjectChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ): void => {
    const newValue = e.target.value;

    // If we're subscribed, show warning before changing
    if (isSubscribed) {
      setPendingSubjectChange(newValue);
      setShowUnsubscribeWarning(true);
      return;
    }

    setSubject(newValue);

    // Set typing state and clear previous timeouts
    setIsTyping(true);
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }

    // Debounce the end of typing
    validationTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 500);
  };

  const handleConfirmSubjectChange = (): void => {
    if (pendingSubjectChange !== null) {
      handleUnsubscribe();
      setSubject(pendingSubjectChange);
      setPendingSubjectChange(null);
    }
    setShowUnsubscribeWarning(false);
  };

  const handleCancelSubjectChange = (): void => {
    setPendingSubjectChange(null);
    setShowUnsubscribeWarning(false);
  };

  useEffect(() => {
    if (subject && !validation.isValid && !isTyping) {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
      setShowErrorTooltip(true);
      tooltipTimeoutRef.current = setTimeout(() => {
        setShowErrorTooltip(false);
      }, 2000);
    }

    return (): void => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [subject, validation.isValid, isTyping]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-full">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={subject}
              onChange={handleSubjectChange}
              placeholder="Enter subject (e.g., foo.*, foo.bar.>)"
              className={`w-full px-4 py-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 ${
                isValidInput ? "focus:ring-blue-500" : "focus:ring-red-500"
              }`}
              required
              disabled={isConnecting}
            />
            {subject && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                {isValidInput ? (
                  <svg
                    className="w-4 h-4 text-green-500"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <div className="group relative flex items-center">
                    <svg
                      className="w-4 h-4 text-red-500"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div
                      className={`absolute top-full left-0 mt-2 w-60 px-3 py-2 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm whitespace-normal transition-opacity duration-200 ${
                        showErrorTooltip
                          ? "visible opacity-100"
                          : "invisible opacity-0 group-hover:visible group-hover:opacity-100"
                      }`}
                    >
                      {validation.error}
                      <div className="absolute top-0 left-4 w-2 h-2 -mt-1 rotate-45 bg-red-50 dark:bg-red-900/50 border-t border-l border-red-200 dark:border-red-800"></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <FilterBar
          filter={filter}
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          isOpen={isFilterOpen}
          onChange={setFilter}
        />
        <FilterBuilder
          filter={filter}
          onChange={setFilter}
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
        />

        <SubscriptionStatusBar
          isSubscribed={isSubscribed}
          isConnecting={isConnecting}
          isDisabled={!validation.isValid}
          onSubscribe={handleSubscribe}
          onUnsubscribe={handleUnsubscribe}
        />

        {error && (
          <div className="text-red-500 border border-red-200 bg-red-50 px-3 py-2 rounded mb-2">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">
              {messages.length > 0
                ? `Messages (${messages.length})`
                : "Messages"}
            </h2>
            {messages.length > 0 && (
              <button
                onClick={handleClearMessages}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Clear Messages
              </button>
            )}
          </div>

          {messages.length === 0 ? (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                {isConnecting
                  ? "Connecting to NATS..."
                  : isSubscribed
                    ? "Waiting for messages..."
                    : "No messages received yet."}
              </p>
            </div>
          ) : (
            <MessageList
              type="core"
              messages={messages}
              onMessageClick={setSelectedMessage}
              filter={filter}
              selectedMessage={selectedMessage}
            />
          )}
        </div>

        {selectedMessage && (
          <DetailOverlay onClose={() => setSelectedMessage(undefined)}>
            <MessageDetails
              message={selectedMessage}
              onClose={() => setSelectedMessage(undefined)}
              embedded={false}
            />
          </DetailOverlay>
        )}

        {showUnsubscribeWarning && (
          <DetailOverlay onClose={handleCancelSubjectChange}>
            <div className="fixed inset-0 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  Confirm Subject Change
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Changing the subject will unsubscribe you from the current
                  stream. Do you want to proceed?
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={handleCancelSubjectChange}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmSubjectChange}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                  >
                    Proceed
                  </button>
                </div>
              </div>
            </div>
          </DetailOverlay>
        )}
      </div>
    </div>
  );
}

// Main component that wraps CorePageContent in a Suspense boundary
export default function CorePage(): JSX.Element {
  return (
    <Suspense fallback={<div>Loading core messaging...</div>}>
      <CorePageContent />
    </Suspense>
  );
}
