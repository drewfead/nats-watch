"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  JSX,
  Suspense,
  useRef,
  useCallback,
} from "react";
import { ClusterConfig, ClusterConnectionStatus } from "@/types/nats";
import {
  isMulticlusterEnabledServer,
  testClusterConnection,
} from "@/actions/clusters";
import { getClusters } from "@/actions/clusters";
import { twMerge } from "tailwind-merge";
import { useSearchParams } from "next/navigation";
import { useClusterNavigation } from "@/hooks/useClusterNavigation";
import { CopyButton } from "@/components/CopyButton";

interface ClusterContextType {
  currentCluster: ClusterConfig | null;
  setCurrentCluster: (cluster: ClusterConfig) => void;
  clusters: ClusterConfig[];
  connectionStatus: ClusterConnectionStatus | null;
  isEnabled: boolean;
  onClusterChange: (callback: () => void) => () => void;
  refreshClusters: () => Promise<void>;
}

const ClusterContext = createContext<ClusterContextType | undefined>(undefined);

export function useCluster(): ClusterContextType {
  const context = useContext(ClusterContext);
  if (context === undefined) {
    throw new Error("useCluster must be used within a ClusterProvider");
  }
  return context;
}

interface ClusterPickerViewProps {
  currentCluster?: ClusterConfig;
  clusters?: ClusterConfig[];
  connectionStatus?: ClusterConnectionStatus;
  isEnabled?: boolean;
  onClusterChange?: (clusterId: string) => void;
  isLoading: boolean;
}

const skeletonClass = "bg-gray-200 dark:bg-gray-600 animate-pulse";

