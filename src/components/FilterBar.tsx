import { Filter } from "@/types/filter";
import { countFilters, isUnfiltered } from "@/lib/filter";
import { JSX } from "react";

type FilterBarProps = {
  filter: Filter;
  onClick: () => void;
  isOpen: boolean;
  onChange: (filter: Filter) => void;
};

type FilterPath = Array<number>;

type FilterDescriptionItem = {
  text: string;
  path: FilterPath;
  groupType?: "and" | "or";
  isGroupStart?: boolean;
  isGroupEnd?: boolean;
  isOperator?: boolean;
  depth: number;
};

export function FilterBar({
  filter,
  onClick,
  isOpen,
  onChange,
}: FilterBarProps): JSX.Element {
  const removeFilter = (path: FilterPath): void => {
    let newFilter = { ...filter };

    if (path.length === 0) {
      // Clear all filters
      onChange({ type: "unfiltered" });
      return;
    }

    let current: Filter = newFilter;
    for (let i = 0; i < path.length - 1; i++) {
      if (current.type !== "group") break;
      current = current.filters[path[i]];
    }

    if (current.type === "group") {
      // Remove the filter at the specified index
      const lastIndex = path[path.length - 1];
      current.filters = [
        ...current.filters.slice(0, lastIndex),
        ...current.filters.slice(lastIndex + 1),
      ];

      // If this was the last filter in the group, remove the group
      if (current.filters.length === 0) {
        if (path.length === 1) {
          newFilter = { type: "unfiltered" };
        } else {
          removeFilter(path.slice(0, -1));
          return;
        }
      }
    }

    onChange(newFilter);
  };

  const getFilterDescription = (
    filter: Filter,
    path: FilterPath = [],
    depth: number = 0
  ): FilterDescriptionItem[] => {
    switch (filter.type) {
      case "value":
        return [{ text: `${filter.field}: ${filter.value}`, path, depth }];
      case "key-value":
        return [{ text: `${filter.key}: ${filter.value}`, path, depth }];
      case "group": {
        const items: FilterDescriptionItem[] = [];
        filter.filters.forEach((f, index) => {
          const childPath = [...path, index];
          const childItems = getFilterDescription(f, childPath, depth + 1);

          // Only add group boundaries for nested groups (depth > 0)
          if (index === 0 && depth > 0) {
            items.push({
              text: "",
              path: childPath,
              groupType: filter.type === "group" ? filter.logic : undefined,
              isGroupStart: true,
              depth,
            });
          }

          items.push(...childItems);

          // Add group type between items
          if (index < filter.filters.length - 1) {
            items.push({
              text: "",
              path: childPath,
              groupType: filter.type === "group" ? filter.logic : undefined,
              isOperator: true,
              depth,
            });
          }

          if (index === filter.filters.length - 1 && depth > 0) {
            items.push({
              text: "",
              path: childPath,
              isGroupEnd: true,
              depth,
            });
          }
        });
        return items;
      }
      case "unfiltered":
      default:
        return [];
    }
  };

  const filterDescriptions = getFilterDescription(filter);
  const hasFilters = !isUnfiltered(filter);

  return (
    <div
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-3 border dark:border-gray-700 rounded-lg cursor-pointer ${
        hasFilters
          ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40"
          : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
      }`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="flex items-center gap-2">
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>
        <span className="text-sm">
          {hasFilters ? (
            <div className="flex items-center flex-wrap">
              {filterDescriptions.map(
                (
                  {
                    text,
                    path,
                    groupType,
                    isGroupStart,
                    isGroupEnd,
                    isOperator,
                  },
                  index
                ) => (
                  <span
                    key={index}
                    className={`flex items-center ${isOperator && !isGroupStart && !isGroupEnd ? "mx-2" : ""} ${!isOperator ? "whitespace-nowrap" : ""}`}
                  >
                    {isGroupStart && (
                      <span className="text-gray-500 dark:text-gray-400 font-mono">
                        (
                      </span>
                    )}
                    {text && (
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-medium">
                        {text}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFilter(path);
                          }}
                          className="ml-1 p-0.5 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </span>
                    )}
                    {isOperator && (
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        {groupType === "and" ? "AND" : "OR"}
                      </span>
                    )}
                    {isGroupEnd && (
                      <span className="text-gray-500 dark:text-gray-400 font-mono">
                        )
                      </span>
                    )}
                  </span>
                )
              )}
            </div>
          ) : (
            "No filters applied"
          )}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {hasFilters && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeFilter([]);
              }}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            >
              Clear all
            </button>
            <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-xs font-medium px-2 py-1 rounded-full">
              {countFilters(filter)}
            </span>
          </>
        )}
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "transform rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </div>
  );
}
