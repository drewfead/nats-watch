import {
  Dialog,
  Transition,
  TransitionChild,
  DialogPanel,
  DialogTitle,
  Tab,
} from "@headlessui/react";
import { Fragment, JSX, useEffect, useState } from "react";
import {
  Filter,
  FilterGroup,
  FilterLogic,
  ValueFilter,
  KeyValueFilter,
  Unfiltered,
} from "@/types/filter";
import { CloseIcon, PlusIcon } from "@/components/icons";

interface FilterBuilderProps {
  filter: Filter;
  onChange: (filter: Filter) => void;
  isOpen: boolean;
  onClose: () => void;
}

const EMPTY_VALUE_FILTER: ValueFilter = {
  type: "value",
  field: "subject",
  operator: "contains",
  value: "",
};

const EMPTY_KEY_VALUE_FILTER: KeyValueFilter = {
  type: "key-value",
  field: "headers",
  operator: "contains",
  key: "",
  value: "",
};

const EMPTY_GROUP: FilterGroup = {
  type: "group",
  logic: "and",
  filters: [],
};

const UNFILTERED: Unfiltered = {
  type: "unfiltered",
};

interface SimpleFilterRowProps {
  filter: ValueFilter | KeyValueFilter | Unfiltered;
  onChange: (filter: ValueFilter | KeyValueFilter | Unfiltered) => void;
}

