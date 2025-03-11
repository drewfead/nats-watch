"use server";

import { promises as fs } from "fs";
import pathBrowserify from "path-browserify";
// Use only the browserify version
const pathModule = pathBrowserify;
import { ClusterConfig } from "@/types/nats";

// Get configuration directory from environment variable or use sensible defaults
// Docker containers often have issues with write permissions in the working directory
// but /tmp is typically writable
const CONFIG_DIR =
  process.env.NATS_WATCH_CONFIG_DIR ||
  (process.env.NODE_ENV === "production" ? "/tmp/.nats-watch" : ".nats-watch");
const CLUSTERS_FILE = "clusters.json";

async function ensureConfigDir(): Promise<void> {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
  } catch (error) {
    console.error(`Error creating config directory (${CONFIG_DIR}):`, error);
    throw error;
  }
}

export async function readClustersConfig(): Promise<ClusterConfig[]> {
  try {
    await ensureConfigDir();
    const filePath = pathModule.join(CONFIG_DIR, CLUSTERS_FILE);

    try {
      const data = await fs.readFile(filePath, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        // File doesn't exist yet, return empty array
        console.log(
          `No clusters file found at ${filePath}, returning empty array`
        );
        return [];
      }
      throw error;
    }
  } catch (error) {
    console.error("Error reading clusters config:", error);
    throw error;
  }
}

export async function writeClustersConfig(
  clusters: ClusterConfig[]
): Promise<void> {
  try {
    await ensureConfigDir();
    const filePath = pathModule.join(CONFIG_DIR, CLUSTERS_FILE);
    await fs.writeFile(filePath, JSON.stringify(clusters, null, 2), "utf-8");
    console.log(`Successfully wrote clusters config to ${filePath}`);
  } catch (error) {
    console.error("Error writing clusters config:", error);
    throw error;
  }
}
