"use client";

import React, { useEffect, useState } from "react";
import {
  isAutoImportEnabledServer,
  getAutoImportPathServer,
} from "@/actions/clusters";

export function AutoImportBannerClient(): React.ReactNode {
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [importPath, setImportPath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAutoImport = async (): Promise<void> => {
      try {
        const enabled = await isAutoImportEnabledServer();
        setIsEnabled(enabled);

        if (enabled) {
          const path = await getAutoImportPathServer();
          setImportPath(path || null);
        }
      } catch (error) {
        console.error("Error checking auto-import status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    void checkAutoImport();
  }, []);

  if (isLoading || !isEnabled) {
    return null;
  }

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-3 mb-4 text-sm text-blue-700 dark:text-blue-300 flex items-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 mr-2 text-blue-500 dark:text-blue-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <div>
        <span className="font-medium">Auto-import enabled.</span> NATS
        configurations are being automatically imported from:
        <code className="ml-1 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-800/50 rounded font-mono text-xs">
          {importPath || "default locations"}
        </code>
      </div>
    </div>
  );
}
