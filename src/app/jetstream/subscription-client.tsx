"use client";

import { DetailOverlay } from "@/components/DetailOverlay";
import { FilterBar } from "@/components/FilterBar";
import { FilterBuilder } from "@/components/FilterBuilder";
import { MessageDetails } from "@/components/MessageDetails";
import { MessageList } from "@/components/MessageList";
import { SubscriptionStatusBar } from "@/components/SubscriptionStatusBar";
import { isValidJetStreamSubject } from "@/lib/nats-client-ops";
import { Filter } from "@/types/filter";
import { EventEnvelope, JetStreamMessage, StreamMetadata } from "@/types/nats";
import { JSX, useState, useRef, useEffect, useMemo } from "react";
import { useSubscription } from "./subscription-context";

export interface SubscriptionClientProps {
  stream: StreamMetadata;
}

export default function SubscriptionClient({
  stream,
}: SubscriptionClientProps): JSX.Element {
  const { subject, setSubject } = useSubscription();
  const [messages, setMessages] = useState<EventEnvelope[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<
    JetStreamMessage | undefined
  >(undefined);
  const eventSourceRef = useRef<EventSource | null>(null);
  const [filter, setFilter] = useState<Filter>({ type: "unfiltered" });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [showUnsubscribeWarning, setShowUnsubscribeWarning] = useState(false);
  const [pendingSubjectChange, setPendingSubjectChange] = useState<
    string | null
  >(null);

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
    if (!isSubscribed || !subject || !stream) {
      return;
    }

    const url = new URL("/api/subscribe", window.location.origin);
    url.searchParams.set("subject", subject);
    url.searchParams.set("stream", stream.name);

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
  }, [isSubscribed, subject, stream]);

  const handleSubscribe = (): void => {
    if (!subject || !stream) return;
    setMessages([]);
    setIsSubscribed(true);
  };

  const validation = useMemo(
    () => isValidJetStreamSubject(subject, stream.subjectPrefixes),
    [subject, stream]
  );

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

  return (
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
        isDisabled={!stream || !validation.isValid}
        onSubscribe={handleSubscribe}
        onUnsubscribe={handleUnsubscribe}
      />

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Messages
          </h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {messages.length} message{messages.length !== 1 ? "s" : ""}
            </span>
            {messages.length > 0 && (
              <button
                onClick={handleClearMessages}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Clear Messages
              </button>
            )}
          </div>
        </div>

        <div className="mt-4">
          {messages.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">
              {isConnecting
                ? "Connecting to NATS..."
                : isSubscribed
                  ? "Waiting for messages..."
                  : "No messages received yet. Subscribe to a subject to see messages."}
            </p>
          ) : (
            <MessageList
              type="jetstream"
              messages={messages}
              onMessageClick={setSelectedMessage}
              filter={filter}
              selectedMessage={selectedMessage}
            />
          )}
        </div>
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
  );
}
