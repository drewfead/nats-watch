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
import { useCluster } from "@/components/ClusterPicker";
import { getStreamMessageRange, getStreams } from "@/actions/streams";
import { ReloadIcon } from "@/components/icons/ReloadIcon";

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
  const { currentCluster } = useCluster();
  const [oldestSeq, setOldestSeq] = useState<number | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitializingStream, setIsInitializingStream] = useState(true);
  const [latestSeq, setLatestSeq] = useState<number | null>(null);

  // Initialize stream info when component mounts
  useEffect(() => {
    // Skip if no stream or if oldestSeq is already set
    if (!stream || oldestSeq !== null) {
      setIsInitializingStream(false);
      return;
    }

    function fetchStreamInfo(): void {
      if (!stream) return;

      try {
        setIsInitializingStream(true);
        setError(null);

        // Store the latest sequence we know about from the stream info
        setLatestSeq(stream.lastSequence);
        // Don't set oldestSeq yet - we'll determine it when loading messages
      } catch (error) {
        console.error("Error initializing stream:", error);
        setError(
          error instanceof Error
            ? `Failed to initialize stream: ${error.message}`
            : "Failed to initialize stream"
        );
      } finally {
        setIsInitializingStream(false);
      }
    }

    fetchStreamInfo();
  }, [stream, currentCluster?.id, oldestSeq]);

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
    setOldestSeq(null);
  };

  useEffect(() => {
    if (!isSubscribed || !subject || !stream) {
      return;
    }

    const url = new URL("/api/subscribe", window.location.origin);
    url.searchParams.set("subject", subject);
    url.searchParams.set("stream", stream.name);
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
            setMessages((prev) => {
              // Update oldest sequence number if this is a JetStream message
              if (
                "seq" in envelope.payload &&
                (!oldestSeq || envelope.payload.seq < oldestSeq)
              ) {
                setOldestSeq(envelope.payload.seq);
              }
              return [...prev, envelope];
            });
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
  }, [isSubscribed, subject, stream, currentCluster?.id, oldestSeq]);

  const handleSubscribe = (): void => {
    if (!subject || !stream) return;
    setMessages([]);
    setOldestSeq(null);
    setIsSubscribed(true);
  };

  const loadMoreMessages = async (): Promise<void> => {
    if (!stream) return;

    try {
      setIsLoadingMore(true);
      setError(null);

      let startSeq: number;
      const limit = 100; // Request 100 messages

      if (messages.length > 0) {
        // If we already have messages, find the oldest one's sequence number
        const oldestMessage = messages.reduce((oldest, current) => {
          if (current.type !== "message") return oldest;
          const currentSeq =
            "seq" in current.payload
              ? current.payload.seq
              : Number.MAX_SAFE_INTEGER;
          const oldestSeq =
            "seq" in oldest.payload
              ? oldest.payload.seq
              : Number.MAX_SAFE_INTEGER;
          return currentSeq < oldestSeq ? current : oldest;
        }, messages[0]);

        const oldestMessageSeq =
          "seq" in oldestMessage.payload ? oldestMessage.payload.seq : null;

        if (oldestMessageSeq !== null && oldestMessageSeq > 1) {
          // Load a page of messages older than the oldest we currently have
          startSeq = Math.max(1, oldestMessageSeq - limit);
        } else if (latestSeq && latestSeq > 0) {
          // We have the latest sequence info but no valid message sequence
          startSeq = Math.max(1, latestSeq - limit + 1);
        } else {
          // Fallback to sequence 1
          startSeq = 1;
        }
      } else if (oldestSeq && oldestSeq > 1) {
        // We have an oldestSeq but no messages
        startSeq = Math.max(1, oldestSeq - limit);
      } else if (latestSeq && latestSeq > 0) {
        // We have the latest sequence from the stream but no messages yet
        // Start from the latest sequence and go backwards
        startSeq = Math.max(1, latestSeq - limit + 1);
      } else {
        // Fallback if we don't have any sequence information
        // Fetch stream info to determine where to start
        const streamsResult = await getStreams(currentCluster?.id);
        if (!streamsResult.success) {
          throw new Error(streamsResult.error);
        }

        const currentStream = streamsResult.data.find(
          (s) => s.name === stream.name
        );
        if (!currentStream) {
          throw new Error("Could not find stream information");
        }

        // Store the latest sequence from the fetched stream info
        setLatestSeq(currentStream.lastSequence);
        // Start from the latest sequence and go backwards
        startSeq = Math.max(1, currentStream.lastSequence - limit + 1);
      }

      console.log(
        `Loading messages from ${startSeq} to ${startSeq + limit - 1}, requesting ${limit} messages`
      );

      // Fetch messages
      const result = await getStreamMessageRange(
        stream.name,
        startSeq,
        limit,
        currentCluster?.id,
        subject !== ">" ? subject : undefined
      );

      if (result.success && result.data) {
        // Convert to EventEnvelope format and add to messages
        const olderMessages = result.data.map((message) => ({
          type: "message" as const,
          payload: message,
        }));

        console.log(
          `Received ${olderMessages.length} messages out of requested ${limit}`
        );

        if (olderMessages.length > 0) {
          // Update oldest sequence to the lowest sequence we've received
          const newOldestSeq = Math.min(
            ...olderMessages.map((m) =>
              "seq" in m.payload ? m.payload.seq : Number.MAX_SAFE_INTEGER
            )
          );

          if (newOldestSeq !== Number.MAX_SAFE_INTEGER) {
            // Only update oldestSeq if we found a valid sequence and it's lower than current
            if (oldestSeq === null || newOldestSeq < oldestSeq) {
              setOldestSeq(newOldestSeq);
            }
          }

          // Add messages to the beginning of the list
          setMessages((prev) => [...olderMessages, ...prev]);
        } else {
          // No messages found in the requested range
          if (startSeq === 1) {
            setError("No messages found in the stream");
          } else {
            setError("No additional messages found");
          }
        }
      } else if (!result.success) {
        setError(`Failed to load more messages: ${result.error}`);
      }
    } catch (error) {
      console.error("Error loading more messages:", error);
      setError(
        error instanceof Error
          ? `Failed to load messages: ${error.message}`
          : "Failed to load more messages. Please try again."
      );
    } finally {
      setIsLoadingMore(false);
    }
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
      >
        {isInitializingStream || isLoadingMore ? (
          <div className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-wait min-w-[140px]">
            <ReloadIcon className="animate-spin -ml-0.5 mr-1.5 h-4 w-4" />
            {isInitializingStream ? "Initializing..." : "Loading..."}
          </div>
        ) : (
          <button
            onClick={loadMoreMessages}
            disabled={
              isLoadingMore || isInitializingStream || !validation.isValid
            }
            className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md min-w-[140px] ${
              isLoadingMore || isInitializingStream || !validation.isValid
                ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                : "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40"
            }`}
          >
            <ReloadIcon className="-ml-0.5 mr-1.5 h-4 w-4" />
            Load Messages
          </button>
        )}
      </SubscriptionStatusBar>

      {error && (
        <div className="text-red-500 border border-red-200 bg-red-50 px-3 py-2 rounded mb-2">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">
            {messages.length > 0 ? `Messages (${messages.length})` : "Messages"}
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

        {isInitializingStream ? (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mb-2"></div>
            <p className="text-gray-500 dark:text-gray-400">
              Initializing stream data...
            </p>
          </div>
        ) : messages.length === 0 ? (
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
            type="jetstream"
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
  );
}
