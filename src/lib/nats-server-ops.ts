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
import { NatsConnection, Msg, credsAuthenticator } from "@nats-io/nats-core";
import { readFileSync } from "fs";
import {
  ConsumerMetadata,
  CoreMessage,
  JetStreamMessage,
  NatsSubscription,
  StreamMetadata,
} from "@/types/nats";
import { randomUUID } from "crypto";

let natsConnection: NatsConnection | null = null;

export async function getNatsConnection(): Promise<NatsConnection> {
  if (!natsConnection) {
    try {
      // Get credentials from environment variables
      const natsUrl = process.env.NATS_URL;
      const natsCredsPath = process.env.NATS_CREDS_PATH;

      if (!natsUrl || !natsCredsPath) {
        throw new Error(
          "NATS configuration missing. Please set NATS_URL and NATS_CREDS_PATH environment variables."
        );
      }

      const credsContent = readFileSync(natsCredsPath);

      natsConnection = await connect({
        servers: natsUrl,
        authenticator: credsAuthenticator(credsContent),
        pingInterval: 25000, // Send ping every 25 seconds
        maxPingOut: 3, // Allow 3 missed pings before considering connection dead
        reconnect: true,
        reconnectTimeWait: 2000,
        timeout: 20000,
      });

      // Handle connection close
      natsConnection.closed().then((err) => {
        console.log("NATS connection closed", err);
        natsConnection = null;
      });
    } catch (error) {
      console.error("Failed to connect to NATS:", error);
      throw error;
    }
  }

  return natsConnection;
}

async function getJetStream(): Promise<JetStreamClient> {
  const nc = await getNatsConnection();
  return jetstream(nc);
}

export async function closeNatsConnection(): Promise<void> {
  if (natsConnection) {
    await natsConnection.drain();
    natsConnection = null;
  }
}

export async function coreSubscribe(
  subject: string,
  callback: (msg: CoreMessage) => void
): Promise<NatsSubscription> {
  const nc = await getNatsConnection();
  const subscription = nc.subscribe(subject, {
    callback: (err, msg) => {
      if (err) {
        console.error(`Subscription error for subject ${subject}:`, err);
      } else {
        callback(convertCoreMessage(msg));
      }
    },
  });

  return {
    stop: async () => {
      subscription.unsubscribe();
    },
  };
}

export async function jetStreamSubscribe(
  streamName: string,
  subject: string,
  callback: (msg: JetStreamMessage) => void
): Promise<NatsSubscription> {
  const js = await getJetStream();

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
  sequence: number
): Promise<JetStreamMessage> {
  const js = await getJetStream();

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
  filterSubject?: string
): Promise<JetStreamMessage[]> {
  const consumerName = `_nats_watch_seq_range_${randomUUID()}`;
  if (limit > maxLimit) {
    limit = maxLimit;
  }
  if (limit < 1) {
    limit = 1;
  }

  const js = await getJetStream();
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

export async function listStreams(): Promise<StreamMetadata[]> {
  const js = await getJetStream();

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
  streamName: string
): Promise<ConsumerMetadata[]> {
  const js = await getJetStream();

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
