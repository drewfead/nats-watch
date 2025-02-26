import {
  jetstream,
  JsMsg,
  JetStreamClient,
  DeliverPolicy,
  ReplayPolicy,
  StoredMsg,
  AckPolicy,
  ConsumerConfig,
  JetStreamManager,
} from "@nats-io/jetstream";
import { connect } from "@nats-io/transport-node";
import {
  NatsConnection,
  Msg,
  credsAuthenticator,
  ConnectionOptions,
} from "@nats-io/nats-core";
import { readFileSync } from "fs";
import {
  ClusterConnectionStatus,
  ConsumerMetadata,
  CoreMessage,
  JetStreamMessage,
  NatsSubscription,
  StreamMetadata,
} from "@/types/nats";
import { randomUUID } from "crypto";
import { ClusterConfig, ClusterConfigParameters } from "@/types/nats";
import {
  isMulticlusterEnabled,
  isAutoImportEnabled,
  getAutoImportPath,
  isNatsUrlConfigured,
} from "./feature";
import { readClustersConfig, writeClustersConfig } from "./storage";
import { scanNatsConfig } from "./nats-cli";

// Store active connections
const connections = new Map<string, NatsConnection>();

const defaultClusterId = "default";

// Auto-import NATS configurations on server startup
export async function autoImportNatsConfigurations(): Promise<void> {
  if (!isMulticlusterEnabled(process.env)) {
    console.log("Auto-import: Multicluster support is not enabled");
    return;
  }

  if (!isAutoImportEnabled(process.env)) {
    console.log(
      "Auto-import: Automatic import of NATS configurations is not enabled"
    );
    return;
  }

  const importPath = getAutoImportPath(process.env);
  if (!importPath) {
    console.warn(
      "Auto-import: Auto-import is enabled but no import path is specified. Set NATS_CLUSTER_AUTO_IMPORT_PATH environment variable."
    );
    return;
  }

  console.log(
    `Auto-import: Starting scan of NATS configurations from path: ${importPath}`
  );
  console.log(`Auto-import: Environment variables:`);
  console.log(
    `- NEXT_PUBLIC_MULTICLUSTER_ENABLED: ${process.env.NEXT_PUBLIC_MULTICLUSTER_ENABLED}`
  );
  console.log(
    `- NATS_CLUSTER_AUTO_IMPORT: ${process.env.NATS_CLUSTER_AUTO_IMPORT}`
  );
  console.log(
    `- NATS_CLUSTER_AUTO_IMPORT_PATH: ${process.env.NATS_CLUSTER_AUTO_IMPORT_PATH}`
  );

  try {
    const configs = await scanNatsConfig(importPath);
    console.log(`Auto-import: Found ${configs.length} NATS configurations`);

    if (configs.length === 0) {
      console.warn(
        `Auto-import: No NATS configurations found at ${importPath}`
      );
      return;
    }

    // Get existing clusters
    const existingClusters = await readClustersConfig();
    console.log(
      `Auto-import: Found ${existingClusters.length} existing clusters`
    );

    // Build a set of existing cluster names
    const existingNames = new Set(existingClusters.map((c) => c.name));

    // Filter new configs to only those that don't already exist
    const newConfigs = configs.filter((c) => !existingNames.has(c.name));
    console.log(
      `Auto-import: Found ${newConfigs.length} new configurations to import`
    );

    if (newConfigs.length === 0) {
      console.log("Auto-import: No new configurations to import");
      return;
    }

    // Assign IDs to new configs and mark the first one as default if there are no existing clusters
    const newClusters: ClusterConfig[] = newConfigs.map((config, index) => ({
      id: randomUUID(),
      name: config.name,
      url: config.url,
      credsPath: config.credsPath,
      isDefault: existingClusters.length === 0 && index === 0,
    }));

    // Merge with existing clusters
    const mergedClusters = [...existingClusters, ...newClusters];
    console.log(`Auto-import: Saving ${mergedClusters.length} total clusters`);

    // Save the merged clusters
    await writeClustersConfig(mergedClusters);
    console.log("Auto-import: Successfully imported NATS configurations");
  } catch (error) {
    console.error("Auto-import: Error importing NATS configurations:", error);
  }
}

