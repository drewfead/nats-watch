"use client";

import { JSX, Suspense, useState, useEffect } from "react";
import { StreamPicker } from "@/components/StreamPicker";
import { useRouter, useSearchParams } from "next/navigation";
import { useCluster } from "@/components/ClusterPicker";

// Separate component for the content
function ConsumersHubContent(): JSX.Element {
  const router = useRouter();
  const { currentCluster } = useCluster();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  // Check for error in URL parameters
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    } else {
      setError(null);
    }
  }, [searchParams]);

  return (
    <div className="space-y-8">
      {error && (
        <div className="p-4 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-700 dark:text-red-400 text-sm">
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
        <div className="p-4 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-700 dark:text-blue-400 text-sm">
          <div className="font-semibold mb-1">No NATS Cluster Selected</div>
          <div>
            Please select a NATS cluster from the sidebar to view consumers.
          </div>
        </div>
      )}

      <div className="w-1/3">
        <StreamPicker
          selectedStream=""
          onStreamSelected={(stream) => {
            router.replace(`/consumers/${stream.name}`);
          }}
          onError={setError}
        />
      </div>
      <div className="text-gray-500 dark:text-gray-400">
        {currentCluster
          ? "Select a stream to view its consumers"
          : "Select a NATS cluster first"}
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function ConsumersHubPage(): JSX.Element {
  return (
    <Suspense fallback={<div>Loading streams...</div>}>
      <ConsumersHubContent />
    </Suspense>
  );
}
