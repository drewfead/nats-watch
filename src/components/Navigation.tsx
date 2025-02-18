"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { JSX } from "react";
import { CoreNatsIcon, JetStreamIcon, ConsumersIcon } from "@/components/icons";

type NavItem = {
  label: string;
  icon: JSX.Element;
  href: string;
};

const navItems: NavItem[] = [
  {
    label: "Core NATS",
    icon: <CoreNatsIcon />,
    href: "/core",
  },
  {
    label: "JetStream",
    icon: <JetStreamIcon />,
    href: "/jetstream",
  },
  {
    label: "Consumers",
    icon: <ConsumersIcon />,
    href: "/consumers",
  },
];

export function Navigation(): JSX.Element {
  const pathname = usePathname();

  const isActive = (href: string): boolean => pathname === href;

  return (
    <nav className="w-64 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700/50 h-screen flex flex-col">
      <div className="p-6">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          NATS Watch
        </h1>
      </div>
      <div className="flex-1 px-3">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={`group relative flex items-center px-3 py-2 rounded-md ${
                    active
                      ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 font-medium"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 w-1 h-6 bg-blue-600 dark:bg-blue-400 rounded-full -ml-3" />
                  )}
                  <span className="mr-2">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="p-4 text-xs text-gray-500 dark:text-gray-400">v1.0.0</div>
    </nav>
  );
}
