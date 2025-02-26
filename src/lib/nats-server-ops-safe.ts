/**
 * This file provides a safe wrapper around NATS server operations
 * that handles Node.js module errors gracefully.
 */

// Safely import the NATS server operations
let natsServerOps: {
  autoImportNatsConfigurations: (importPath?: string) => Promise<void>;
} | null = null;

// Initialize the NATS server operations
async function initNatsServerOps(): Promise<void> {
  console.log("SAFE-OPS: Initializing NATS server operations");
  try {
    // Dynamic import to prevent build-time errors
    const natsOps = await import("./nats-server-ops");
    natsServerOps = natsOps;
    console.log("SAFE-OPS: Successfully imported NATS server operations");
  } catch (error) {
    console.warn(
      "SAFE-OPS: NATS server operations are not available in this environment:",
      error
    );
  }
}

/**
 * Safely executes the auto-import NATS configurations function
 */
export async function safeAutoImportNatsConfigurations(
  importPath?: string
): Promise<void> {
  console.log(
    `SAFE-OPS: Called safeAutoImportNatsConfigurations with path: ${importPath || "default"}`
  );

  if (!natsServerOps) {
    console.log(
      "SAFE-OPS: NATS server operations not initialized, initializing now"
    );
    await initNatsServerOps();

    if (!natsServerOps) {
      console.error("SAFE-OPS: Failed to initialize NATS server operations");
      throw new Error(
        "NATS server operations are not available in this environment"
      );
    }
  }

  try {
    console.log(
      `SAFE-OPS: Calling autoImportNatsConfigurations with path: ${importPath || "default"}`
    );
    await natsServerOps.autoImportNatsConfigurations(importPath);
    console.log("SAFE-OPS: Auto-import completed successfully");
  } catch (error) {
    console.error("SAFE-OPS: Error during auto-import:", error);
    throw error;
  }
}
