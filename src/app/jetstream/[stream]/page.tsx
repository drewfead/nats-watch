"use server";

import { JSX } from "react";
import { getStreams } from "@/app/actions";
import SubscriptionClient from "../subscription-client";
import { StreamPicker } from "@/components/StreamPicker";
import { SubjectPicker } from "../subject-picker";
import { SubscriptionProvider } from "../subscription-context";
import { StreamNotFound } from "./stream-not-found";

type Params = Promise<{ stream: string }>;

export default async function JetstreamPage({
  params,
}: {
  params: Params;
}): Promise<JSX.Element> {
  const { stream: paramStream } = await params;

  const streams = await getStreams();
  if (!streams.success) {
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
}
