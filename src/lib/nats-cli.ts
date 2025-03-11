"use server";

import { promises as fs } from "fs";
import { join, dirname, basename } from "path";
import { homedir } from "os";
import { ClusterAuthConfig, ClusterConfigParameters } from "@/types/nats";

interface NatsConfig {
  description?: string;
  url: string;
  creds?: string;
  nkey?: string;
  cert?: string;
  key?: string;
  ca?: string;
  nsc?: string;
  jetstream_domain?: string;
  jetstream_api_prefix?: string;
  jetstream_event_prefix?: string;
  inbox_prefix?: string;
  user_jwt?: string;
  color_scheme?: string;
  tls_first?: boolean;
}

async function readJsonFile(path: string): Promise<NatsConfig | null> {
  try {
    const data = await fs.readFile(path, "utf-8");
    const parsed = JSON.parse(data);

    // Validate that this is a NATS config file
    if (!parsed || typeof parsed !== "object" || !parsed.url) {
      console.debug(`Skipping ${path}: not a valid NATS config file`);
      return null;
    }

    return parsed as NatsConfig;
  } catch (error) {
    console.error(`Error reading JSON file ${path}:`, error);
    return null;
  }
}

async function findJsonFiles(dirPath: string): Promise<string[]> {
  const results: string[] = [];

  async function scan(currentPath: string): Promise<void> {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(currentPath, entry.name);
      if (entry.isDirectory()) {
        await scan(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        results.push(fullPath);
      }
    }
  }

  await scan(dirPath);
  return results;
}

async function scanDirectory(
  dirPath: string
): Promise<ClusterConfigParameters[]> {
  console.log(`Scanning directory: ${dirPath}`);
  const filePaths = await findJsonFiles(dirPath);
  console.log(`Found ${filePaths.length} JSON files: ${filePaths.join(", ")}`);

  const configs: ClusterConfigParameters[] = [];
  const processedNames = new Set<string>();

  for (const filePath of filePaths) {
    console.log(`Processing config file: ${filePath}`);
    try {
      const config = await readJsonFile(filePath);
      if (!config || !config.url) {
        console.log(`Skipping ${filePath}: not a valid NATS config file`);
        continue;
      }

      const name = config.description || basename(filePath, ".json");
      console.log(`Found config with name: ${name}`);

      if (!processedNames.has(name)) {
        let credsPath = "";
        if (config.creds) {
          // First determine the original credential path
          credsPath = config.creds.startsWith("/")
            ? config.creds
            : join(dirname(filePath), config.creds);
          console.log(`Original credentials path: ${credsPath}`);

          // When running in Docker, transform the path if needed
          if (
            process.env.NODE_ENV === "production" &&
            process.env.NATS_CLUSTER_AUTO_IMPORT_PATH
          ) {
            const importPath = process.env.NATS_CLUSTER_AUTO_IMPORT_PATH;

            // Check if the path contains ~/.config/nats or other patterns that need remapping
            if (
              credsPath.includes("/.config/nats/") ||
              credsPath.includes("/.nats/")
            ) {
              // Extract the part after the nats directory
              const pathRegex = /(?:\/\.config\/nats\/|\/\.nats\/)(.*)/;
              const match = credsPath.match(pathRegex);

              if (match && match[1]) {
                const relativePath = match[1];
                credsPath = join(importPath, relativePath);
                console.log(
                  `Remapped credentials path for Docker: ${credsPath}`
                );
              }
            }
          }

          // Check if creds file exists
          try {
            await fs.access(credsPath);
            console.log(`Credentials file exists: ${credsPath}`);
          } catch (error: unknown) {
            const message =
              error instanceof Error ? error.message : String(error);
            console.warn(
              `Credentials file not accessible: ${credsPath}, error: ${message}`
            );
          }

          configs.push({
            name,
            url: config.url,
            auth: {
              type: "credsfile",
              credsFile: credsPath,
            },
            isDefault: false, // We'll determine this later
          });
        } else {
          console.log(`No credentials specified in config`);
        }

        processedNames.add(name);
        console.log(`Added config for: ${name} (${config.url})`);
      } else {
        console.log(`Skipping duplicate name: ${name}`);
      }
    } catch (error) {
      console.error(`Error processing config file ${filePath}:`, error);
    }
  }

  return configs;
}

