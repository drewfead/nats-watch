"use server";

import { safeAutoImportNatsConfigurations } from "@/lib/nats-server-ops-safe";
import { getAutoImportPath, isAutoImportEnabled } from "@/lib/feature";

// Keep track of whether auto-import has already been executed to avoid duplication
let autoImportExecuted = false;

export async function triggerAutoImport(): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  console.log("AUTO IMPORT: Trigger function called");

  try {
    // Check if auto-import is enabled
    if (!isAutoImportEnabled(process.env)) {
      console.log("AUTO IMPORT: Auto-import is not enabled");
      return {
        success: false,
        error: "Auto-import is not enabled",
      };
    }

    // Check if auto-import already executed in this server instance
    if (autoImportExecuted) {
      console.log(
        "AUTO IMPORT: Auto-import already executed in this server instance"
      );
      return {
        success: true,
        message: "Auto-import already executed in this server instance",
      };
    }

    console.log("AUTO IMPORT: Starting auto-import process");
    console.log(
      `AUTO IMPORT: Environment variables: NATS_CLUSTER_AUTO_IMPORT=${process.env.NATS_CLUSTER_AUTO_IMPORT}, NATS_CLUSTER_AUTO_IMPORT_PATH=${process.env.NATS_CLUSTER_AUTO_IMPORT_PATH}`
    );

    // Get the auto-import path
    const importPath = getAutoImportPath(process.env);

    // Try to import the configurations
    try {
      console.log(
        `AUTO IMPORT: Calling safeAutoImportNatsConfigurations with path: ${importPath || "default"}`
      );
      await safeAutoImportNatsConfigurations(importPath);

      // Mark as executed
      autoImportExecuted = true;

      console.log("AUTO IMPORT: Successfully imported NATS configurations");
      return {
        success: true,
        message: "Auto-import completed successfully",
      };
    } catch (error: unknown) {
      // Special handling for Node.js module errors which indicate
      // that auto-import is not supported in this environment
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (
        errorMessage.includes("Cannot find module") &&
        errorMessage.includes("nats-server-ops")
      ) {
        console.log(
          "AUTO IMPORT: Auto-import not supported in this environment (Module not found)"
        );
        return {
          success: false,
          error: "Auto-import not supported in this environment",
        };
      }

      console.error("AUTO IMPORT: Error during auto-import:", error);
      return {
        success: false,
        error: `Error during auto-import: ${errorMessage}`,
      };
    }
  } catch (error: unknown) {
    console.error("AUTO IMPORT: Unexpected error in triggerAutoImport:", error);
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
