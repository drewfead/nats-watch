"use client";

import { BackIcon } from "@/components/icons";
import { JSX } from "react";
import { useRouter } from "next/navigation";

interface MessagePageClientProps {
  stream: string;
}

export function MessagePageClient({
  stream,
}: MessagePageClientProps): JSX.Element {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(`/jetstream/${stream}`)}
      className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-6"
    >
      <BackIcon className="w-4 h-4" />
      <span>Back to JetStream</span>
    </button>
  );
}
