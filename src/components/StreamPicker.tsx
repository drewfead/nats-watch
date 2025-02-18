"use client";

import { getStreams } from "@/app/actions";
import { JSX, useEffect, useRef, useState } from "react";
import { StreamMetadata } from "@/types/nats";
import { useRouter } from "next/navigation";

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
  disabled,
  onStreamSelected,
  onError,
  streams: initialStreams,
  isServerComponent,
}: StreamPickerProps): JSX.Element {
  const router = useRouter();
  const [streams, setStreams] = useState<StreamMetadata[]>(
    initialStreams || []
  );
  const streamDropdownRef = useRef<HTMLDivElement>(null);
  const [showStreamDropdown, setShowStreamDropdown] = useState(false);

  useEffect(() => {
    if (isServerComponent || initialStreams) return;

    getStreams()
      .then((result) => {
        if (result.success) {
          setStreams(result.data || []);
        } else {
          onError?.(result.error || "Failed to fetch stream information");
        }
      })
      .catch((error) => {
        console.error("Error fetching streams:", error);
        onError?.("Failed to fetch stream information");
      });
  }, [isServerComponent, initialStreams, onError]);

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

  return (
    <div className="relative" ref={streamDropdownRef}>
      <button
        type="button"
        onClick={() => setShowStreamDropdown(!showStreamDropdown)}
        disabled={disabled}
        className={`w-full px-4 py-3 text-left border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        {selectedStreamData ? selectedStreamData.name : "Select a stream"}
      </button>

      {showStreamDropdown && (
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
    </div>
  );
}
