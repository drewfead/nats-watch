"use client";

import { JSX } from "react";
import {
  CoreNatsIcon,
  JetStreamIcon,
  ConsumersIcon,
  ClustersIcon,
} from "@/components/icons";
import { NavigationItem } from "./NavigationItem";
import { isMulticlusterEnabled } from "@/lib/feature";
import { ClusterPicker } from "./ClusterPicker";

interface Navigable {
  label: string;
  icon: JSX.Element;
  href: string;
  condition?: (env: NodeJS.ProcessEnv) => boolean;
}

const pages: Navigable[] = [
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
  {
    label: "Clusters",
    icon: <ClustersIcon />,
    href: "/clusters",
    condition: isMulticlusterEnabled,
  },
  // Add future conditional items here
  // {
  //   label: "New Feature",
  //   icon: <NewFeatureIcon />,
  //   href: "/new-feature",
  //   condition: (env) => Boolean(env.SOME_OTHER_FEATURE_FLAG),
  // },
];

const getEffectiveNavItems = (
  items: Navigable[],
  env: NodeJS.ProcessEnv
): Navigable[] => {
  const effectiveItems = items.filter((item) => {
    if (!item.condition) return true;

    const result = item.condition(env);
    return result;
  });

  return effectiveItems;
};

export function Navigation(): JSX.Element {
  const effectiveNavItems = getEffectiveNavItems(pages, process.env);

  return (
    <nav className="w-64 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700/50 h-screen flex flex-col">
      <div className="p-6">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          NATS Watch
        </h1>
      </div>
      <ClusterPicker />
      <div className="flex-1 px-3">
        <ul className="space-y-0.5">
          {effectiveNavItems.map((item) => (
            <li key={item.label}>
              <NavigationItem
                href={item.href}
                icon={item.icon}
                label={item.label}
              />
            </li>
          ))}
        </ul>
      </div>
      <div className="p-4 text-xs text-gray-500 dark:text-gray-400">v1.0.0</div>
    </nav>
  );
}
