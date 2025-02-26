"use server";

import {
  ClusterConfig,
  ClusterConfigParameters,
  ClusterConnectionStatus,
} from "@/types/nats";
import { randomUUID } from "crypto";
import {
  isMulticlusterEnabled,
  isAutoImportEnabled,
  getAutoImportPath,
} from "@/lib/feature";
import { readClustersConfig, writeClustersConfig } from "@/lib/storage";
import { scanNatsConfig } from "@/lib/nats-cli";
import { testConnection } from "@/lib/nats-server-ops";
import { getClusters as getClustersFromServer } from "@/lib/nats-server-ops";

export async function getClusters(): Promise<ClusterConfig[]> {
  return await getClustersFromServer();
}

export async function addCluster(
  data: ClusterConfigParameters
): Promise<{ success: boolean; error?: string }> {
  if (!isMulticlusterEnabled(process.env)) {
    return { success: false, error: "Multi-cluster support is not enabled" };
  }

  try {
    const clusters = await readClustersConfig();

    if (data.isDefault) {
      // Ensure only one default cluster
      clusters.forEach((cluster) => {
        cluster.isDefault = false;
      });
    }

    const newCluster: ClusterConfig = {
      id: randomUUID(),
      name: data.name,
      url: data.url,
      credsPath: data.credsPath,
      isDefault: data.isDefault,
    };

    const updatedClusters = [...clusters, newCluster];
    await writeClustersConfig(updatedClusters);

    return { success: true };
  } catch (error) {
    console.error("Error adding cluster:", error);
    return { success: false, error: "Failed to add cluster" };
  }
}

export async function removeCluster(
  id: string
): Promise<{ success: boolean; error?: string }> {
  if (!isMulticlusterEnabled(process.env)) {
    return { success: false, error: "Multi-cluster support is not enabled" };
  }

  try {
    const clusters = await readClustersConfig();
    const updatedClusters = clusters.filter((cluster) => cluster.id !== id);
    await writeClustersConfig(updatedClusters);

    return { success: true };
  } catch (error) {
    console.error("Error removing cluster:", error);
    return { success: false, error: "Failed to remove cluster" };
  }
}

export async function updateCluster(
  id: string,
  data: ClusterConfigParameters
): Promise<{ success: boolean; error?: string }> {
  if (!isMulticlusterEnabled(process.env)) {
    return { success: false, error: "Multi-cluster support is not enabled" };
  }

  try {
    const clusters = await readClustersConfig();

    if (data.isDefault) {
      // Ensure only one default cluster
      clusters.forEach((cluster) => {
        cluster.isDefault = false;
      });
    }

    const updatedClusters = clusters.map((cluster) =>
      cluster.id === id
        ? {
            ...cluster,
            name: data.name,
            url: data.url,
            credsPath: data.credsPath,
            isDefault: data.isDefault,
          }
        : cluster
    );

    await writeClustersConfig(updatedClusters);

    return { success: true };
  } catch (error) {
    console.error("Error updating cluster:", error);
    return { success: false, error: "Failed to update cluster" };
  }
}

export async function isMulticlusterEnabledServer(): Promise<boolean> {
  return isMulticlusterEnabled(process.env);
}

export async function isAutoImportEnabledServer(): Promise<boolean> {
  return isAutoImportEnabled(process.env);
}

export async function getAutoImportPathServer(): Promise<string | undefined> {
  return getAutoImportPath(process.env);
}

export async function importFromNatsCli(customPath?: string): Promise<{
  success: boolean;
  error?: string;
  clusters?: ClusterConfigParameters[];
}> {
  if (!isMulticlusterEnabled(process.env)) {
    return { success: false, error: "Multi-cluster support is not enabled" };
  }

  try {
    const cliClusters = await scanNatsConfig(customPath);
    if (cliClusters.length === 0) {
      return {
        success: false,
        error: customPath
          ? `No NATS configurations found in "${customPath}". Please check the path and try again.`
          : "No NATS configurations found in default locations. Please specify a custom path.",
      };
    }

    return { success: true, clusters: cliClusters };
  } catch (error) {
    console.error("Error importing NATS CLI configurations:", error);

    // Provide a more specific error message if available
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to import NATS configurations. Make sure the path is correct and accessible.";

    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function importClusters(
  clusters: ClusterConfigParameters[]
): Promise<{ success: boolean; error?: string }> {
  if (!isMulticlusterEnabled(process.env)) {
    return { success: false, error: "Multi-cluster support is not enabled" };
  }

  try {
    const existingClusters = await readClustersConfig();
    const newClusters = clusters.map((cluster) => ({
      ...cluster,
      id: randomUUID(),
    }));

    // If there are existing clusters, preserve them but update any matching ones
    const mergedClusters = existingClusters.map((existing) => {
      const matching = newClusters.find((n) => n.name === existing.name);
      return matching || existing;
    });

    // Add any new clusters that don't exist yet
    const uniqueNewClusters = newClusters.filter(
      (newCluster) =>
        !existingClusters.some((existing) => existing.name === newCluster.name)
    );

    await writeClustersConfig([...mergedClusters, ...uniqueNewClusters]);
    return { success: true };
  } catch (error) {
    console.error("Error importing clusters:", error);
    return {
      success: false,
      error: "Failed to import clusters",
    };
  }
}

export async function testClusterConnection(
  config: ClusterConfigParameters
): Promise<ClusterConnectionStatus> {
  try {
    return await testConnection(config);
  } catch (error) {
    console.error("Error testing cluster connection:", error);
    return {
      name: config.name,
      url: config.url,
      status: "unhealthy",
      error:
        error instanceof Error ? error.message : "Failed to test connection",
    };
  }
}
