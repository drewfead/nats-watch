"use client";

import { JSX, useState, useEffect, Suspense } from "react";
import {
  isMulticlusterEnabledServer,
  getClusters,
  addCluster,
  removeCluster,
  updateCluster,
  importFromNatsCli,
  importClusters,
  testClusterConnection,
} from "@/actions/clusters";
import {
  ClusterConfig,
  ClusterConfigParameters,
  ClusterConnectionStatus,
} from "@/types/nats";
import {
  CloseIcon,
  DirectoryIcon,
  StarIcon,
  EditIcon,
  TestIcon,
} from "@/components/icons";
import { AutoImportBannerClient } from "@/components/AutoImportBannerClient";
import { useCluster } from "@/components/ClusterPicker";

function ImportDialog({
  onSubmit,
  onCancel,
}: {
  onSubmit: (clusters: ClusterConfigParameters[]) => void;
  onCancel: () => void;
}): JSX.Element {
  const [step, setStep] = useState<"location" | "selection">("location");
  const [useCustomPath, setUseCustomPath] = useState(false);
  const [customPath, setCustomPath] = useState("");
  const [availableClusters, setAvailableClusters] = useState<
    ClusterConfigParameters[]
  >([]);
  const [selectedClusters, setSelectedClusters] = useState<Set<string>>(
    new Set()
  );
  const [scanning, setScanning] = useState(false);
  const [testResults, setTestResults] = useState<
    Record<string, ClusterConnectionStatus>
  >({});
  const [testing, setTesting] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string>("");
  const [existingClusters, setExistingClusters] = useState<ClusterConfig[]>([]);

  useEffect(() => {
    const loadExistingClusters = async (): Promise<void> => {
      try {
        const clusters = await getClusters();
        setExistingClusters(clusters);
      } catch (error) {
        console.error("Error loading existing clusters:", error);
      }
    };

    void loadExistingClusters();
  }, []);

  const handleScan = async (): Promise<void> => {
    setScanning(true);
    setError("");
    try {
      // Only pass customPath if useCustomPath is true
      const pathToScan = useCustomPath ? customPath : undefined;
      const result = await importFromNatsCli(pathToScan);

      if (result.success && result.clusters) {
        // Filter out clusters that already exist with identical configuration
        const newClusters = result.clusters.filter((newCluster) => {
          return !existingClusters.some(
            (existing) =>
              existing.name === newCluster.name &&
              existing.url === newCluster.url &&
              existing.credsPath === newCluster.credsPath
          );
        });

        if (newClusters.length === 0) {
          setError("No new clusters found to import");
          return;
        }

        setAvailableClusters(newClusters);
        setStep("selection");
      } else {
        setError(result.error || "No clusters found");
      }
    } catch (error) {
      console.error("Error scanning:", error);
      setError("Failed to scan for NATS configurations");
    } finally {
      setScanning(false);
    }
  };

  const handleBrowseClick = (): void => {
    const input = document.createElement("input");
    input.type = "file";
    input.setAttribute("webkitdirectory", "true");
    input.setAttribute("directory", "true");

    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        try {
          const filePath = files[0].webkitRelativePath;
          if (filePath) {
            const dirPath = filePath.split("/").slice(0, -1).join("/");
            if (dirPath) {
              setCustomPath(dirPath);
            }
          }
        } catch (err) {
          console.error("Error accessing file path:", err);
        }
      }
    };

    input.click();
  };

  const handleTestConnection = async (
    cluster: ClusterConfigParameters
  ): Promise<void> => {
    setTesting((prev) => new Set([...prev, cluster.name]));
    try {
      const result = await testClusterConnection(cluster);
      setTestResults((prev) => ({
        ...prev,
        [cluster.name]: result,
      }));
    } catch (error) {
      setTestResults((prev) => ({
        ...prev,
        [cluster.name]: {
          name: cluster.name,
          url: cluster.url,
          status: "unhealthy",
          error: error instanceof Error ? error.message : "Unknown error",
        },
      }));
    } finally {
      setTesting((prev) => {
        const next = new Set(prev);
        next.delete(cluster.name);
        return next;
      });
    }
  };

  const handleToggleCluster = (name: string): void => {
    const newSelected = new Set(selectedClusters);
    if (newSelected.has(name)) {
      newSelected.delete(name);
    } else {
      newSelected.add(name);
    }
    setSelectedClusters(newSelected);
  };

  const handleImport = (): void => {
    const selectedConfigs = availableClusters.filter((c) =>
      selectedClusters.has(c.name)
    );
    onSubmit(selectedConfigs);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-5xl min-h-[32rem] flex flex-col">
        <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-6">
          Import NATS Configurations
        </h2>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {step === "location" && (
          <div className="flex-1 flex flex-col">
            <div className="flex-1">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md border border-blue-100 dark:border-blue-800/30 mb-6">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                  About NATS Configuration Scanning
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-400 mb-2">
                  By default, we&apos;ll scan the standard NATS configuration
                  locations:
                </p>
                <ul className="list-disc pl-5 text-sm text-blue-700 dark:text-blue-400 space-y-1">
                  <li>~/.config/nats</li>
                  <li>/etc/nats</li>
                </ul>
              </div>

              <div className="mb-6">
                <div className="flex items-center mb-4">
                  <input
                    id="use-custom-path"
                    type="checkbox"
                    checked={useCustomPath}
                    onChange={(e) => setUseCustomPath(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                  />
                  <label
                    htmlFor="use-custom-path"
                    className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Use custom configuration path
                  </label>
                </div>

                {useCustomPath && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Custom Path
                    </label>
                    <div className="flex items-stretch shadow-sm">
                      <div className="relative flex-grow">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <DirectoryIcon
                            variant="folder-open"
                            className="h-5 w-5 text-gray-400 dark:text-gray-500"
                          />
                        </div>
                        <input
                          type="text"
                          value={customPath}
                          onChange={(e) => setCustomPath(e.target.value)}
                          placeholder="/path/to/nats/config"
                          className="block w-full rounded-l-md border-gray-300 dark:border-gray-600 pl-10 pr-3 py-2.5 focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm font-mono"
                          spellCheck="false"
                          autoComplete="off"
                        />
                        {customPath && (
                          <button
                            type="button"
                            onClick={() => setCustomPath("")}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                          >
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleBrowseClick}
                        className="inline-flex items-center px-4 py-2.5 border border-l-0 border-gray-300 dark:border-gray-600 text-sm font-medium rounded-r-md text-gray-700 dark:text-gray-200 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                      >
                        <DirectoryIcon
                          variant="folder-plus"
                          className="mr-2 h-4 w-4"
                        />
                        Browse
                      </button>
                    </div>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Enter a directory path to scan for NATS configurations, or
                      a path to a specific .json configuration file.
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleScan}
                disabled={scanning || (useCustomPath && !customPath)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {scanning ? "Scanning..." : "Scan"}
              </button>
            </div>
          </div>
        )}

        {step === "selection" && (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto -mx-6 px-6">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                  <tr>
                    <th className="w-6 px-1 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      &nbsp;
                    </th>
                    <th className="w-48 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="w-64 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      URL
                    </th>
                    <th className="w-16 px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {availableClusters.map((cluster) => (
                    <tr key={cluster.name}>
                      <td className="px-1 py-4 whitespace-nowrap">
                        <div className="flex justify-end">
                          <input
                            type="checkbox"
                            checked={selectedClusters.has(cluster.name)}
                            onChange={() => handleToggleCluster(cluster.name)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {cluster.name}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <div className="truncate" title={cluster.url}>
                          {cluster.url}
                        </div>
                      </td>
                      <td className="px-2 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => handleTestConnection(cluster)}
                            disabled={testing.has(cluster.name)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed relative"
                            title={
                              testing.has(cluster.name)
                                ? "Testing connection..."
                                : "Test connection"
                            }
                          >
                            <TestIcon />
                            {testResults[cluster.name] && (
                              <span
                                className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
                                  testResults[cluster.name].status === "healthy"
                                    ? "bg-green-500"
                                    : "bg-red-500"
                                }`}
                                title={
                                  testResults[cluster.name].status === "healthy"
                                    ? "Connected"
                                    : testResults[cluster.name].error
                                }
                              />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2 pt-4 mt-auto">
              <button
                type="button"
                onClick={() => setStep("location")}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={selectedClusters.size === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import Selected
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ClusterForm({
  onSubmit,
  initialData,
  onCancel,
}: {
  onSubmit: (data: ClusterConfigParameters) => void;
  initialData?: ClusterConfig;
  onCancel: () => void;
}): JSX.Element {
  const [formData, setFormData] = useState<ClusterConfigParameters>({
    name: initialData?.name || "",
    url: initialData?.url || "",
    credsPath: initialData?.credsPath || "",
    isDefault: initialData?.isDefault || false,
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(formData);
      }}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Name
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          URL
        </label>
        <input
          type="text"
          value={formData.url}
          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Credentials Path
        </label>
        <input
          type="text"
          value={formData.credsPath}
          onChange={(e) =>
            setFormData({ ...formData, credsPath: e.target.value })
          }
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
        />
      </div>
      <div className="flex items-center">
        <input
          type="checkbox"
          checked={formData.isDefault}
          onChange={(e) =>
            setFormData({ ...formData, isDefault: e.target.checked })
          }
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
        />
        <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
          Set as default cluster
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {initialData ? "Update" : "Add"} Cluster
        </button>
      </div>
    </form>
  );
}

// Separate component for the main content that might indirectly use useSearchParams
function ClustersContent(): JSX.Element {
  const [clusters, setClusters] = useState<ClusterConfig[]>([]);
  const [error, setError] = useState<string>("");
  const [isAddingCluster, setIsAddingCluster] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [editingCluster, setEditingCluster] = useState<ClusterConfig | null>(
    null
  );
  const [isEnabled, setIsEnabled] = useState(false);
  const [testingClusters, setTestingClusters] = useState<Set<string>>(
    new Set()
  );
  const [connectionStatus, setConnectionStatus] = useState<
    Record<string, ClusterConnectionStatus>
  >({});
  const { refreshClusters } = useCluster();

  useEffect(() => {
    const loadClusters = async (): Promise<void> => {
      const enabled = await isMulticlusterEnabledServer();
      setIsEnabled(enabled);

      if (!enabled) {
        return;
      }

      // Load clusters
      try {
        const result = await getClusters();
        setClusters(result);
      } catch (error) {
        console.error("Error loading clusters:", error);
        setError("Failed to load clusters");
      }
    };

    void loadClusters();
  }, []);

  const handleAddCluster = async (
    data: ClusterConfigParameters
  ): Promise<void> => {
    const result = await addCluster(data);
    if (result.success) {
      const updatedClusters = await getClusters();
      setClusters(updatedClusters);
      setIsAddingCluster(false);
      setError("");
      // Refresh the clusters in the ClusterPicker
      await refreshClusters();
    } else {
      setError(result.error || "Failed to add cluster");
    }
  };

  const handleUpdateCluster = async (
    data: ClusterConfigParameters
  ): Promise<void> => {
    if (!editingCluster) return;

    const result = await updateCluster(editingCluster.id, data);
    if (result.success) {
      const updatedClusters = await getClusters();
      setClusters(updatedClusters);
      setEditingCluster(null);
      setError("");
      // Refresh the clusters in the ClusterPicker
      await refreshClusters();
    } else {
      setError(result.error || "Failed to update cluster");
    }
  };

  const handleRemoveCluster = async (id: string): Promise<void> => {
    const result = await removeCluster(id);
    if (result.success) {
      const updatedClusters = await getClusters();
      setClusters(updatedClusters);
      setError("");
      // Refresh the clusters in the ClusterPicker
      await refreshClusters();
    } else {
      setError(result.error || "Failed to remove cluster");
    }
  };

  const handleImportClusters = async (
    selectedClusters: ClusterConfigParameters[]
  ): Promise<void> => {
    const result = await importClusters(selectedClusters);
    if (result.success) {
      const updatedClusters = await getClusters();
      setClusters(updatedClusters);
      setError("");
      setIsImporting(false);
      // Refresh the clusters in the ClusterPicker
      await refreshClusters();
    } else {
      setError(result.error || "Failed to import clusters");
    }
  };

  const handleTestClusterConnection = async (
    cluster: ClusterConfig
  ): Promise<void> => {
    try {
      setTestingClusters((prev) => new Set([...prev, cluster.id]));
      const status = await testClusterConnection({
        name: cluster.name,
        url: cluster.url,
        credsPath: cluster.credsPath,
        isDefault: cluster.isDefault ?? false,
      });
      setConnectionStatus((prev) => ({
        ...prev,
        [cluster.id]: status,
      }));

      // Refresh clusters in ClusterPicker if this is the currently selected cluster
      // This ensures the connection status is updated everywhere
      await refreshClusters();
    } catch (error) {
      console.error("Failed to test connection:", error);
    } finally {
      setTestingClusters((prev) => {
        const newSet = new Set(prev);
        newSet.delete(cluster.id);
        return newSet;
      });
    }
  };

  if (!isEnabled) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
          Cluster Configuration
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Multi-cluster support is not enabled. Set MULTICLUSTER_ENABLED=true in
          your environment to enable this feature.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Cluster Configuration
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setIsImporting(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <DirectoryIcon variant="folder-plus" className="mr-2 h-4 w-4" />
            Import from NATS CLI
          </button>
          <button
            onClick={() => setIsAddingCluster(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Add Cluster
          </button>
        </div>
      </div>

      {/* Display auto-import banner if enabled */}
      <AutoImportBannerClient />

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg p-4 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {isImporting && (
        <ImportDialog
          onSubmit={handleImportClusters}
          onCancel={() => setIsImporting(false)}
        />
      )}

      {isAddingCluster && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Add New Cluster
          </h2>
          <ClusterForm
            onSubmit={handleAddCluster}
            onCancel={() => setIsAddingCluster(false)}
          />
        </div>
      )}

      {editingCluster && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Edit Cluster
          </h2>
          <ClusterForm
            initialData={editingCluster}
            onSubmit={handleUpdateCluster}
            onCancel={() => setEditingCluster(null)}
          />
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                URL
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Credentials Path
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {clusters.map((cluster) => (
              <tr key={cluster.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  <div className="flex items-center gap-2">
                    {cluster.isDefault && (
                      <StarIcon className="w-4 h-4 text-yellow-500" />
                    )}
                    {cluster.name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {cluster.url}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {cluster.credsPath || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={() => setEditingCluster(cluster)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      title="Edit cluster"
                    >
                      <EditIcon />
                    </button>
                    <button
                      onClick={() => handleTestClusterConnection(cluster)}
                      disabled={testingClusters.has(cluster.id)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed relative"
                      title="Test connection"
                    >
                      <TestIcon />
                      {connectionStatus[cluster.id] && (
                        <span
                          className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
                            connectionStatus[cluster.id].status === "healthy"
                              ? "bg-green-500"
                              : "bg-red-500"
                          }`}
                          title={
                            connectionStatus[cluster.id].status === "healthy"
                              ? "Connected"
                              : connectionStatus[cluster.id].error
                          }
                        />
                      )}
                    </button>
                    <button
                      onClick={() => handleRemoveCluster(cluster.id)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      title="Remove cluster"
                    >
                      <CloseIcon className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function ClustersPage(): JSX.Element {
  return (
    <Suspense fallback={<div>Loading clusters...</div>}>
      <ClustersContent />
    </Suspense>
  );
}
