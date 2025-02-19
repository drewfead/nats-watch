"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useNotification } from "@/app/notifications";

export function StreamNotFound({ streamName }: { streamName: string }): null {
  const router = useRouter();
  const { showNotification } = useNotification();

  useEffect(() => {
    showNotification(`Stream ${streamName} not found`, "error");
    router.replace("/jetstream");
  }, [router, showNotification, streamName]);

  return null;
}
