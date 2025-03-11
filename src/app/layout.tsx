import "./globals.css";
import "./fonts.css";
import { Metadata } from "next";
import { JSX } from "react";
import { Navigation } from "@/components/Navigation";
import { NotificationProvider } from "./notifications";
import { ClusterProvider } from "@/components/ClusterPicker";

export const metadata: Metadata = {
  title: "NatsWatch",
  description: "NATS monitoring and management tool",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps): JSX.Element {
  return (
    <html lang="en" className="h-full">
      <body className="h-full font-sans antialiased">
        <NotificationProvider>
          <ClusterProvider>
            <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
              <Navigation />
              <div className="flex-1">
                <div className="container mx-auto p-6 max-w-7xl">
                  {children}
                </div>
              </div>
            </div>
          </ClusterProvider>
        </NotificationProvider>
      </body>
    </html>
  );
}