export async function scanNatsConfig(
  customPath?: string
): Promise<ClusterConfigParameters[]> {
  try {
    // Improved debugging
    console.log(`NATS Configuration Scan Started`);
    console.log(`Custom path provided: ${customPath || "none"}`);
    console.log(`Current working directory: ${process.cwd()}`);

    // Handle relative paths and home directory expansion
    if (customPath) {
      // Expand ~ to home directory
      if (customPath.startsWith("~")) {
        const homeDir = homedir();
        console.log(`Expanding ~ using homedir(): ${homeDir}`);
        customPath = join(homedir(), customPath.substring(1));
      }

      console.log(`Resolved path for scanning: ${customPath}`);

      try {
        // Check if path exists
        const stat = await fs.stat(customPath);
        console.log(
          `Path exists. Is directory: ${stat.isDirectory()}, size: ${stat.size}`
        );

        if (stat.isDirectory()) {
          console.log(`Scanning directory: ${customPath}`);
          return scanDirectory(customPath);
        }

        // If it's a single file, try to read it as a config file
        if (customPath.endsWith(".json")) {
          console.log(`Reading config file: ${customPath}`);
          const config = await readJsonFile(customPath);
          if (!config) {
            console.error(`Not a valid NATS config file: ${customPath}`);
            throw new Error(`Not a valid NATS config file: ${customPath}`);
          }

          const name = config.description || basename(customPath, ".json");
          const dirPath = dirname(customPath);
          let credsPath = "";
          if (config.creds) {
            credsPath = config.creds.startsWith("/")
              ? config.creds
              : join(dirPath, config.creds);
          }

          let auth: ClusterAuthConfig;
          if (credsPath) {
            auth = {
              type: "credsfile",
              credsFile: credsPath,
            };
          } else {
            auth = {
              type: "anonymous",
            };
          }

          return [
            {
              name,
              url: config.url,
              auth,
              isDefault: false,
            },
          ];
        } else {
          console.error(`Not a JSON file: ${customPath}`);
          throw new Error(
            "The specified file is not a JSON file. Please provide a .json configuration file."
          );
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          console.error(`Path does not exist: ${customPath}`);
          throw new Error(
            `The path "${customPath}" does not exist. Please check the path and try again.`
          );
        }
        throw error;
      }
    }

    // Default behavior: scan both ~/.config/nats/ and /etc/nats/
    const userConfigPath = join(homedir(), ".config", "nats");
    const systemConfigPath = "/etc/nats";

    console.log(
      `Scanning default locations: ${userConfigPath} and ${systemConfigPath}`
    );

    // Scan both directories and combine results
    const userConfigs = await scanDirectory(userConfigPath).catch((err) => {
      console.warn(`Could not scan user config directory: ${err.message}`);
      return [];
    });

    const systemConfigs = await scanDirectory(systemConfigPath).catch((err) => {
      console.warn(`Could not scan system config directory: ${err.message}`);
      return [];
    });

    // Combine configs, with user configs taking precedence for duplicates
    const allConfigs = [...systemConfigs];
    const existingNames = new Set(systemConfigs.map((config) => config.name));

    for (const config of userConfigs) {
      if (!existingNames.has(config.name)) {
        allConfigs.push(config);
      }
    }

    if (allConfigs.length === 0) {
      console.warn("No NATS configurations found in default locations");
    } else {
      console.log(`Found ${allConfigs.length} NATS configurations`);
    }

    return allConfigs;
  } catch (error) {
    console.error("Error in scanNatsConfig:", error);
    throw error; // Re-throw to allow the caller to handle the specific error
  }
}