function SimpleFilterRow({
  filter,
  onChange,
}: SimpleFilterRowProps): JSX.Element {
  if (filter.type === "unfiltered") {
    return (
      <div className="flex items-center space-x-2">
        <select
          value="unfiltered"
          onChange={(e) => {
            const field = e.target.value;
            if (field === "unfiltered") {
              onChange(UNFILTERED);
            } else if (field === "headers") {
              onChange(EMPTY_KEY_VALUE_FILTER);
            } else {
              onChange({
                ...EMPTY_VALUE_FILTER,
                field: field as "subject" | "payload",
              });
            }
          }}
          className="rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2"
        >
          <option value="unfiltered">No Filter</option>
          <option value="subject">Subject</option>
          <option value="headers">Headers</option>
          <option value="payload">Payload</option>
        </select>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <select
        value={filter.field}
        onChange={(e) => {
          const field = e.target.value;
          if (field === "unfiltered") {
            onChange(UNFILTERED);
          } else if (field === "headers") {
            onChange(EMPTY_KEY_VALUE_FILTER);
          } else {
            onChange({
              ...EMPTY_VALUE_FILTER,
              field: field as "subject" | "payload",
            });
          }
        }}
        className="rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2"
      >
        <option value="unfiltered">No Filter</option>
        <option value="subject">Subject</option>
        <option value="headers">Headers</option>
        <option value="payload">Payload</option>
      </select>

      {filter.type === "key-value" && (
        <input
          type="text"
          value={filter.key}
          onChange={(e) => onChange({ ...filter, key: e.target.value })}
          className="flex-1 rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2"
          placeholder="Header key..."
        />
      )}

      <input
        type="text"
        value={filter.value}
        onChange={(e) => onChange({ ...filter, value: e.target.value })}
        className="flex-1 rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2"
        placeholder="Enter value..."
      />
    </div>
  );
}

interface FilterGroupComponentProps {
  group: FilterGroup;
  onChange: (group: FilterGroup) => void;
  onRemove?: () => void;
  isRoot?: boolean;
}

function FilterGroupComponent({
  group,
  onChange,
  onRemove,
  isRoot = false,
}: FilterGroupComponentProps): JSX.Element {
  const addFilter = (): void => {
    onChange({
      ...group,
      filters: [...group.filters, { ...EMPTY_VALUE_FILTER }],
    });
  };

  const addGroup = (): void => {
    onChange({
      ...group,
      filters: [...group.filters, { ...EMPTY_GROUP }],
    });
  };

  const updateFilter = (index: number, newValue: Filter): void => {
    const newFilters = [...group.filters];
    newFilters[index] = newValue;
    onChange({ ...group, filters: newFilters });
  };

  const removeFilter = (index: number): void => {
    onChange({
      ...group,
      filters: group.filters.filter((_, i) => i !== index),
    });
  };

  return (
    <div
      className={`space-y-4 ${!isRoot ? "border-l-2 pl-4 ml-2 border-gray-300 dark:border-gray-600" : ""}`}
    >
      <div className="flex items-center space-x-2">
        <select
          value={group.logic}
          onChange={(e) =>
            onChange({ ...group, logic: e.target.value as FilterLogic })
          }
          className="rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2"
        >
          <option value="and">AND</option>
          <option value="or">OR</option>
        </select>

        {!isRoot && (
          <button
            onClick={() => onRemove?.()}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="space-y-2">
        {group.filters.map((filter, index) =>
          filter.type === "group" ? (
            <FilterGroupComponent
              key={index}
              group={filter}
              onChange={(newGroup) => updateFilter(index, newGroup)}
              onRemove={() => removeFilter(index)}
            />
          ) : (
            <div key={index} className="flex items-start space-x-2">
              <SimpleFilterRow
                filter={filter}
                onChange={(newFilter) => updateFilter(index, newFilter)}
              />
              <button
                onClick={() => removeFilter(index)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
          )
        )}
      </div>

      <div className="flex space-x-2">
        <button
          onClick={addFilter}
          className="inline-flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          <PlusIcon className="h-4 w-4" />
          <span>Add Filter</span>
        </button>
        <button
          onClick={addGroup}
          className="inline-flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          <PlusIcon className="h-4 w-4" />
          <span>Add Group</span>
        </button>
      </div>
    </div>
  );
}

export function FilterBuilder({
  filter,
  onChange,
  isOpen,
  onClose,
}: FilterBuilderProps): JSX.Element {
  const [selectedTab, setSelectedTab] = useState(0);
  const [simpleFilter, setSimpleFilter] = useState<
    ValueFilter | KeyValueFilter | Unfiltered
  >(filter.type === "group" ? UNFILTERED : filter);
  const [advancedFilter, setAdvancedFilter] = useState<FilterGroup>(
    filter.type === "group" ? filter : EMPTY_GROUP
  );

  useEffect(() => {
    if (filter.type === "group") {
      setAdvancedFilter(filter);
      setSelectedTab(1);
    } else {
      setSimpleFilter(filter);
      setSelectedTab(0);
    }
  }, [filter]);

  const handleFilterChange = (newFilter: Filter): void => {
    onChange(newFilter);
  };

  const handleClearFilter = (): void => {
    handleFilterChange(UNFILTERED);
    onClose();
  };

  const handleTabChange = (index: number): void => {
    setSelectedTab(index);
    if (index === 0) {
      handleFilterChange(simpleFilter);
    } else {
      handleFilterChange(advancedFilter);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-xl transition-all">
                <DialogTitle
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4"
                >
                  Filter Messages
                </DialogTitle>

                <Tab.Group
                  selectedIndex={selectedTab}
                  onChange={handleTabChange}
                >
                  <Tab.List className="flex space-x-1 rounded-xl bg-gray-100 dark:bg-gray-700 p-1 mb-4">
                    <Tab
                      className={({ selected }) =>
                        `w-full rounded-lg py-2.5 text-sm font-medium leading-5 ${
                          selected
                            ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow"
                            : "text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                        }`
                      }
                    >
                      Simple
                    </Tab>
                    <Tab
                      className={({ selected }) =>
                        `w-full rounded-lg py-2.5 text-sm font-medium leading-5 ${
                          selected
                            ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow"
                            : "text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                        }`
                      }
                    >
                      Advanced
                    </Tab>
                  </Tab.List>
                  <Tab.Panels>
                    <Tab.Panel>
                      <SimpleFilterRow
                        filter={simpleFilter}
                        onChange={(newFilter) => {
                          setSimpleFilter(newFilter);
                          handleFilterChange(newFilter);
                        }}
                      />
                    </Tab.Panel>
                    <Tab.Panel>
                      <FilterGroupComponent
                        group={advancedFilter}
                        onChange={(newGroup) => {
                          setAdvancedFilter(newGroup);
                          handleFilterChange(newGroup);
                        }}
                        isRoot
                      />
                    </Tab.Panel>
                  </Tab.Panels>
                </Tab.Group>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={handleClearFilter}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                  >
                    Clear Filter
                  </button>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                  >
                    Done
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