function ClusterPickerView({
  currentCluster,
  clusters,
  connectionStatus,
  isEnabled,
  onClusterChange,
  isLoading,
}: ClusterPickerViewProps): JSX.Element {
  const [showDetails, setShowDetails] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Handle hover events with a small delay to prevent flickering
  const handleMouseEnter = (): void => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setShowDetails(true);
  };

  const handleMouseLeave = (): void => {
    // Small delay before hiding to allow moving to the popover
    timeoutRef.current = setTimeout(() => {
      setShowDetails(false);
    }, 100);
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Special case - show "No clusters configured" message
  if (!isLoading && (!clusters || clusters.length === 0)) {
    return (
      <div className="mx-3 mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <h3 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">
          No NATS Clusters Available
        </h3>
        <p className="text-xs text-red-700 dark:text-red-400">
          Please configure a NATS cluster by setting NATS_URL in the environment
          or adding a cluster in the Clusters section.
        </p>
      </div>
    );
  }

  return (
    <div
      className="mx-3 mb-4 relative"
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Main compact picker */}
      <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50/30 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
        {isLoading ? (
          <div className="flex items-center gap-2 w-full">
            <div className={twMerge("h-2 w-2 rounded-full", skeletonClass)} />
            <div className={twMerge("h-4 w-24 rounded", skeletonClass)} />
          </div>
        ) : (
          <>
            <div
              className={twMerge(
                "w-2 h-2 rounded-full flex-shrink-0",
                connectionStatus?.status === "healthy"
                  ? "bg-green-500"
                  : "bg-red-500"
              )}
            />

            {clusters && clusters.length > 0 && (
              <div
                className={twMerge("flex-grow", !isEnabled ? "opacity-50" : "")}
                onClick={(e) => e.stopPropagation()}
              >
                <select
                  value={currentCluster?.id}
                  onChange={(e) => onClusterChange?.(e.target.value)}
                  disabled={!isEnabled || clusters.length <= 1}
                  className={twMerge(
                    "block w-full text-sm py-1 px-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white",
                    "focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500",
                    !isEnabled && "cursor-not-allowed"
                  )}
                >
                  {clusters.map((cluster) => (
                    <option key={cluster.id} value={cluster.id}>
                      {cluster.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}
      </div>

      {/* Popover with connection details */}
      {showDetails && !isLoading && currentCluster && (
        <div
          className="absolute top-full left-0 right-0 mt-1 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Connection Status
              </span>
              <span
                className={`text-xs font-medium ${connectionStatus?.status === "healthy" ? "text-green-500" : "text-red-500"}`}
              >
                {connectionStatus?.status === "healthy" ? "Connected" : "Error"}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Server URL
                </span>
                <CopyButton
                  value={currentCluster.url}
                  iconClassName="w-3.5 h-3.5"
                  showBackground={false}
                />
              </div>
              <div
                className="font-mono text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-1.5 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto whitespace-nowrap"
                title={currentCluster.url}
              >
                <span className="select-all">{currentCluster.url}</span>
              </div>
            </div>

            {connectionStatus?.error && (
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Error Details
                  </span>
                  <CopyButton
                    value={connectionStatus.error}
                    iconClassName="w-3.5 h-3.5"
                    showBackground={false}
                  />
                </div>
                <div className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 p-1.5 rounded border border-red-100 dark:border-red-900/30">
                  {connectionStatus.error}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ClusterPicker(): JSX.Element {
  const { clusters } = useCluster();

  // If clusters is empty array (not undefined), show the "no clusters" state
  if (Array.isArray(clusters) && clusters.length === 0) {
    return (
      <div className="mx-3 mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <h3 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">
          No NATS Clusters Available
        </h3>
        <p className="text-xs text-red-700 dark:text-red-400">
          Please configure a NATS cluster by setting NATS_URL in the environment
          or adding a cluster in the Clusters section.
        </p>
      </div>
    );
  }

  // Otherwise show the full content with Suspense for loading
  return (
    <Suspense fallback={<ClusterPickerView isLoading={true} />}>
      <ClusterPickerContent />
    </Suspense>
  );
}

// Content of the ClusterPicker with all the logic
function ClusterPickerContent(): JSX.Element {
  const {
    currentCluster,
    setCurrentCluster,
    clusters,
    connectionStatus,
    isEnabled,
  } = useCluster();
  const { updateCluster } = useClusterNavigation();
  const clusterChangeHandled = useRef(false);

  const handleClusterChange = (clusterId: string): void => {
    if (clusterChangeHandled.current) return;
    clusterChangeHandled.current = true;

    const cluster = clusters.find((c) => c.id === clusterId);
    if (cluster) {
      updateCluster(clusterId);
      void setCurrentCluster(cluster);
    }

    // Reset the flag after a brief delay
    setTimeout(() => {
      clusterChangeHandled.current = false;
    }, 100);
  };

  // Check if we're waiting for data
  const isLoading = clusters === undefined || connectionStatus === null;

  // Special case - no clusters configured but multicluster is disabled
  if (
    !isLoading &&
    !isEnabled &&
    clusters.length > 0 &&
    !clusters.find((c) => c.isDefault)
  ) {
    return (
      <div className="mx-3 mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <h3 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">
          No Default NATS Cluster
        </h3>
        <p className="text-xs text-red-700 dark:text-red-400">
          Multi-cluster support is disabled, but no default cluster is
          configured. Please set a default cluster in the Clusters section or
          configure NATS_URL in the environment.
        </p>
      </div>
    );
  }

  return (
    <ClusterPickerView
      currentCluster={currentCluster ?? undefined}
      clusters={clusters}
      connectionStatus={connectionStatus ?? undefined}
      isEnabled={isEnabled}
      onClusterChange={handleClusterChange}
      isLoading={isLoading}
    />
  );
}

export function ClusterProvider({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const [currentCluster, setCurrentCluster] = useState<ClusterConfig | null>(
    null
  );
  const [clusters, setClusters] = useState<ClusterConfig[]>([]);
  const [connectionStatus, setConnectionStatus] =
    useState<ClusterConnectionStatus | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const providerMountedRef = useRef(false);
  const initialLoadCompleteRef = useRef(false);
  const clusterChangeCallbacks = React.useRef<Set<() => void>>(new Set());

  // Set the provider as mounted after first render
  useEffect(() => {
    providerMountedRef.current = true;
  }, []);

  const handleSetCurrentCluster = useCallback(
    async (cluster: ClusterConfig): Promise<void> => {
      setCurrentCluster(cluster);
      const status = await testClusterConnection({
        name: cluster.name,
        url: cluster.url,
        auth: cluster.auth,
        isDefault: cluster.isDefault ?? false,
      });
      setConnectionStatus(status);

      clusterChangeCallbacks.current.forEach((callback) => callback());
    },
    [setCurrentCluster, setConnectionStatus]
  );

  // Function to refresh the clusters list
  const refreshClusters = useCallback(async (): Promise<void> => {
    try {
      // Load multiCluster enabled status
      const multiClusterEnabled = await isMulticlusterEnabledServer();
      setIsEnabled(multiClusterEnabled);

      // Load and process clusters
      const loadedClusters = await getClusters();
      setClusters(loadedClusters);

      // Always mark as loaded after processing clusters, even if empty
      initialLoadCompleteRef.current = true;

      // If there are no clusters, reset the selected cluster
      if (loadedClusters.length === 0) {
        setCurrentCluster(null);
        setConnectionStatus(null);
        return;
      }

      // If the currently selected cluster no longer exists, select a new one
      if (
        currentCluster &&
        !loadedClusters.find((c) => c.id === currentCluster.id)
      ) {
        const defaultCluster = loadedClusters.find((c) => c.isDefault);
        if (defaultCluster) {
          await handleSetCurrentCluster(defaultCluster);
        } else if (loadedClusters.length > 0) {
          await handleSetCurrentCluster(loadedClusters[0]);
        } else {
          setCurrentCluster(null);
          setConnectionStatus(null);
        }
      }
      // If we didn't have a cluster selected before but now we do, select one
      else if (!currentCluster && loadedClusters.length > 0) {
        const defaultCluster = loadedClusters.find((c) => c.isDefault);
        if (defaultCluster) {
          await handleSetCurrentCluster(defaultCluster);
        } else {
          await handleSetCurrentCluster(loadedClusters[0]);
        }
      }
    } catch (error) {
      console.error("Failed to refresh clusters:", error);
      // Even on error, mark as complete to avoid infinite loading
      initialLoadCompleteRef.current = true;
      // Ensure clusters is set to empty array on error
      setClusters([]);
    }
  }, [currentCluster, handleSetCurrentCluster]);

  // This component extracts the useSearchParams logic into a separate component
  // that can be wrapped in Suspense
  function SearchParamsHandler(): React.ReactNode {
    const searchParams = useSearchParams();
    const { updateCluster } = useClusterNavigation();
    const [noClusterConfigured, setNoClusterConfigured] = useState(false);

    // Load clusters once on mount, independent of searchParams
    useEffect(() => {
      if (initialLoadCompleteRef.current) {
        return;
      }

      const loadInitialClusters = async (): Promise<void> => {
        try {
          // Load multiCluster enabled status
          const multiClusterEnabled = await isMulticlusterEnabledServer();
          setIsEnabled(multiClusterEnabled);

          // Load and process clusters
          const loadedClusters = await getClusters();

          // Handle case where no clusters are configured - ALWAYS mark as complete
          if (loadedClusters.length === 0) {
            setNoClusterConfigured(true);
            setClusters([]);
            setConnectionStatus(null);
            initialLoadCompleteRef.current = true;
            return;
          }

          // Set available clusters
          setClusters(loadedClusters);

          // Select a cluster
          const urlClusterId = searchParams.get("cluster");
          const defaultCluster = loadedClusters.find((c) => c.isDefault);

          const selectedCluster =
            (urlClusterId &&
              loadedClusters.find((c) => c.id === urlClusterId)) ||
            defaultCluster ||
            loadedClusters[0];

          if (selectedCluster) {
            setCurrentCluster(selectedCluster);
            const status = await testClusterConnection({
              name: selectedCluster.name,
              url: selectedCluster.url,
              auth: selectedCluster.auth,
              isDefault: selectedCluster.isDefault ?? false,
            });
            setConnectionStatus(status);
          }

          // Mark initial load as complete
          initialLoadCompleteRef.current = true;
        } catch (error) {
          console.error("Error loading clusters:", error);
          setClusters([]);
          initialLoadCompleteRef.current = true;
        }
      };

      void loadInitialClusters();
    }, [searchParams, updateCluster]);

    // Display error message if no cluster configured
    if (noClusterConfigured) {
      return (
        <div className="mx-3 mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <h3 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">
            No NATS Cluster Configured
          </h3>
          <p className="text-xs text-red-700 dark:text-red-400">
            Please configure a NATS cluster by setting NATS_URL in the
            environment or adding a cluster in the Clusters section.
          </p>
        </div>
      );
    }

    return <></>;
  }

  const onClusterChange = React.useCallback((callback: () => void) => {
    clusterChangeCallbacks.current.add(callback);
    return () => {
      clusterChangeCallbacks.current.delete(callback);
    };
  }, []);

  // Only update the context value when necessary using a memoized value
  const contextValue = React.useMemo(
    () => ({
      currentCluster,
      setCurrentCluster: handleSetCurrentCluster,
      clusters,
      connectionStatus,
      isEnabled,
      onClusterChange,
      refreshClusters,
    }),
    [
      currentCluster,
      clusters,
      connectionStatus,
      isEnabled,
      onClusterChange,
      refreshClusters,
      handleSetCurrentCluster,
    ]
  );

  return (
    <ClusterContext.Provider value={contextValue}>
      {/* Always include SearchParamsHandler until initial load is complete */}
      {!initialLoadCompleteRef.current && (
        <Suspense fallback={<ClusterPickerView isLoading={true} />}>
          <SearchParamsHandler />
        </Suspense>
      )}
      {children}
    </ClusterContext.Provider>
  );
}
