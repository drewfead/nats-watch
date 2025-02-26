import { triggerAutoImport } from "@/actions/auto-import";
import {
  isAutoImportEnabledServer,
  getAutoImportPathServer,
} from "@/actions/clusters";
import fs from "fs";

// This is a server component that will run during server-side rendering
export async function AutoImportServer(): Promise<null> {
  try {
    // Log to make it clear the component is executing
    console.log("=== AUTO IMPORT SERVER COMPONENT EXECUTING ===");

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
