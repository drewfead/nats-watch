import { JSX, useRef, useEffect, useCallback, useMemo } from "react";
import { EventEnvelope, NatsMessage, JetStreamMessage } from "@/types/nats";
import { Filter } from "@/types/filter";
import { isUnfiltered, matchesFilter } from "@/lib/filter";
import { JetStreamIcon, CoreNatsIcon } from "@/components/icons";
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
  flexRender,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";

export const ROW_HEIGHT = 48;
const OVERSCAN = 10;

interface BaseMessageListProps {
  messages: EventEnvelope[];
  className?: string;
  filter: Filter;
}

interface CoreMessageListProps extends BaseMessageListProps {
  type: "core";
  selectedMessage?: NatsMessage;
  onMessageClick?: (message: NatsMessage) => void;
}

interface JetStreamMessageListProps extends BaseMessageListProps {
  type: "jetstream";
  selectedMessage?: JetStreamMessage;
  onMessageClick?: (message: JetStreamMessage) => void;
}

export type MessageListProps = CoreMessageListProps | JetStreamMessageListProps;

const getMessageId = (msg: NatsMessage | JetStreamMessage): string => {
  if ("stream" in msg) {
    return `${msg.stream}:${msg.seq}`;
  }
  // For core NATS, use subject + timestamp + payload hash for uniqueness
  const payloadHash = Array.from(new TextEncoder().encode(msg.payload))
    .reduce((hash, byte) => (hash * 31 + byte) & 0xffffffff, 0)
    .toString(16);
  return `${msg.subject}:${msg.timestamp}:${payloadHash}`;
};

const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
};

