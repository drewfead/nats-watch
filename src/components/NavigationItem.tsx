"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { JSX } from "react";

interface NavigationItemProps {
  href: string;
  icon: JSX.Element;
  label: string;
}

export function NavigationItem({
  href,
  icon,
  label,
}: NavigationItemProps): JSX.Element {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`group relative flex items-center px-3 py-2 rounded-md ${
        isActive
          ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 font-medium"
          : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
      }`}
    >
      {isActive && (
        <span className="absolute left-0 w-1 h-6 bg-blue-600 dark:bg-blue-400 rounded-full -ml-3" />
      )}
      <span className="mr-2">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
