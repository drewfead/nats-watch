"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function NotFoundContent(): React.ReactNode {
  const searchParams = useSearchParams();
  const referrer = searchParams.get("from") || "";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
      <h1 className="text-6xl font-bold mb-4">404</h1>
      <h2 className="text-2xl font-semibold mb-6">Page Not Found</h2>
      <p className="mb-8 max-w-md">
        The page you are looking for doesn&apos;t exist or has been moved.
        {referrer && <span> You were redirected from {referrer}.</span>}
      </p>
      <Link
        href="/"
        className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-md transition-colors"
      >
        Go to Home
      </Link>
    </div>
  );
}

export default function NotFound(): React.ReactNode {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
          <h1 className="text-6xl font-bold mb-4">404</h1>
          <h2 className="text-2xl font-semibold mb-6">Page Not Found</h2>
          <Link
            href="/"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-md transition-colors"
          >
            Go to Home
          </Link>
        </div>
      }
    >
      <NotFoundContent />
    </Suspense>
  );
}
