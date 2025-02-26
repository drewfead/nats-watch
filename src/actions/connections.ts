"use server";

import { closeNatsConnection } from "@/lib/nats-server-ops";
import { Result } from "./results";

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
