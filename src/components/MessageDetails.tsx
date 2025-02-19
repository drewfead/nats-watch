"use client";

import { NatsMessage, JetStreamMessage } from "@/types/nats";
import { formatDistanceToNow } from "date-fns";
import Editor from "@monaco-editor/react";
import { useState, ReactNode, JSX } from "react";
import { HeaderPill } from "./HeaderPill";
import { CopyButton } from "./CopyButton";
import {
  JetStreamIcon,
  NewPageLinkIcon,
  CloseIcon,
  ChevronDownIcon,
} from "@/components/icons";
import Link from "next/link";

export interface MessageDetailsProps {
  message: NatsMessage | JetStreamMessage;
  onClose?: () => void;
  embedded?: boolean;
  children?: ReactNode;
}

export function MessageDetails({
  message,
  onClose,
  embedded = false,
  children,
}: MessageDetailsProps): JSX.Element {
  const [showAllHeaders, setShowAllHeaders] = useState(false);
  const isJetStreamMessage = "stream" in message;
  const formattedData = (() => {
    try {
      return JSON.stringify(JSON.parse(message.payload), null, 2);
    } catch {
      return message.payload;
    }
  })();

  const isJson = (() => {
    try {
      JSON.parse(message.payload);
      return true;
    } catch {
      return false;
    }
  })();

  const formattedTime = formatDistanceToNow(new Date(message.timestamp), {
    addSuffix: true,
  });

  const containerClasses = embedded
    ? ""
    : "fixed inset-y-0 right-0 w-full sm:w-[600px] bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300 ease-in-out z-50";

  const overlayClasses = embedded
    ? ""
    : "fixed inset-0 bg-black/30 backdrop-blur-sm z-40";

  const renderHeaderRow = (key: string, values: string[]): JSX.Element => (
    <tr
      key={key}
      className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors duration-150"
    >
      <td className="py-2 px-4 text-sm font-mono text-gray-900 dark:text-white">
        {key}
      </td>
      <td className="py-2 px-4">
        <div className="flex flex-wrap gap-2">
          {values.map((value, index) => (
            <HeaderPill key={`${key}-${index}`} value={value} />
          ))}
        </div>
      </td>
    </tr>
  );

  const renderHeaders = (): JSX.Element | null => {
    if (!message.headers || Object.keys(message.headers).length === 0)
      return null;

    const allHeaders = Object.entries(message.headers);
    const msgId = message.headers["Nats-Msg-Id"];
    const remainingHeaders = allHeaders
      .filter(([key]) => key !== "Nats-Msg-Id")
      .sort(([a], [b]) => a.localeCompare(b));

    const initialHeaders = remainingHeaders.slice(0, 1);
    const hiddenHeaders = remainingHeaders.slice(1);

    return (
      <div className="p-4 border-b dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
          Headers
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/3">
                  Header
                </th>
                <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-2/3">
                  Values
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {msgId && renderHeaderRow("Nats-Msg-Id", msgId)}
              {initialHeaders.map(([key, values]) =>
                renderHeaderRow(key, values)
              )}
              {showAllHeaders &&
                hiddenHeaders.map(([key, values]) =>
                  renderHeaderRow(key, values)
                )}
            </tbody>
          </table>
          {hiddenHeaders.length > 0 && (
            <button
              onClick={() => setShowAllHeaders(!showAllHeaders)}
              className="mt-2 w-full py-2 px-4 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-gray-50/50 dark:hover:bg-gray-700/50 rounded-lg transition-colors duration-150 flex items-center justify-center gap-1"
            >
              {showAllHeaders
                ? "Show fewer headers"
                : `Show ${hiddenHeaders.length} more header${hiddenHeaders.length === 1 ? "" : "s"}`}
              <ChevronDownIcon
                className={`w-4 h-4 transition-transform duration-200 ${showAllHeaders ? "rotate-180" : ""}`}
              />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {!embedded && <div className={overlayClasses} onClick={onClose} />}
      <div className={containerClasses}>
        <div className="h-full flex flex-col">
          <div className="border-b dark:border-gray-700 p-4">
            <div className="flex items-center justify-between min-w-0">
              <div className="flex items-center gap-2 group flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {message.subject}
                </h2>
                <CopyButton
                  value={message.subject}
                  showBackground={false}
                  className="opacity-0 group-hover:opacity-100 flex-shrink-0"
                />
              </div>

              {isJetStreamMessage && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <JetStreamIcon className="w-4 h-4" />
                  <div className="group flex items-center gap-1.5">
                    <span className="font-mono text-gray-700 dark:text-gray-300">
                      #{(message as JetStreamMessage).seq}
                    </span>
                    <CopyButton
                      value={(message as JetStreamMessage).seq.toString()}
                      showBackground={false}
                      className="opacity-0 group-hover:opacity-100"
                    />
                  </div>
                  {!embedded && (
                    <Link
                      href={`/jetstream/${(message as JetStreamMessage).stream}/${(message as JetStreamMessage).seq}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-1 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <NewPageLinkIcon className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              )}

              {!embedded && (
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 flex-shrink-0 ml-4"
                >
                  <CloseIcon className="h-6 w-6" />
                </button>
              )}
            </div>

            <div className="mt-1">
              <div className="flex flex-col text-sm text-gray-500 dark:text-gray-400">
                <time dateTime={message.timestamp} className="leading-none">
                  {formattedTime}
                </time>
                <time
                  dateTime={message.timestamp}
                  className="text-xs font-mono opacity-75 mt-0.5"
                >
                  {new Date(message.timestamp).toISOString()}
                </time>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {renderHeaders()}

            <div className="flex-1">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    Body
                  </h3>
                  <CopyButton
                    value={message.payload}
                    showBackground={false}
                    className="opacity-50 hover:opacity-100"
                    iconClassName="w-5 h-5"
                  />
                </div>
                <div className="rounded-lg overflow-hidden border dark:border-gray-700">
                  {isJson ? (
                    <Editor
                      height="400px"
                      defaultLanguage="json"
                      value={formattedData}
                      theme="vs-dark"
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        lineNumbers: "on",
                        renderLineHighlight: "none",
                        contextmenu: false,
                        folding: true,
                      }}
                    />
                  ) : (
                    <div className="p-3 bg-gray-50 dark:bg-gray-900">
                      <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap overflow-x-auto">
                        {formattedData}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        {children}
      </div>
    </>
  );
}
