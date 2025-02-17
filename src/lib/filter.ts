import { FilterGroup, Filter, KeyValueFilter, ValueFilter } from '@/types/filter';
import { JetStreamMessage, NatsMessage } from '@/types/nats';

export function matchesFilter(msg: NatsMessage | JetStreamMessage, filter: Filter): boolean {
    return matchesFilterNode(msg, filter);
}

function matchesFilterNode(msg: NatsMessage | JetStreamMessage, filter: Filter): boolean {
    switch (filter.type) {
        case 'group':
            return matchesFilterGroup(msg, filter);
        case 'value':
            return matchesValueFilter(msg, filter);
        case 'key-value':
            return matchesKeyValueFilter(msg, filter);
        case 'unfiltered':
            return true;
    }
}

function matchesFilterGroup(msg: NatsMessage | JetStreamMessage, filter: FilterGroup): boolean {
    return filter.filters.every(f => matchesFilterNode(msg, f));
}

function matchesValueFilter(msg: NatsMessage | JetStreamMessage, filter: ValueFilter): boolean {
    switch (filter.field) {
        case 'subject':
            return matchesSubscriptionFilterSubject(msg, filter);
        case 'payload':
            return matchesSubscriptionFilterPayload(msg, filter);
    }
}

function matchesKeyValueFilter(msg: NatsMessage | JetStreamMessage, filter: KeyValueFilter): boolean {
    switch (filter.operator) {
        case 'contains':
            return msg.headers?.[filter.key]?.some(header => header.includes(filter.value)) ?? false;
    }
}
function matchesSubscriptionFilterSubject(msg: NatsMessage | JetStreamMessage, filter: ValueFilter): boolean {
    switch (filter.operator) {
        case 'contains':
            return msg.subject.includes(filter.value);
    }
}

function matchesSubscriptionFilterPayload(msg: NatsMessage | JetStreamMessage, filter: ValueFilter): boolean {
    switch (filter.operator) {
        case 'contains':
            return msg.payload.includes(filter.value);
    }
}

export function describeFilter(filter: Filter): string {
    return describeFilterNode(filter);
}

function describeFilterNode(filter: Filter): string {
    switch (filter.type) {
        case 'group':
            return describeFilterGroup(filter);
        case 'value':
            return describeValueFilter(filter);
        case 'key-value':
            return describeKeyValueFilter(filter);
        case 'unfiltered':
            return 'Unfiltered';
    }
}

function describeValueFilter(filter: ValueFilter): string {
    return `${filter.field} ${filter.operator} ${filter.value}`;
}

function describeKeyValueFilter(filter: KeyValueFilter): string {
    return `${filter.field} ${filter.key} ${filter.operator} ${filter.value}`;
}

function describeFilterGroup(filterGroup: FilterGroup): string {
    return `${filterGroup.logic} (${filterGroup.filters.map(describeFilterNode).join(', ')})`;
}

export function countFilters(filter: Filter): number {
    return countFiltersFromNode(filter);
}

function countFiltersFromNode(filter: Filter): number {
    switch (filter.type) {
        case 'group':
            return filter.filters.reduce((acc, f) => acc + countFiltersFromNode(f), 0);
        case 'value':
            return 1;
        case 'key-value':
            return 1;
        case 'unfiltered':
            return 0;
    }
}

export function isUnfiltered(filter: Filter): boolean {
    return countFilters(filter) === 0;
}

