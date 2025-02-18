"use client";

import { JSX, useState, useCallback, useEffect, useRef } from "react";
import { getConsumers } from "@/app/actions";
import { ConsumerMetadata } from "@/types/nats";
import { StreamPicker } from "@/components/StreamPicker";
import { Refresher } from "@/components/Refresher";
import { CopyButton } from "@/components/CopyButton";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  type Header,
} from "@tanstack/react-table";
import { DetailOverlay } from "@/components/DetailOverlay";
import { ConsumerDetails } from "@/components/ConsumerDetails";
import {
  DurableIcon,
  EphemeralIcon,
  PushIcon,
  PullIcon,
  SortIcon,
} from "@/components/icons";

const IconCell = ({
  value,
  icon,
}: {
  value: string;
  icon: JSX.Element;
}): JSX.Element => (
  <div className="flex items-center justify-center" title={`${value} consumer`}>
    {icon}
  </div>
);

export const HeaderCell = ({
  header,
  align = "left",
}: {
  header: Header<ConsumerMetadata, unknown>;
  align?: "left" | "right" | "center";
}): JSX.Element => {
  const content = flexRender(
    header.column.columnDef.header,
    header.getContext()
  );
  const isActive = header.column.getIsSorted();

  return (
    <div className="group relative flex items-center h-6">
      <div
        className={`flex items-center gap-1.5 ${
          align === "right" ? "ml-auto" : ""
        }`}
      >
        <span className="font-medium">{content}</span>
        <SortIcon
          direction={isActive}
          className="w-4 h-4 text-gray-400 dark:text-gray-500"
        />
      </div>
    </div>
  );
};

const NumericCell = ({ value }: { value: number }): JSX.Element => (
  <div className="text-right tabular-nums">{value.toLocaleString()}</div>
);

const SubjectItem = ({ subject }: { subject: string }): JSX.Element => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const checkTruncation = (): void => {
      if (contentRef.current) {
        setIsTruncated(
          contentRef.current.scrollWidth > contentRef.current.clientWidth
        );
      }
    };

    checkTruncation();
    window.addEventListener("resize", checkTruncation);
    return () => window.removeEventListener("resize", checkTruncation);
  }, [subject]);

  return (
    <div className="group relative min-w-0">
      <div className="flex items-center gap-1.5 h-6">
        <div className="min-w-0 max-w-[calc(100%-24px)]">
          <div className="inline-block border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5 text-sm max-w-full relative">
            <div
              ref={contentRef}
              title={subject}
              className="overflow-hidden whitespace-nowrap"
            >
              {subject}
            </div>
            {isTruncated && (
              <div className="absolute inset-y-0 right-0 w-6 bg-gradient-to-r from-transparent via-white/50 to-white dark:via-gray-800/50 dark:to-gray-800" />
            )}
          </div>
        </div>
        <CopyButton
          value={subject}
          className="opacity-0 group-hover:opacity-100 shrink-0 transition-opacity"
          showBackground={false}
          iconClassName="w-3.5 h-3.5"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
};

const SubjectsCell = ({ value }: { value: string[] }): JSX.Element => (
  <div className="flex flex-col gap-1.5">
    {value.map((subject, index) => (
      <SubjectItem key={index} subject={subject} />
    ))}
  </div>
);

const ConsumerCell = ({
  name,
  durability,
  flow,
}: {
  name: string;
  durability: string;
  flow: string;
}): JSX.Element => (
  <div className="flex items-center gap-3 group">
    <div className="flex items-center gap-1.5 shrink-0">
      <IconCell
        value={durability}
        icon={durability === "durable" ? <DurableIcon /> : <EphemeralIcon />}
      />
      <IconCell
        value={flow}
        icon={flow === "push" ? <PushIcon /> : <PullIcon />}
      />
    </div>
    <span className="truncate" title={name}>
      {name}
    </span>
    <CopyButton
      value={name}
      className="opacity-0 group-hover:opacity-100 shrink-0"
      showBackground={false}
      onClick={(e) => e.stopPropagation()}
    />
  </div>
);

const columnHelper = createColumnHelper<ConsumerMetadata>();

