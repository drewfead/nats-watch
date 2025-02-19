"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useNotification } from "@/app/notifications";

export function MessageNotFound({
  streamName,
  seq,
}: {
  streamName: string;
  seq: string;
}): null {
  const router = useRouter();
  const { showNotification } = useNotification();

  useEffect(() => {
    showNotification(
      `Message #${seq} on steram ${streamName} not found`,
      "error"
    );
    router.replace(`/jetstream/${streamName}`);
  }, [router, showNotification, streamName, seq]);

  return null;
}