export function defaultCluster(env: NodeJS.ProcessEnv): ClusterConfig | null {
  if (!isNatsUrlConfigured(env)) {
    return null;
  }

  return {
    id: defaultClusterId,
    name: "Default",
    url: env.NATS_URL || "http://localhost:4222",
    credsPath: env.NATS_CREDS_PATH || "",
    isDefault: true,
  };
}

function defaultClusterList(env: NodeJS.ProcessEnv): ClusterConfig[] {
  const d = defaultCluster(env);
  if (d) {
    return [d];
  }
  return [];
}

async function getClusterConfig(
  clusterId: string
): Promise<ClusterConfig | null> {
  const clusters = await getClusters();
  return clusters.find((c) => c.id === clusterId) || null;
}

export async function getClusters(): Promise<ClusterConfig[]> {
  if (!isMulticlusterEnabled(process.env)) {
    return defaultClusterList(process.env);
  }

  try {
    const configured = await readClustersConfig();
    return [...configured, ...defaultClusterList(process.env)];
  } catch (error) {
    console.error("Error loading clusters:", error);
    return [];
  }
}

export async function getNatsConnection(
  clusterId?: string
): Promise<NatsConnection> {
  // If no specific cluster ID was provided
  if (!clusterId) {
    // Get all available clusters
    const allClusters = await getClusters();

    // If we have any clusters, use the first one
    if (allClusters.length > 0) {
      // Find default cluster first
      const defaultCluster = allClusters.find((c) => c.isDefault);

      // Use default cluster if available, otherwise use the first one
      clusterId = defaultCluster ? defaultCluster.id : allClusters[0].id;
    } else {
      // No clusters available
      throw new Error("No NATS clusters configured");
    }
  }

  // Check if we already have an active connection
  const existingConn = connections.get(clusterId);
  if (existingConn && !existingConn.isClosed()) {
    return existingConn;
  }

  // Get cluster configuration
  const cluster = await getClusterConfig(clusterId);
  if (!cluster) {
    throw new Error(`Cluster ${clusterId} not found`);
  }

  if (!cluster.credsPath) {
    throw new Error(`Cluster ${clusterId} has no credentials path`);
  }

  const credsContent = readFileSync(cluster.credsPath);

  // Create new connection
  const conn = await connect({
    servers: cluster.url,
    authenticator: credsAuthenticator(credsContent),
  });

  // Store the connection
  connections.set(clusterId, conn);
  return conn;
}

export async function testConnection(
  config: ClusterConfigParameters
): Promise<ClusterConnectionStatus> {
  let nc: NatsConnection | null = null;
  try {
    const options: ConnectionOptions = {
      servers: config.url,
      pingInterval: 5000, // Shorter ping interval for testing
      maxPingOut: 2, // Fewer pings for quicker failure detection
      timeout: 10000, // 10 second connection timeout
    };

    if (config.credsPath) {
      try {
        const creds = readFileSync(config.credsPath);
        options.authenticator = credsAuthenticator(creds);
      } catch (readError) {
        const errorMessage =
          readError instanceof Error
            ? readError.message
            : "Unknown error reading credentials file";
        return {
          name: config.name,
          url: config.url,
          status: "unhealthy",
          error: `Failed to read credentials file ${config.credsPath}: ${errorMessage}`,
        };
      }
    }

    nc = await connect(options);

    // Test basic connectivity by requesting server info
    const serverInfo = nc.info;
    if (!serverInfo) {
      throw new Error("Could not get server information");
    }

    await nc.close();
    return {
      name: config.name,
      url: config.url,
      status: "healthy",
    };
  } catch (error) {
    return {
      name: config.name,
      url: config.url,
      status: "unhealthy",
      error:
        error instanceof Error
          ? error.message
          : "Failed to connect to NATS server",
    };
  } finally {
    if (nc) {
      try {
        await nc.close();
      } catch (closeError) {
        console.error("Error closing test connection:", closeError);
      }
    }
  }
}

export async function closeNatsConnection(clusterId?: string): Promise<void> {
  if (clusterId) {
    const conn = connections.get(clusterId);
    if (conn) {
      await conn.close();
      connections.delete(clusterId);
    }
  } else {
    // Close all connections if no clusterId provided
    for (const [id, conn] of connections) {
      await conn.close();
      connections.delete(id);
    }
  }
}

async function getJetStream(clusterId?: string): Promise<JetStreamClient> {
  const nc = await getNatsConnection(clusterId);
  return jetstream(nc);
}

