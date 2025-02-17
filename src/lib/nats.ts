import { jetstream, JsMsg, JetStreamClient, DeliverPolicy, ReplayPolicy, StoredMsg } from "@nats-io/jetstream";
import { connect } from "@nats-io/transport-node";
import { NatsConnection, Msg, credsAuthenticator } from "@nats-io/nats-core";
import { readFileSync } from 'fs';
import { CoreMessage, JetStreamMessage, NatsSubscription, StreamMetadata } from "@/types/nats";

let natsConnection: NatsConnection | null = null;

export async function getNatsConnection(): Promise<NatsConnection> {
  if (!natsConnection) {
    try {
      // Get credentials from environment variables
      const natsUrl = process.env.NATS_URL;
      const natsCredsPath = process.env.NATS_CREDS_PATH;

      if (!natsUrl || !natsCredsPath) {
        throw new Error('NATS configuration missing. Please set NATS_URL and NATS_CREDS_PATH environment variables.');
      }

      const credsContent = readFileSync(natsCredsPath);
      
      natsConnection = await connect({
        servers: natsUrl,
        authenticator: credsAuthenticator(credsContent),
        pingInterval: 25000, // Send ping every 25 seconds
        maxPingOut: 3,      // Allow 3 missed pings before considering connection dead
        reconnect: true,
        reconnectTimeWait: 2000,
        timeout: 20000,
      });

      // Handle connection close
      natsConnection.closed().then((err) => {
        console.log('NATS connection closed', err);
        natsConnection = null;
      });

    } catch (error) {
      console.error('Failed to connect to NATS:', error);
      throw error;
    }
  }

  return natsConnection;
}

async function getJetStream(): Promise<JetStreamClient> {
  const nc = await getNatsConnection();
  return jetstream(nc);
}

export async function closeNatsConnection() {
  if (natsConnection) {
    await natsConnection.drain();
    natsConnection = null;
  }
}

export async function coreSubscribe(subject: string, callback: (msg: CoreMessage) => void): Promise<NatsSubscription> {
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
    stop: async() => {
        subscription.unsubscribe();
    }
  };
}

export async function jetStreamSubscribe(
    streamName: string, 
    subject: string, 
    callback: (msg: JetStreamMessage) => void
): Promise<NatsSubscription> {
  const js = await getJetStream();
  
  try {
    const consumer = await js.consumers.get(streamName, {
        filter_subjects: [subject],
        name_prefix: "_nats_watch_",
        deliver_policy: DeliverPolicy.New,
        inactive_threshold: 24 * 60 * 60 * 1000,
        replay_policy: ReplayPolicy.Instant,
    });

    const messages = await consumer.consume({
        callback: (msg) => {
            callback(convertJsMessage(msg));
        },
    });

    return {
        stop: async() => {
            messages.stop();
            await consumer.delete();
        }
    };
  } catch (error) {
    console.error(`Failed to create JetStream subscription for ${subject} in stream ${streamName}:`, error);
    throw error;
  }
}

export async function getJetStreamMessage(streamName: string, sequence: number) {
  const js = await getJetStream();
  
  try {
    // Get the message directly from the stream
    const stream = await js.streams.get(streamName);
    const msg = await stream.getMessage({seq: sequence});
    if (!msg) {
      throw new Error(`Message not found in stream ${streamName} at sequence ${sequence}`);
    }
    return convertJsMessage(msg);
  } catch (error) {
    console.error(`Failed to get message from stream ${streamName} at sequence ${sequence}:`, error);
    throw error;
  }
}

export async function listStreams(): Promise<StreamMetadata[]> {
  const js = await getJetStream();
  const manager = await js.jetstreamManager();
  const streams = manager.streams.list();
  
  const streamList: StreamMetadata[] = [];
  for await (const stream of streams) {
    // Skip K/V backing streams (they start with "KV_")
    if (!stream.config.name.startsWith('KV_')) {
      streamList.push({
        name: stream.config.name,
        subjectPrefixes: stream.config.subjects,
        description: stream.config.description
      });
    }
  }
  return streamList;
}

function convertCoreMessage(msg: Msg): CoreMessage {
  const headers: Record<string, string[]> = {};
  if (msg.headers) {
    for (const key of msg.headers.keys()) {
      headers[key] = msg.headers.values(key) ?? [];
    }
  }

  return {
    type: 'core',
    payload: msg.data ? msg.string() : '',
    subject: msg.subject,
    timestamp: new Date().toISOString(),
    reply: msg.reply,
    headers: headers,
  };
}

function convertJsMessage(msg: StoredMsg | JsMsg): JetStreamMessage {
  // Convert headers to the expected format
  const headers: Record<string, string[]> = {};
  if ('header' in msg && msg.header) {
    for (const [key, value] of msg.header) {
      headers[key] = Array.isArray(value) ? value : [value];
    }
  } else if ('headers' in msg && msg.headers) {
    for (const [key, value] of msg.headers) {
      headers[key] = Array.isArray(value) ? value : [value];
    }
  }

  const stream = 'info' in msg ? msg.info.stream : undefined;
  const seq = 'seq' in msg ? msg.seq : undefined;

  return {
    type: 'jetstream',
    payload: msg.data ? msg.string() : '',
    subject: msg.subject,
    seq: seq ?? 0,
    timestamp: new Date().toISOString(),
    stream: stream ?? '',
    headers: Object.keys(headers).length > 0 ? headers : undefined,
  };
}

export { getJetStream };