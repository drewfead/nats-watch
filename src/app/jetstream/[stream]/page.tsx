"use server";

import { JSX } from "react";
import { getStreams } from "@/actions/streams";
import SubscriptionClient from "../subscription-client";
import { StreamPicker } from "@/components/StreamPicker";
import { SubjectPicker } from "../subject-picker";
import { SubscriptionProvider } from "../subscription-context";
import { StreamNotFound } from "./stream-not-found";
import { redirect } from "next/navigation";

type Params = Promise<{ stream: string; clusterId?: string }>;

export default async function JetstreamPage({
  params,
}: {
  params: Params;
}): Promise<JSX.Element> {
  const { stream: paramStream, clusterId: paramCluster } = await params;

  try {
    const streams = await getStreams(paramCluster);
    if (!streams.success) {
      // If error mentions "No NATS clusters configured", redirect to the main page with an error
      if (
        streams.error &&
        streams.error.includes("No NATS clusters configured")
      ) {
        redirect(
          "/jetstream?error=" +
            encodeURIComponent(
              "No NATS clusters configured. Please add a cluster first."
            )
        );
      }

      // For other errors, throw normally
      throw new Error(streams.error);
    }

    const stream = streams.data.find((s) => s.name === paramStream);
    if (stream === undefined) {
      return <StreamNotFound streamName={paramStream} />;
    }

    return (
      <SubscriptionProvider>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-1/3">
              <StreamPicker
                selectedStream={stream.name}
                streams={streams.data}
                isServerComponent
              />
            </div>
            <div className="w-2/3">
              <SubjectPicker stream={stream} />
            </div>
          </div>
          <SubscriptionClient stream={stream} />
        </div>
      </SubscriptionProvider>
    );
  } catch (error) {
    // Handle any other errors by redirecting to the main page with the error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    redirect("/jetstream?error=" + encodeURIComponent(errorMessage));
  }
}