export async function coreSubscribe(
  subject: string,
  callback: (msg: CoreMessage, err: Error | undefined) => void,
  clusterId?: string
): Promise<NatsSubscription> {
  const nc = await getNatsConnection(clusterId);
  const sub = nc.subscribe(subject);

  (async () => {
    for await (const msg of sub) {
      try {
        callback(convertCoreMessage(msg), undefined);
      } catch (err) {
        callback(
          convertCoreMessage(msg),
          err instanceof Error ? err : new Error(String(err))
        );
      }
    }
  })().catch((err) => {
    console.error("Subscription error:", err);
  });

  return {
    stop: async () => {
      sub.unsubscribe();
    },
  };
}

export async function jetStreamSubscribe(
  streamName: string,
  subject: string,
  callback: (msg: JetStreamMessage) => void,
  clusterId?: string
): Promise<NatsSubscription> {
  const js = await getJetStream(clusterId);

  try {
    // Generate a unique consumer name with a UUID
    const consumerName = `_nats_watch_${randomUUID()}`;

    // Get the JetStream manager
    const jsm = await js.jetstreamManager();

    // Create an ephemeral consumer
    const consumerConfig: Partial<ConsumerConfig> = {
      filter_subjects: [subject],
      name: consumerName,
      deliver_policy: DeliverPolicy.New,
      inactive_threshold: 30 * 60 * 1000, // 30 minutes
      replay_policy: ReplayPolicy.Instant,
      ack_policy: AckPolicy.None,
    };

    await jsm.consumers.add(streamName, consumerConfig);

    // Create a consumer subscription
    const consumer = await js.consumers.get(streamName, consumerName);
    const messages = await consumer.consume();

    // Start consuming messages
    (async () => {
      try {
        for await (const msg of messages) {
          callback(convertJsMessage(msg));
        }
      } catch (error) {
        if (error instanceof Error && error.message !== "consumer deleted") {
          console.error(`Subscription error for ${subject}:`, error);
        }
      }
    })();

    return {
      stop: async () => {
        try {
          messages.stop();
          await jsm.consumers.delete(streamName, consumerName);
        } catch (error) {
          console.error(`Failed to cleanup consumer ${consumerName}:`, error);
        }
      },
    };
  } catch (error) {
    console.error(
      `Failed to create JetStream subscription for ${subject} in stream ${streamName}:`,
      error
    );
    throw error;
  }
}

export async function getJetstreamMessage(
  streamName: string,
  sequence: number,
  clusterId?: string
): Promise<JetStreamMessage> {
  const js = await getJetStream(clusterId);

  try {
    // Get the message directly from the stream
    const stream = await js.streams.get(streamName);
    const msg = await stream.getMessage({ seq: sequence });
    if (!msg) {
      throw new Error(
        `Message not found in stream ${streamName} at sequence ${sequence}`
      );
    }
    return convertJsMessage(msg);
  } catch (error) {
    console.error(
      `Failed to get message from stream ${streamName} at sequence ${sequence}:`,
      error
    );
    throw error;
  }
}

const maxLimit = 1000;

export async function getJetstreamMessageRange(
  stream: string,
  startSeq: number,
  limit: number,
  clusterId?: string,
  filterSubject?: string
): Promise<JetStreamMessage[]> {
  const consumerName = `_nats_watch_seq_range_${randomUUID()}`;
  if (limit > maxLimit) {
    limit = maxLimit;
  }
  if (limit < 1) {
    limit = 1;
  }

  const js = await getJetStream(clusterId);
  let jsm: JetStreamManager | null = null;

  try {
    jsm = await js.jetstreamManager();

    // Get stream info to check if the requested sequence is valid
    const streamInfo = await jsm.streams.info(stream);
    if (startSeq > streamInfo.state.last_seq) {
      return []; // Return empty array if start sequence is beyond last message
    }

    // Create an ephemeral consumer starting at the specified sequence
    const consumerConfig: Partial<ConsumerConfig> = {
      name: consumerName,
      filter_subjects: filterSubject ? [filterSubject] : undefined,
      deliver_policy: DeliverPolicy.StartSequence,
      inactive_threshold: 30 * 60 * 1000, // 30 minutes
      opt_start_seq: startSeq,
      ack_policy: AckPolicy.None,
    };

    await jsm.consumers.add(stream, consumerConfig);
    const messages: JetStreamMessage[] = [];
    const consumer = await js.consumers.get(stream, consumerName);
    const subscription = await consumer.consume();
    try {
      for await (const msg of subscription) {
        const headers: Record<string, string[]> = {};
        if (msg.headers) {
          for (const key of msg.headers.keys()) {
            headers[key] = msg.headers.values(key) ?? [];
          }
        }
        messages.push(convertJsMessage(msg));
        if (messages.length >= limit) {
          break;
        }
        if (msg.seq >= streamInfo.state.last_seq) {
          break;
        }
      }
    } finally {
      subscription.stop();
    }

    return messages;
  } catch (error) {
    console.error("Error fetching message range:", error);
    throw error;
  } finally {
    // Clean up the ephemeral consumer
    try {
      await jsm?.consumers.delete(stream, consumerName);
    } catch (error) {
      console.error("Error cleaning up consumer:", error);
    }
  }
}

