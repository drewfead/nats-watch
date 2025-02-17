import { Dialog, Transition, TransitionChild, DialogPanel, DialogTitle, Tab } from '@headlessui/react';
import { Fragment, useEffect, useState } from 'react';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Filter, FilterGroup, FilterLogic, ValueFilter, KeyValueFilter, Unfiltered } from '@/types/filter';

interface FilterBuilderProps {
  filter: Filter;
  onChange: (filter: Filter) => void;
  isOpen: boolean;
  onClose: () => void;
}

const EMPTY_VALUE_FILTER: ValueFilter = {
  type: 'value',
  field: 'subject',
  operator: 'contains',
  value: ''
};

const EMPTY_KEY_VALUE_FILTER: KeyValueFilter = {
  type: 'key-value',
  field: 'headers',
  operator: 'contains',
  key: '',
  value: ''
};

const EMPTY_GROUP: FilterGroup = {
  type: 'group',
  logic: 'and',
  filters: []
};

const UNFILTERED: Unfiltered = {
  type: 'unfiltered'
};

interface SimpleFilterRowProps {
  filter: ValueFilter | KeyValueFilter | Unfiltered;
  onChange: (filter: ValueFilter | KeyValueFilter | Unfiltered) => void;
}

function SimpleFilterRow({ filter, onChange }: SimpleFilterRowProps) {
  if (filter.type === 'unfiltered') {
    return (
      <div className="flex items-center space-x-2">
        <select
          value="unfiltered"
          onChange={(e) => {
            const field = e.target.value;
            if (field === 'unfiltered') {
              onChange(UNFILTERED);
            } else if (field === 'headers') {
              onChange(EMPTY_KEY_VALUE_FILTER);
            } else {
              onChange({ ...EMPTY_VALUE_FILTER, field: field as 'subject' | 'payload' });
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
          if (field === 'unfiltered') {
            onChange(UNFILTERED);
          } else if (field === 'headers') {
            onChange(EMPTY_KEY_VALUE_FILTER);
          } else {
            onChange({ ...EMPTY_VALUE_FILTER, field: field as 'subject' | 'payload' });
          }
        }}
        className="rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2"
      >
        <option value="unfiltered">No Filter</option>
        <option value="subject">Subject</option>
        <option value="headers">Headers</option>
        <option value="payload">Payload</option>
      </select>

      {filter.type === 'key-value' && (
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

function FilterGroupComponent({ group, onChange, onRemove, isRoot = false }: FilterGroupComponentProps) {
  const addFilter = () => {
    onChange({
      ...group,
      filters: [...group.filters, { ...EMPTY_VALUE_FILTER }]
    });
  };

  const addGroup = () => {
    onChange({
      ...group,
      filters: [...group.filters, { ...EMPTY_GROUP }]
    });
  };

  const updateFilter = (index: number, newValue: Filter) => {
    const newFilters = [...group.filters];
    newFilters[index] = newValue;
    onChange({ ...group, filters: newFilters });
  };

  const removeFilter = (index: number) => {
    onChange({
      ...group,
      filters: group.filters.filter((_, i) => i !== index)
    });
  };

  return (
    <div className={`space-y-4 ${!isRoot ? 'border-l-2 pl-4 ml-2 border-gray-300 dark:border-gray-600' : ''}`}>
      <div className="flex items-center space-x-2">
        <select
          value={group.logic}
          onChange={(e) => onChange({ ...group, logic: e.target.value as FilterLogic })}
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
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="space-y-2">
        {group.filters.map((filter, index) => (
          filter.type === 'group' ? (
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
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          )
        ))}
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

export function FilterBuilder({ filter, onChange, isOpen, onClose }: FilterBuilderProps) {
  const [activeFilter, setActiveFilter] = useState<Filter>(filter);
  const [selectedTab, setSelectedTab] = useState(filter.type === 'group' ? 1 : 0);
  
  useEffect(() => {
    if (isOpen) {
      setActiveFilter(filter);
      setSelectedTab(filter.type === 'group' ? 1 : 0);
    }
  }, [isOpen, filter]);
  
  const handleFilterChange = (newFilter: Filter) => {
    setActiveFilter(newFilter);
    onChange(newFilter);
  };

  const handleClearFilter = () => {
    const emptyFilter = selectedTab === 1 ? { ...EMPTY_GROUP } : UNFILTERED;
    setActiveFilter(emptyFilter);
    onChange(emptyFilter);
    onClose();
  };

  const handleTabChange = (index: number) => {
    setSelectedTab(index);
    if (index === 1) {
      // Switching to advanced mode
      if (activeFilter.type === 'unfiltered') {
        // Switch to advanced mode with empty group
        const newGroup: FilterGroup = {
          type: 'group',
          logic: 'and',
          filters: []
        };
        setActiveFilter(newGroup);
        onChange(newGroup);
      } else if (activeFilter.type !== 'group') {
        // Switch to advanced mode - wrap current filter in a group
        const newGroup: FilterGroup = {
          type: 'group',
          logic: 'and',
          filters: [activeFilter]
        };
        setActiveFilter(newGroup);
        onChange(newGroup);
      }
    } else {
      // Switching to simple mode
      if (activeFilter.type === 'group') {
        // Take the first filter from the group if it exists
        const group = activeFilter as FilterGroup;
        const firstFilter = group.filters[0] || UNFILTERED;
        setActiveFilter(firstFilter);
        onChange(firstFilter);
      }
    }
  };

  // Ensure we have valid filter types for each tab
  const simpleFilter = activeFilter.type === 'group' ? UNFILTERED : activeFilter;
  const advancedFilter = activeFilter.type === 'group' ? activeFilter : { ...EMPTY_GROUP, filters: activeFilter.type === 'unfiltered' ? [] : [activeFilter] };

  return (
    <>      
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
            <div className="fixed inset-0 bg-black bg-opacity-25 dark:bg-opacity-50" />
          </TransitionChild>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <DialogPanel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                  <DialogTitle
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 mb-4"
                  >
                    Filter Messages
                  </DialogTitle>

                  <Tab.Group selectedIndex={selectedTab} onChange={handleTabChange}>
                    <Tab.List className="flex space-x-2 rounded-xl bg-gray-100 dark:bg-gray-700/50 p-1 mb-4">
                      <Tab
                        className={({ selected }) =>
                          `w-full rounded-lg py-2.5 text-sm font-medium leading-5
                           ${selected
                            ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                          }`
                        }
                      >
                        Simple
                      </Tab>
                      <Tab
                        className={({ selected }) =>
                          `w-full rounded-lg py-2.5 text-sm font-medium leading-5
                           ${selected
                            ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
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
                          onChange={handleFilterChange}
                        />
                      </Tab.Panel>
                      <Tab.Panel>
                        <FilterGroupComponent
                          group={advancedFilter as FilterGroup}
                          onChange={(newGroup) => handleFilterChange(newGroup)}
                          isRoot
                        />
                      </Tab.Panel>
                    </Tab.Panels>
                  </Tab.Group>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={handleClearFilter}
                      className="inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
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
    </>
  );
} 
