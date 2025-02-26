"use client";

import { JSX, useState, useCallback, useEffect, useRef, Suspense } from "react";
import { getConsumers } from "@/actions/streams";
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
import { useRouter, useParams } from "next/navigation";
import { useCluster } from "@/components/ClusterPicker";

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

const HeaderCell = ({
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

const columns = [
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

function Consumers(): JSX.Element {
  const router = useRouter();
  const params = useParams();
  const { currentCluster } = useCluster();
  const selectedStream = params.stream as string;
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

    // If no cluster is selected, set an appropriate error
    if (!currentCluster) {
      setError(
        "No NATS cluster selected. Please select a cluster from the sidebar."
      );
      setConsumers([]);
      return;
    }

    const result = await getConsumers(selectedStream, currentCluster?.id);
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
  }, [selectedStream, currentCluster]);

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
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-1/3">
            <StreamPicker
              selectedStream={selectedStream}
              onStreamSelected={(stream) => {
                router.replace(`/consumers/${stream.name}`);
              }}
              onError={(err) => setError(err)}
            />
          </div>
          <div className="flex-1 flex justify-end">
            <Refresher onRefresh={fetchConsumers} />
          </div>
        </div>

        {error && (
          <div className="p-4 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-700 dark:text-red-400 text-sm mb-4">
            <div className="font-semibold mb-1">Error:</div>
            <div>{error}</div>
            {error.includes("No NATS cluster") && (
              <div className="mt-2">
                Please select a NATS cluster from the sidebar to view consumers.
              </div>
            )}
          </div>
        )}

        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      className={`px-4 h-10 text-left text-sm select-none ${
                        header.column.getCanSort() ? "cursor-pointer" : ""
                      }`}
                      style={{ width: header.getSize() }}
                    >
                      <HeaderCell header={header} />
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  onClick={() =>
                    setSelectedConsumer(
                      row.original as unknown as ConsumerMetadata
                    )
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-4 py-2"
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              {(consumers.length === 0 || !currentCluster) && !error && (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    {!currentCluster
                      ? "Please select a NATS cluster to view consumers"
                      : "No consumers found for this stream"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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

export default function ConsumersPage(): JSX.Element {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Consumers />
    </Suspense>
  );
}
