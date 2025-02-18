"use server";

import {
  closeNatsConnection,
  getJetstreamMessage,
  getJetstreamMessageRange,
  listConsumers,
  listStreams,
} from "@/lib/nats";
import {
  ConsumerMetadata,
  JetStreamMessage,
  StreamMetadata,
} from "@/types/nats";

export type Result<T> = Promise<Success<T> | Failure>;

export interface Failure {
  success: false;
  error: string;
}

export interface Success<T> {
  success: true;
  data: T;
}

export async function getStreamMessage(
  stream: string,
  seq: number
): Result<JetStreamMessage> {
  try {
    const message = await getJetstreamMessage(stream, seq);
    return {
      success: true,
      data: message,
    };
  } catch (error) {
    console.error("Error fetching stream message:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch message",
    };
  }
}

export async function getStreamMessageRange(
  stream: string,
  seq: number,
  limit: number,
  filterSubject?: string
): Result<JetStreamMessage[]> {
  try {
    const messages = await getJetstreamMessageRange(
      stream,
      seq,
      limit,
      filterSubject
    );
    return {
      success: true,
      data: messages,
    };
  } catch (error) {
    console.error("Error fetching stream message range:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch message range",
    };
  }
}

export async function getStreams(): Result<StreamMetadata[]> {
  try {
    const streams = await listStreams();
    return { success: true, data: streams };
  } catch (error) {
    console.error("Error fetching streams:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch streams",
    };
  }
}

export async function getConsumers(stream: string): Result<ConsumerMetadata[]> {
  try {
    const consumers = await listConsumers(stream);
    return { success: true, data: consumers };
  } catch (error) {
    console.error("Error fetching consumers:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch consumers",
    };
  }
}

export async function cleanup(): Result<void> {
  try {
    await closeNatsConnection();
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Error closing NATS connection:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
