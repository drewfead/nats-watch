import { JSX } from "react";
import { ConsumerMetadata } from "@/types/nats";
import { CopyButton } from "@/components/CopyButton";

interface ConsumerDetailsProps {
  consumer: ConsumerMetadata;
  onClose: () => void;
}

export function ConsumerDetails({
  consumer,
  onClose,
}: ConsumerDetailsProps): JSX.Element {
  return (
    <div className="h-full bg-white dark:bg-gray-800 shadow-xl overflow-auto">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Consumer Details
            </h2>
            <CopyButton value={consumer.name} showBackground={false} />
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="px-6 py-4 space-y-6">
        <section>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
            Configuration
          </h3>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-gray-500 dark:text-gray-400">Type</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {consumer.durability === "durable" ? "Durable" : "Ephemeral"}{" "}
                {consumer.flow === "push" ? "Push" : "Pull"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500 dark:text-gray-400">
                Stream
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white flex items-center gap-2">
                {consumer.stream}
                <CopyButton
                  value={consumer.stream}
                  showBackground={false}
                  iconClassName="w-3.5 h-3.5"
                />
              </dd>
            </div>
          </dl>
        </section>

        <section>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
            Filter Subjects
          </h3>
          <div className="space-y-2">
            {consumer.filterSubjects.length > 0 ? (
              consumer.filterSubjects.map((subject, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-sm text-gray-900 dark:text-white"
                >
                  <span className="flex-1 font-mono">{subject}</span>
                  <CopyButton
                    value={subject}
                    showBackground={false}
                    iconClassName="w-3.5 h-3.5"
                  />
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No filter subjects configured
              </p>
            )}
          </div>
        </section>

        <section>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
            Statistics
          </h3>
          <dl className="grid grid-cols-3 gap-4">
            <div>
              <dt className="text-sm text-gray-500 dark:text-gray-400">
                Unprocessed
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white tabular-nums">
                {consumer.unprocessedCount.toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500 dark:text-gray-400">
                Pending Acks
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white tabular-nums">
                {consumer.ackPendingCount.toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500 dark:text-gray-400">
                Waiting
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white tabular-nums">
                {consumer.waitingCount.toLocaleString()}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
