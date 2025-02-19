import { getStreamMessage } from "@/app/actions";
import { MessageDetails } from "@/components/MessageDetails";
import { JSX } from "react";
import { MessagePageClient } from "./client";
import { MessageNotFound } from "./message-not-found";

type Params = Promise<{ stream: string; seq: string }>;

export default async function JetstreamMessagePage({
  params,
}: {
  params: Params;
}): Promise<JSX.Element> {
  const { stream, seq } = await params;
  const result = await getStreamMessage(stream, parseInt(seq, 10));

  if (!result.success) {
    return <MessageNotFound streamName={stream} seq={seq} />;
  }
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto p-6 max-w-4xl">
        <MessagePageClient stream={stream} />
        <MessageDetails message={result.data} embedded />
      </div>
    </div>
  );
}
