// Next.js instrumentation file
// This runs when the Next.js server starts
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

import { scanNatsConfig } from "./lib/nats-cli";
import { importClusters } from "./actions/clusters";

export async function register(): Promise<void> {
  // Only run on the server
  if (typeof window !== "undefined") return;

  console.log("====================================");
  console.log("NATS WATCH INSTRUMENTATION HOOK RUNNING");
  console.log("====================================");

  // Check if auto-import is enabled
  if (
    process.env.NATS_CLUSTER_AUTO_IMPORT !== "true" &&
    process.env.NATS_CLUSTER_AUTO_IMPORT !== "1"
  ) {
    console.log("Auto-import is not enabled, skipping.");
    return;
  }

  // Get the import path
  const importPath = process.env.NATS_CLUSTER_AUTO_IMPORT_PATH;
  if (!importPath) {
    console.log("No import path specified, skipping auto-import.");
    return;
  }

  try {
    console.log(`Scanning for NATS configurations in: ${importPath}`);

    // Use the existing scanNatsConfig function to scan for NATS configurations
    const natsConfigurations = await scanNatsConfig(importPath);

    if (natsConfigurations.length === 0) {
      console.log("No NATS configurations found.");
      return;
    }

    console.log(`Found ${natsConfigurations.length} NATS configurations.`);

    // Import the found configurations using the existing importClusters function
    const result = await importClusters(natsConfigurations);

    if (result.success) {
      console.log("Successfully imported NATS configurations.");
    } else {
      console.error(`Failed to import NATS configurations: ${result.error}`);
    }
  } catch (error) {
    console.error("Error during auto-import:", error);
  }
}
