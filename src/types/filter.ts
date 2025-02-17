export type FilterField = 'subject' | 'headers' | 'payload';
export type FilterOperator = 'contains'
export type FilterLogic = 'and' | 'or';

export type Filter = ValueFilter | KeyValueFilter | FilterGroup | Unfiltered;

export interface ValueFilter {
  type: 'value';
  field: 'subject' | 'payload';
  operator: FilterOperator;
  value: string;
}

export interface KeyValueFilter {
  type: 'key-value';
  field: 'headers';
  operator: FilterOperator;
  key: string;
  value: string;
}

export interface FilterGroup {
  type: 'group';
  logic: FilterLogic;
  filters: Filter[];
}

export interface Unfiltered {
  type: 'unfiltered';
}