const formatSize = (data: string): string => {
  const bytes = new TextEncoder().encode(data).length;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const columnHelper = createColumnHelper<EventEnvelope>();

export function MessageList({
  messages,
  onMessageClick,
  className = "",
  filter,
  selectedMessage,
  type,
}: MessageListProps): JSX.Element {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const selectedRowRef = useRef<HTMLTableRowElement>(null);

  // Filter messages
  const filteredMessages = useMemo(() => {
    return messages
      .filter((msg) => {
        if (msg.type !== "message") return false;
        return matchesFilter(msg.payload, filter);
      })
      .reverse();
  }, [messages, filter]);

  const columns = useMemo(
    () => [
      columnHelper.accessor(
        (row) => {
          if (row.type !== "message") return "";
          return row.payload.subject;
        },
        {
          id: "subject",
          header: "Subject",
          size: type === "jetstream" ? 800 : 900,
          cell: (info) => (
            <div className="flex items-center gap-3">
              {type === "jetstream" ? (
                <JetStreamIcon
                  className="w-4 h-4 flex-none"
                  title="JetStream Message"
                />
              ) : (
                <CoreNatsIcon
                  className="w-4 h-4 flex-none"
                  title="Core NATS Message"
                />
              )}
              <span className="font-mono text-sm text-gray-900 dark:text-white truncate">
                {info.getValue()}
              </span>
            </div>
          ),
        }
      ),
      ...(type === "jetstream"
        ? [
            columnHelper.accessor(
              (row) => {
                if (row.type !== "message") return "";
                return `#${(row.payload as JetStreamMessage).seq}`;
              },
              {
                id: "sequence",
                header: "#",
                size: 100,
                cell: (info) => (
                  <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                    {info.getValue()}
                  </div>
                ),
              }
            ),
          ]
        : []),
      columnHelper.accessor(
        (row) => (row.type === "message" ? row.payload.timestamp : ""),
        {
          id: "timestamp",
          header: "Time",
          size: 120,
          cell: (info) => (
            <div className="text-right text-xs text-gray-500 dark:text-gray-400">
              {formatTimestamp(info.getValue())}
            </div>
          ),
        }
      ),
      columnHelper.accessor(
        (row) => (row.type === "message" ? row.payload.payload : ""),
        {
          id: "size",
          header: "Size",
          size: 100,
          cell: (info) => (
            <div className="text-right text-xs text-gray-500 dark:text-gray-400">
              {formatSize(info.getValue())}
            </div>
          ),
        }
      ),
    ],
    [type]
  );

  const table = useReactTable({
    data: filteredMessages,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN,
  });

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent): void => {
      if (!selectedMessage || !filteredMessages.length) return;

      const currentIndex = filteredMessages.findIndex(
        (msg) =>
          msg.type === "message" &&
          getMessageId(msg.payload) === getMessageId(selectedMessage)
      );
      if (currentIndex === -1) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const nextMessage = filteredMessages[currentIndex + 1];
        if (nextMessage?.type === "message") {
          if (type === "jetstream" && "stream" in nextMessage.payload) {
            (onMessageClick as JetStreamMessageListProps["onMessageClick"])?.(
              nextMessage.payload
            );
          } else if (type === "core" && !("stream" in nextMessage.payload)) {
            (onMessageClick as CoreMessageListProps["onMessageClick"])?.(
              nextMessage.payload
            );
          }
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prevMessage = filteredMessages[currentIndex - 1];
        if (prevMessage?.type === "message") {
          if (type === "jetstream" && "stream" in prevMessage.payload) {
            (onMessageClick as JetStreamMessageListProps["onMessageClick"])?.(
              prevMessage.payload
            );
          } else if (type === "core" && !("stream" in prevMessage.payload)) {
            (onMessageClick as CoreMessageListProps["onMessageClick"])?.(
              prevMessage.payload
            );
          }
        }
      }
    },
    [selectedMessage, filteredMessages, onMessageClick, type]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Scroll selected row into view
  useEffect(() => {
    if (selectedMessage) {
      const index = filteredMessages.findIndex(
        (msg) =>
          msg.type === "message" &&
          getMessageId(msg.payload) === getMessageId(selectedMessage)
      );
      if (index !== -1) {
        rowVirtualizer.scrollToIndex(index, { align: "center" });
      }
    }
  }, [selectedMessage, filteredMessages, rowVirtualizer]);

  return (
    <div className="space-y-2">
      {isUnfiltered(filter) || (
        <div className="flex items-center justify-between px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm">
          <span>
            Showing {filteredMessages.length} of {messages.length} messages
          </span>
          {filteredMessages.length !== messages.length && (
            <span className="text-xs">
              {messages.length - filteredMessages.length} hidden
            </span>
          )}
        </div>
      )}

      <div
        ref={tableContainerRef}
        className={`h-[600px] overflow-auto bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}
      >
        <table className="w-full table-fixed border-separate border-spacing-0">
          <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-700">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={`px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-gray-50 dark:bg-gray-700 ${
                      header.column.id === "subject"
                        ? "text-left"
                        : "text-right"
                    }`}
                    style={{
                      width: header.column.getSize() || undefined,
                    }}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          {filteredMessages.length === 0 ? (
            <tbody>
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-4 text-center text-gray-500 dark:text-gray-400"
                >
                  {isUnfiltered(filter)
                    ? `No messages to display`
                    : `No messages match the filter criteria`}
                </td>
              </tr>
            </tbody>
          ) : (
            <tbody
              className="relative"
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
              }}
            >
              <tr
                className="absolute w-full"
                style={{
                  transform: `translateY(${rowVirtualizer.getVirtualItems()[0]?.start ?? 0}px)`,
                }}
              >
                <td className="p-0" colSpan={columns.length}>
                  <table className="w-full table-fixed border-separate border-spacing-0">
                    <tbody>
                      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        const row = rows[virtualRow.index];
                        if (!row) return null;

                        const msg = row.original;
                        if (msg.type !== "message") return null;

                        const isSelected =
                          selectedMessage &&
                          getMessageId(msg.payload) ===
                            getMessageId(selectedMessage);

                        return (
                          <tr
                            key={row.id}
                            data-index={virtualRow.index}
                            ref={isSelected ? selectedRowRef : undefined}
                            onClick={() => {
                              if (
                                type === "jetstream" &&
                                "stream" in msg.payload
                              ) {
                                (
                                  onMessageClick as JetStreamMessageListProps["onMessageClick"]
                                )?.(msg.payload);
                              } else if (
                                type === "core" &&
                                !("stream" in msg.payload)
                              ) {
                                (
                                  onMessageClick as CoreMessageListProps["onMessageClick"]
                                )?.(msg.payload);
                              }
                            }}
                            className={`${
                              isSelected
                                ? "bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                                : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                            } cursor-pointer`}
                            style={{
                              height: `${ROW_HEIGHT}px`,
                            }}
                          >
                            {row.getVisibleCells().map((cell) => (
                              <td
                                key={cell.id}
                                className="px-3 border-b border-gray-200 dark:border-gray-700"
                                style={{
                                  width: cell.column.getSize() || undefined,
                                }}
                              >
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext()
                                )}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          )}
        </table>
      </div>
    </div>
  );
}
