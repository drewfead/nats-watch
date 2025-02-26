"use server";

import {
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
import { Result } from "./results";

export async function getStreamMessage(
  stream: string,
  seq: number,
  clusterId?: string
): Result<JetStreamMessage> {
  try {
    const message = await getJetstreamMessage(stream, seq, clusterId);
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
  clusterId?: string,
  filterSubject?: string
): Result<JetStreamMessage[]> {
  try {
    const messages = await getJetstreamMessageRange(
      stream,
      seq,
      limit,
      clusterId,
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

export async function getStreams(clusterId?: string): Result<StreamMetadata[]> {
  try {
    const streams = await listStreams(clusterId);
    return { success: true, data: streams };
  } catch (error) {
    console.error("Error fetching streams:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch streams",
    };
  }
}

export async function getConsumers(
  stream: string,
  clusterId?: string
): Result<ConsumerMetadata[]> {
  try {
    const consumers = await listConsumers(stream, clusterId);
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
