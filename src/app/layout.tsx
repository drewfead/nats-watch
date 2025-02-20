import "./globals.css";
import "./fonts.css";
import type { Metadata } from "next";
import { JSX } from "react";
import { Navigation } from "@/components/Navigation";
import { NotificationProvider } from "./notifications";

export const metadata: Metadata = {
  title: "NATS Watch",
  description: "A web interface for monitoring NATS messages",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="en" className="h-full">
      <body className="h-full font-sans antialiased">
        <NotificationProvider>
          <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
            <Navigation />
            <div className="flex-1">
              <div className="container mx-auto p-6 max-w-7xl">{children}</div>
            </div>
          </div>
        </NotificationProvider>
      </body>
    </html>
  );
}
