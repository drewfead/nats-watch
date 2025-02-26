import { matchesFilter } from "./filter";
import { Filter, FilterGroup } from "@/types/filter";
import { NatsMessage } from "@/types/nats";

// Sample test messages
const testMessage1: NatsMessage = {
  type: "core",
  subject: "user.created",
  payload: '{"id": 123, "name": "John Doe"}',
  timestamp: new Date().toISOString(),
  headers: {
    "Content-Type": ["application/json"],
    "X-Request-ID": ["abc123"],
  },
};

const testMessage2: NatsMessage = {
  type: "core",
  subject: "order.completed",
  payload: '{"id": 456, "total": 99.99}',
  timestamp: new Date().toISOString(),
  headers: {
    "Content-Type": ["application/json"],
    "X-Request-ID": ["def456"],
  },
};

// Test filters
const subjectFilter1: Filter = {
  type: "value",
  field: "subject",
  operator: "contains",
  value: "user",
};

const subjectFilter2: Filter = {
  type: "value",
  field: "subject",
  operator: "contains",
  value: "order",
};

const payloadFilter: Filter = {
  type: "value",
  field: "payload",
  operator: "contains",
  value: "John",
};

describe("Filter matching", () => {
  describe("Individual filters", () => {
    test('should match message 1 with subject filter "user"', () => {
      expect(matchesFilter(testMessage1, subjectFilter1)).toBe(true);
    });

    test('should not match message 1 with subject filter "order"', () => {
      expect(matchesFilter(testMessage1, subjectFilter2)).toBe(false);
    });

    test('should not match message 2 with subject filter "user"', () => {
      expect(matchesFilter(testMessage2, subjectFilter1)).toBe(false);
    });

    test('should match message 2 with subject filter "order"', () => {
      expect(matchesFilter(testMessage2, subjectFilter2)).toBe(true);
    });

    test('should match message 1 with payload filter "John"', () => {
      expect(matchesFilter(testMessage1, payloadFilter)).toBe(true);
    });

    test('should not match message 2 with payload filter "John"', () => {
      expect(matchesFilter(testMessage2, payloadFilter)).toBe(false);
    });
  });

  describe("AND filter group", () => {
    const andFilterGroup: FilterGroup = {
      type: "group",
      logic: "and",
      filters: [subjectFilter1, payloadFilter],
    };

    test("should match message 1 with AND filter (user + John)", () => {
      expect(matchesFilter(testMessage1, andFilterGroup)).toBe(true);
    });

    test("should not match message 2 with AND filter (user + John)", () => {
      expect(matchesFilter(testMessage2, andFilterGroup)).toBe(false);
    });
  });

  describe("OR filter group", () => {
    const orFilterGroup: FilterGroup = {
      type: "group",
      logic: "or",
      filters: [subjectFilter1, subjectFilter2],
    };

    test("should match message 1 with OR filter (user OR order)", () => {
      expect(matchesFilter(testMessage1, orFilterGroup)).toBe(true);
    });

    test("should match message 2 with OR filter (user OR order)", () => {
      expect(matchesFilter(testMessage2, orFilterGroup)).toBe(true);
    });
  });

  describe("Nested filter groups", () => {
    const orFilterGroup: FilterGroup = {
      type: "group",
      logic: "or",
      filters: [subjectFilter1, subjectFilter2],
    };

    const nestedFilterGroup: FilterGroup = {
      type: "group",
      logic: "and",
      filters: [
        orFilterGroup,
        {
          type: "key-value",
          field: "headers",
          operator: "contains",
          key: "Content-Type",
          value: "json",
        },
      ],
    };

    test("should match message 1 with nested filter (user OR order) AND Content-Type contains json", () => {
      expect(matchesFilter(testMessage1, nestedFilterGroup)).toBe(true);
    });

    test("should match message 2 with nested filter (user OR order) AND Content-Type contains json", () => {
      expect(matchesFilter(testMessage2, nestedFilterGroup)).toBe(true);
    });
  });

  describe("Edge cases", () => {
    test("empty AND group should match all messages (always true)", () => {
      const emptyAndGroup: FilterGroup = {
        type: "group",
        logic: "and",
        filters: [],
      };

      expect(matchesFilter(testMessage1, emptyAndGroup)).toBe(true);
      expect(matchesFilter(testMessage2, emptyAndGroup)).toBe(true);
    });

    test("empty OR group should match no messages (always false)", () => {
      const emptyOrGroup: FilterGroup = {
        type: "group",
        logic: "or",
        filters: [],
      };

      expect(matchesFilter(testMessage1, emptyOrGroup)).toBe(false);
      expect(matchesFilter(testMessage2, emptyOrGroup)).toBe(false);
    });
  });
});