export const columns = [
  columnHelper.accessor("name", {
    header: "Consumer",
    cell: (info) => (
      <ConsumerCell
        name={info.getValue()}
        durability={info.row.original.durability}
        flow={info.row.original.flow}
      />
    ),
    size: 200,
  }),
  columnHelper.accessor("filterSubjects", {
    header: "Filter Subjects",
    cell: (info) => <SubjectsCell value={info.getValue()} />,
    size: 240,
  }),
  columnHelper.accessor("unprocessedCount", {
    header: "Unprocessed",
    cell: (info) => <NumericCell value={info.getValue()} />,
    size: 90,
  }),
  columnHelper.accessor("ackPendingCount", {
    header: "Pending Acks",
    cell: (info) => <NumericCell value={info.getValue()} />,
    size: 90,
  }),
  columnHelper.accessor("waitingCount", {
    header: "Waiting",
    cell: (info) => <NumericCell value={info.getValue()} />,
    size: 90,
  }),
];

export default function ConsumersPage(): JSX.Element {
  const [selectedStream, setSelectedStream] = useState<string>("");
  const [consumers, setConsumers] = useState<ConsumerMetadata[]>([]);
  const [error, setError] = useState<string>("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedConsumer, setSelectedConsumer] =
    useState<ConsumerMetadata | null>(null);

  const table = useReactTable({
    data: consumers,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const fetchConsumers = useCallback(async (): Promise<void> => {
    if (!selectedStream) return;

    const result = await getConsumers(selectedStream);
    if (result.success) {
      const normalizedConsumers = (result.data || []).map((consumer) => ({
        ...consumer,
        filterSubjects: consumer.filterSubjects || [],
      }));
      setConsumers(normalizedConsumers);
      setError("");
    } else {
      setError(result.error || "Failed to fetch consumers");
      setConsumers([]);
    }
  }, [selectedStream]);

  useEffect(() => {
    void fetchConsumers();
  }, [selectedStream, fetchConsumers]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent): void => {
      if (!selectedConsumer || !consumers.length) return;

      const currentIndex = consumers.findIndex(
        (c) => c.name === selectedConsumer.name
      );
      if (currentIndex === -1) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const nextIndex = Math.min(currentIndex + 1, consumers.length - 1);
        setSelectedConsumer(consumers[nextIndex]);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prevIndex = Math.max(currentIndex - 1, 0);
        setSelectedConsumer(consumers[prevIndex]);
      }
    },
    [selectedConsumer, consumers]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <>
      <div className="mb-8 space-y-4">
        <div className="flex items-center justify-between">
          <div className="w-1/3">
            <StreamPicker
              selectedStream={selectedStream}
              onStreamSelected={(stream) => setSelectedStream(stream.name)}
              onError={setError}
            />
          </div>
          {selectedStream && (
            <Refresher onRefresh={fetchConsumers} defaultInterval={5000} />
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
      </div>

      {selectedStream && !error && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Stream Consumers
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {consumers.length} consumer{consumers.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <table className="w-full table-fixed">
              <thead className="bg-gray-50 dark:bg-gray-700">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-4 py-2 text-gray-900 dark:text-white whitespace-nowrap sticky top-0 bg-gray-50 dark:bg-gray-700"
                        onClick={header.column.getToggleSortingHandler()}
                        style={{
                          cursor: "pointer",
                          width: header.column.getSize(),
                          maxWidth: header.column.getSize(),
                        }}
                      >
                        <HeaderCell
                          header={header}
                          align={
                            header.column.id.includes("Count")
                              ? "right"
                              : "left"
                          }
                        />
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {consumers.length > 0 ? (
                  table.getRowModel().rows.map((row, index) => (
                    <tr
                      key={row.id}
                      data-index={index}
                      className={`cursor-pointer transition-colors ${
                        selectedConsumer?.name === row.original.name
                          ? "bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                          : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        setSelectedConsumer(row.original);
                      }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className="px-4 py-2 text-gray-900 dark:text-white relative"
                          style={{
                            width: cell.column.getSize(),
                            maxWidth: cell.column.getSize(),
                          }}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="px-4 py-2 text-center text-gray-500 dark:text-gray-400"
                    >
                      No consumers found for this stream
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!selectedStream && (
        <div className="text-gray-500 dark:text-gray-400">
          Select a stream to view its consumers
        </div>
      )}

      {selectedConsumer && (
        <DetailOverlay onClose={() => setSelectedConsumer(null)}>
          <ConsumerDetails
            consumer={selectedConsumer}
            onClose={() => setSelectedConsumer(null)}
          />
        </DetailOverlay>
      )}
    </>
  );
}
