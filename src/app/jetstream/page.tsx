"use client";

import { JSX, useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getStreams } from "@/actions/streams";
import { StreamMetadata } from "@/types/nats";
import { Refresher } from "@/components/Refresher";
import { CopyButton } from "@/components/CopyButton";
import Link from "next/link";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  type Header,
} from "@tanstack/react-table";
import { SortIcon, NewPageLinkIcon } from "@/components/icons";
import { useCluster } from "@/components/ClusterPicker";
import { useClusterNavigation } from "@/hooks/useClusterNavigation";

const HeaderCell = ({
  header,
  align = "left",
}: {
  header: Header<StreamMetadata, unknown>;
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

const SubjectItem = ({ subject }: { subject: string }): JSX.Element => (
  <div className="group relative min-w-0">
    <div className="flex items-center gap-1.5 h-6">
      <div className="min-w-0 max-w-[calc(100%-24px)]">
        <div className="inline-block border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5 text-sm max-w-full">
          <div className="truncate" title={subject}>
            {subject}
          </div>
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

const SubjectsCell = ({ value }: { value: string[] }): JSX.Element => (
  <div className="flex flex-col gap-1.5">
    {value.map((subject, index) => (
      <SubjectItem key={index} subject={subject} />
    ))}
  </div>
);

const StreamCell = ({ name }: { name: string }): JSX.Element => {
  const { navigateWithCluster } = useClusterNavigation();
  const handleClick = (e: React.MouseEvent): void => {
    e.preventDefault();
    navigateWithCluster(`/jetstream/${name}`);
  };

  return (
    <div className="flex items-center gap-1.5 group">
      <Link
        href="#"
        onClick={handleClick}
        className="hover:text-blue-500 dark:hover:text-blue-400 truncate"
        title={name}
      >
        {name}
      </Link>
      <CopyButton
        value={name}
        className="opacity-0 group-hover:opacity-100 shrink-0"
        showBackground={false}
        onClick={(e) => e.stopPropagation()}
      />
      <Link
        href="#"
        onClick={handleClick}
        className="opacity-0 group-hover:opacity-100 shrink-0 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        title="View stream details"
      >
        <NewPageLinkIcon className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
      </Link>
    </div>
  );
};

const columnHelper = createColumnHelper<StreamMetadata>();

const columns = [
  columnHelper.accessor("name", {
    header: "Stream",
    cell: (info) => <StreamCell name={info.getValue()} />,
    size: 200,
  }),
  columnHelper.accessor("subjectPrefixes", {
    header: "Subject Prefixes",
    cell: (info) => <SubjectsCell value={info.getValue()} />,
    size: 240,
  }),
  columnHelper.accessor("description", {
    header: "Description",
    cell: (info) => (
      <div
        className="truncate text-gray-600 dark:text-gray-400"
        title={info.getValue() || ""}
      >
        {info.getValue() || "—"}
      </div>
    ),
    size: 300,
  }),
];

function JetstreamHub(): JSX.Element {
  const [streams, setStreams] = useState<StreamMetadata[]>([]);
  const [error, setError] = useState<string>("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const searchParams = useSearchParams();
  const { currentCluster } = useCluster();

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
  }, [searchParams]);

  const fetchStreams = useCallback(async (): Promise<void> => {
    const result = await getStreams(currentCluster?.id);
    if (result.success) {
      setStreams(result.data || []);
      setError("");
    } else {
      setError(result.error || "Failed to fetch streams");
      setStreams([]);
    }
  }, [currentCluster?.id]);

  // Fetch streams when component mounts or when cluster changes
  useEffect(() => {
    if (currentCluster) {
      void fetchStreams();
    } else {
      setStreams([]); // Only clear streams if there's no cluster
    }
  }, [currentCluster, fetchStreams]);

  const table = useReactTable({
    data: streams,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">JetStream Streams</h1>
        <Refresher onRefresh={fetchStreams} />
      </div>

      {error && (
        <div className="p-4 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-700 dark:text-red-400 text-sm mb-4">
          <div className="font-semibold mb-1">Error:</div>
          <div>{error}</div>
          {error.includes("No NATS clusters configured") && (
            <div className="mt-2">
              Please select a NATS cluster from the sidebar or add a new cluster
              in the Clusters section.
            </div>
          )}
        </div>
      )}

      {!currentCluster && !error && (
        <div className="p-4 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-700 dark:text-blue-400 text-sm mb-4">
          <div className="font-semibold mb-1">No NATS Cluster Selected</div>
          <div>
            Please select a NATS cluster from the sidebar to view JetStream
            streams.
          </div>
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
                className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-4 py-2"
                    style={{ width: cell.column.getSize() }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {streams.length === 0 && !error && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  No streams found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function JetstreamHubPage(): JSX.Element {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <JetstreamHub />
    </Suspense>
  );
}
