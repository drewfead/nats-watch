"use client";

import { getStreams } from "@/actions/streams";
import { JSX, useCallback, useEffect, useRef, useState } from "react";
import { StreamMetadata } from "@/types/nats";
import { useRouter } from "next/navigation";
import { useCluster } from "./ClusterPicker";

export interface StreamPickerProps {
  selectedStream?: string;
  disabled?: boolean;
  onStreamSelected?: (stream: StreamMetadata) => void;
  onError?: (error: string) => void;
  streams?: StreamMetadata[];
  isServerComponent?: boolean;
}

export function StreamPicker({
  selectedStream,
  disabled: propsDisabled,
  onStreamSelected,
  onError,
  streams: initialStreams,
  isServerComponent,
}: StreamPickerProps): JSX.Element {
  const router = useRouter();

  const { currentCluster } = useCluster();
  const [streams, setStreams] = useState<StreamMetadata[]>(
    initialStreams || []
  );
  const streamDropdownRef = useRef<HTMLDivElement>(null);
  const [showStreamDropdown, setShowStreamDropdown] = useState(false);

  // Calculate if the component should be disabled - either from props or if no cluster is available
  const disabled = propsDisabled || !currentCluster;

  const fetchStreams = useCallback(async (): Promise<void> => {
    if (isServerComponent) return;

    console.log("fetching streams for cluster", currentCluster?.id);

    try {
      const result = await getStreams(currentCluster?.id);
      if (result.success) {
        setStreams(result.data || []);
      } else {
        onError?.(result.error || "Failed to fetch stream information");
      }
    } catch (error) {
      console.error("Error fetching streams:", error);
      onError?.("Failed to fetch stream information");
    }
  }, [isServerComponent, onError, currentCluster?.id]);

  // Effect to fetch streams on mount and when cluster changes
  useEffect(() => {
    if (!initialStreams) {
      if (currentCluster) {
        void fetchStreams();
      } else {
        setStreams([]);
      }
    }
  }, [currentCluster, fetchStreams, initialStreams]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (
        streamDropdownRef.current &&
        !streamDropdownRef.current.contains(event.target as Node)
      ) {
        setShowStreamDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleStreamSelect = (stream: StreamMetadata): void => {
    setShowStreamDropdown(false);
    if (isServerComponent) {
      router.push(`/jetstream/${stream.name}`);
    } else {
      onStreamSelected?.(stream);
    }
  };

  const selectedStreamData = streams.find((s) => s.name === selectedStream);

  // Get the appropriate tooltip message based on the disabled state
  const getTooltipMessage = (): string => {
    if (!currentCluster) {
      return "Please select a NATS cluster first";
    }
    if (propsDisabled) {
      return "Stream selection is disabled";
    }
    return "";
  };

  const tooltipMessage = getTooltipMessage();

  return (
    <div className="relative" ref={streamDropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setShowStreamDropdown(!showStreamDropdown)}
        disabled={disabled}
        title={tooltipMessage}
        className={`w-full px-4 py-3 text-left border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        {!currentCluster
          ? "No NATS cluster selected"
          : selectedStreamData
            ? selectedStreamData.name
            : streams.length > 0
              ? "Select a stream"
              : "No streams available"}
      </button>

      {showStreamDropdown && streams.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg">
          <ul className="max-h-60 overflow-auto">
            {streams.map((stream) => (
              <li
                key={stream.name}
                className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => handleStreamSelect(stream)}
              >
                <div className="font-medium">{stream.name}</div>
                {stream.description && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {stream.description}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {showStreamDropdown && streams.length === 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg p-4 text-center text-gray-500 dark:text-gray-400">
          No streams found in this cluster
        </div>
      )}
    </div>
  );
}
