"use server";

import { triggerAutoImport } from "@/actions/auto-import";
import {
  isAutoImportEnabledServer,
  getAutoImportPathServer,
} from "@/actions/clusters";
import fs from "fs";

// This is a server component that will run during server-side rendering
export async function AutoImportServer(): Promise<React.ReactNode> {
  try {
    // Log to make it clear the component is executing
    console.log("=== AUTO IMPORT SERVER COMPONENT EXECUTING (APP DIR) ===");

    // Check if auto-import is enabled
    const isEnabled = await isAutoImportEnabledServer();
    console.log(`Auto-import enabled: ${isEnabled}`);

    if (isEnabled) {
      const importPath = await getAutoImportPathServer();
      console.log(`Auto-import path: ${importPath || "default"}`);

      // Check if the import path exists and is accessible
      try {
        if (importPath && fs.existsSync(importPath)) {
          console.log(`Import path exists: ${importPath}`);

          // Log directory contents to debug
          const files = fs.readdirSync(importPath);
          console.log(`Files in import path: ${JSON.stringify(files)}`);

          // Log the /tmp/.nats-watch directory
          const configDir =
            process.env.NATS_WATCH_CONFIG_DIR || "/tmp/.nats-watch";
          console.log(`Config directory: ${configDir}`);

          try {
            if (!fs.existsSync(configDir)) {
              fs.mkdirSync(configDir, { recursive: true });
              console.log(`Created config directory: ${configDir}`);
            } else {
              console.log(`Config directory exists: ${configDir}`);
              // Check if it's writable
              const testFile = `${configDir}/test.txt`;
              fs.writeFileSync(testFile, "test");
              fs.unlinkSync(testFile);
              console.log(`Config directory is writable: ${configDir}`);
            }
          } catch (configError) {
            console.error(`Error with config directory: ${configError}`);
          }
        } else if (importPath) {
          console.warn(
            `Import path does not exist or is not accessible: ${importPath}`
          );
        }
      } catch (pathError) {
        console.error(`Error checking import path: ${pathError}`);
      }

      // Trigger the auto-import
      console.log("Triggering auto-import...");
      const result = await triggerAutoImport();

      if (result.success) {
        console.log(`Auto-import status: ${result.message}`);
      } else {
        console.error(`Auto-import failed: ${result.error}`);
      }
    } else {
      console.log("Auto-import is not enabled, skipping.");
    }
  } catch (error) {
    // Catch any errors during the auto-import process
    console.error("Error in AutoImportServer component:", error);
  }

  // This component doesn't render anything
  return null;
}

export default AutoImportServer;