export async function listStreams(
  clusterId?: string
): Promise<StreamMetadata[]> {
  const js = await getJetStream(clusterId);

  try {
    const manager = await js.jetstreamManager();
    const streams = manager.streams.list();

    const streamList: StreamMetadata[] = [];
    for await (const stream of streams) {
      // Skip K/V backing streams (they start with "KV_")
      if (!stream.config.name.startsWith("KV_")) {
        streamList.push({
          name: stream.config.name,
          subjectPrefixes: stream.config.subjects,
          description: stream.config.description,
          lastSequence: stream.state.last_seq,
        });
      }
    }
    return streamList;
  } catch (error) {
    console.error("Error listing streams:", error);
    throw error;
  }
}

export async function listConsumers(
  streamName: string,
  clusterId?: string
): Promise<ConsumerMetadata[]> {
  const js = await getJetStream(clusterId);

  try {
    const manager = await js.jetstreamManager();
    const consumers = manager.consumers.list(streamName);
    const consumerList: ConsumerMetadata[] = [];
    for await (const consumer of consumers) {
      const isPush =
        consumer.config.deliver_group !== undefined || consumer.push_bound;

      consumerList.push({
        name: consumer.config.name ?? "",
        stream: streamName,
        durability: consumer.config.durable_name ? "durable" : "ephemeral",
        flow: isPush ? "push" : "pull",
        unprocessedCount: consumer.num_pending,
        ackPendingCount: consumer.num_ack_pending,
        ackFloor: consumer.ack_floor.stream_seq,
        lastDelivered: consumer.delivered.stream_seq,
        pendingCount: consumer.num_pending,
        redeliveredCount: consumer.num_redelivered,
        waitingCount: consumer.num_waiting,
        filterSubjects: consumer.config.filter_subject
          ? [consumer.config.filter_subject]
          : (consumer.config.filter_subjects ?? []),
      });
    }
    return consumerList;
  } catch (error) {
    console.error("Error listing consumers:", error);
    throw error;
  }
}

function convertCoreMessage(msg: Msg): CoreMessage {
  const headers: Record<string, string[]> = {};
  if (msg.headers) {
    for (const key of msg.headers.keys()) {
      headers[key] = msg.headers.values(key) ?? [];
    }
  }

  return {
    type: "core",
    payload: msg.data ? msg.string() : "",
    subject: msg.subject,
    timestamp: new Date().toISOString(),
    reply: msg.reply,
    headers: headers,
  };
}

function convertJsMessage(msg: StoredMsg | JsMsg): JetStreamMessage {
  // Convert headers to the expected format
  const headers: Record<string, string[]> = {};
  if ("header" in msg && msg.header) {
    for (const [key, value] of msg.header) {
      headers[key] = Array.isArray(value) ? value : [value];
    }
  } else if ("headers" in msg && msg.headers) {
    for (const [key, value] of msg.headers) {
      headers[key] = Array.isArray(value) ? value : [value];
    }
  }

  const stream = "info" in msg ? msg.info.stream : undefined;
  const seq = "seq" in msg ? msg.seq : undefined;

  return {
    type: "jetstream",
    payload: msg.data ? msg.string() : "",
    subject: msg.subject,
    seq: seq ?? 0,
    timestamp: new Date().toISOString(),
    stream: stream ?? "",
    headers: Object.keys(headers).length > 0 ? headers : undefined,
  };
}
