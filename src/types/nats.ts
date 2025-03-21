export interface NatsMessage {
  type: "core" | "jetstream";
  payload: string;
  subject: string;
  timestamp: string;
  headers?: Record<string, string[]>;
}

export interface CoreMessage extends NatsMessage {
  type: "core";
  reply?: string;
}

export interface JetStreamMessage extends NatsMessage {
  type: "jetstream";
  payload: string;
  subject: string;
  seq: number;
  timestamp: string;
  stream: string;
  headers?: Record<string, string[]>;
}

export interface NatsSubscription {
  stop(): Promise<void>;
}

export interface ConnectionStatusEvent {
  type: "connection_status";
  status: "connected" | "disconnected" | "error";
  subject?: string;
  stream?: string;
  timestamp: string;
  message?: string;
}

export interface HeartbeatEvent {
  type: "heartbeat";
  timestamp: string;
}

export type ControlEvent = ConnectionStatusEvent | HeartbeatEvent;

export interface MessageEnvelope {
  type: "message";
  payload: NatsMessage | JetStreamMessage;
}

export interface ControlEnvelope {
  type: "control";
  payload: ControlEvent;
}

export type EventEnvelope = MessageEnvelope | ControlEnvelope;

export type StreamMetadata = {
  name: string;
  subjectPrefixes: string[];
  description?: string;
  lastSequence: number;
};

type ConsumerFlow = "push" | "pull";
type ConsumerDurability = "durable" | "ephemeral";

export interface ConsumerMetadata {
  name: string;
  stream: string;
  durability: ConsumerDurability;
  flow: ConsumerFlow;
  filterSubjects: string[];
  unprocessedCount: number;
  ackPendingCount: number;
  ackFloor: number;
  lastDelivered: number;
  pendingCount: number;
  redeliveredCount: number;
  waitingCount: number;
}

export type ClusterAuthConfig =
  | CredsFileAuthConfig
  | UsernamePasswordAuthConfig
  | AnonymousAuthConfig;

export interface CredsFileAuthConfig {
  type: "credsfile";
  credsFile: string;
}

export interface UsernamePasswordAuthConfig {
  type: "username-password";
  username: string;
  password: string;
}

export interface AnonymousAuthConfig {
  type: "anonymous";
}

export interface ClusterConfig {
  id: string;
  name: string;
  url: string;
  auth: ClusterAuthConfig;
  isDefault?: boolean;
}

export interface ClusterConfigParameters {
  name: string;
  url: string;
  auth: ClusterAuthConfig;
  isDefault: boolean;
}

export interface ClusterConnectionStatus {
  name: string;
  url: string;
  status: "healthy" | "unhealthy" | "unknown";
  error?: string;
}
