"use client";

import { JSX, useRef, useState, useEffect } from "react";
import { isValidJetStreamSubject } from "@/lib/nats-client-ops";
import { StreamMetadata } from "@/types/nats";
import { useSubscription } from "./subscription-context";

export interface SubjectPickerProps {
  stream: StreamMetadata;
}

export function SubjectPicker({ stream }: SubjectPickerProps): JSX.Element {
  const {
    subject,
    setSubject,
    isConnecting,
    showUnsubscribeWarning,
    setPendingSubjectChange,
    setShowUnsubscribeWarning,
  } = useSubscription();

  const inputRef = useRef<HTMLInputElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showErrorTooltip, setShowErrorTooltip] = useState(false);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const validationTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const [isTyping, setIsTyping] = useState(false);

  const suggestions = getSubjectSuggestions(subject, stream.subjectPrefixes);
  const validation = isValidJetStreamSubject(subject, stream.subjectPrefixes);
  const isValidInput = validation.isValid;

  const handleSubjectChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ): void => {
    const newValue = e.target.value;

    if (showUnsubscribeWarning) {
      setPendingSubjectChange(newValue);
      setShowUnsubscribeWarning(true);
      return;
    }

    setSubject(newValue);
    setShowSuggestions(
      getSubjectSuggestions(newValue, stream.subjectPrefixes || []).length > 0
    );

    setIsTyping(true);
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }

    validationTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 500);
  };

  useEffect(() => {
    if (subject && !validation.isValid && !isTyping) {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
      setShowErrorTooltip(true);
      tooltipTimeoutRef.current = setTimeout(() => {
        setShowErrorTooltip(false);
      }, 2000);
    }

    return (): void => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [subject, validation.isValid, isTyping]);

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={subject}
          onChange={handleSubjectChange}
          onFocus={() => {
            if (!subject) {
              setShowSuggestions(true);
            }
          }}
          onBlur={() => {
            setTimeout(() => setShowSuggestions(false), 200);
            setIsTyping(false);
          }}
          placeholder={
            stream
              ? "Click here to see available patterns"
              : "Select a stream first"
          }
          className={`w-full px-4 py-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 ${
            subject ? "pr-10" : ""
          } ${
            isValidInput ? "focus:ring-blue-500" : "focus:ring-red-500"
          } ${!stream ? "opacity-50 cursor-not-allowed" : ""}`}
          required
          disabled={isConnecting || !stream}
        />
        {subject && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
            {isValidInput ? (
              <svg
                className="w-4 h-4 text-green-500"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <div className="group relative flex items-center">
                <svg
                  className="w-4 h-4 text-red-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                <div
                  className={`absolute top-full left-0 mt-2 w-60 px-3 py-2 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm whitespace-normal transition-opacity duration-200 ${
                    showErrorTooltip
                      ? "visible opacity-100"
                      : "invisible opacity-0 group-hover:visible group-hover:opacity-100"
                  }`}
                >
                  {validation.error}
                  <div className="absolute top-0 left-4 w-2 h-2 -mt-1 rotate-45 bg-red-50 dark:bg-red-900/50 border-t border-l border-red-200 dark:border-red-800"></div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {showSuggestions && stream && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg">
          {!subject && (
            <div className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border-b dark:border-gray-700">
              Available subject patterns for this stream:
            </div>
          )}
          <ul className="max-h-60 overflow-auto">
            {suggestions.map((suggestion, index) => (
              <li
                key={index}
                className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer group"
                onClick={() => {
                  setSubject(suggestion.text);
                  setShowSuggestions(false);
                  inputRef.current?.focus();
                }}
              >
                <div className="flex items-center gap-2">
                  {suggestion.type === "single-token" && (
                    <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                      *
                    </span>
                  )}
                  {suggestion.type === "multi-token" && (
                    <span className="text-xs px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded">
                      &gt;
                    </span>
                  )}
                  {suggestion.type === "exact" && (
                    <span className="text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">
                      exact
                    </span>
                  )}
                  <span
                    className={`text-gray-900 dark:text-white ${
                      suggestion.type === "current" ? "font-semibold" : ""
                    }`}
                  >
                    {suggestion.text}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 group-hover:text-gray-700 dark:group-hover:text-gray-300">
                  {suggestion.description}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function getSubjectSuggestions(
  input: string,
  prefixes: string[]
): Array<{
  text: string;
  description: string;
  type: "exact" | "single-token" | "multi-token" | "current";
}> {
  if (!input) {
    // When no input, show all available patterns with descriptions
    return prefixes.map((prefix) => {
      if (prefix.endsWith("*")) {
        return {
          text: prefix,
          description: `Replace * with any single token (e.g., ${prefix.slice(0, -1)}value)`,
          type: "single-token",
        };
      } else if (prefix.endsWith(">")) {
        return {
          text: prefix,
          description: `Replace > with any number of tokens (e.g., ${prefix.slice(0, -1)}foo.bar)`,
          type: "multi-token",
        };
      } else {
        return {
          text: prefix,
          description: "Exact match required",
          type: "exact",
        };
      }
    });
  }

  const suggestions: Array<{
    text: string;
    description: string;
    type: "exact" | "single-token" | "multi-token" | "current";
  }> = [];

  for (const prefix of prefixes) {
    if (prefix.endsWith("*")) {
      const base = prefix.slice(0, -1);
      if (input.startsWith(base)) {
        // If they're typing after the prefix base, suggest their current input
        suggestions.push({
          text: input,
          description: "Your current input",
          type: "current",
        });
      } else if (base.startsWith(input)) {
        // If they're still typing the prefix, suggest the pattern
        suggestions.push({
          text: prefix,
          description: `Replace * with any single token (e.g., ${base}value)`,
          type: "single-token",
        });
      }
    } else if (prefix.endsWith(">")) {
      const base = prefix.slice(0, -1);
      if (input.startsWith(base)) {
        // If they're typing after the prefix base, suggest their current input
        suggestions.push({
          text: input,
          description: "Your current input",
          type: "current",
        });
      } else if (base.startsWith(input)) {
        // If they're still typing the prefix, suggest the pattern
        suggestions.push({
          text: prefix,
          description: `Replace > with any number of tokens (e.g., ${base}foo.bar)`,
          type: "multi-token",
        });
      }
    } else if (prefix.startsWith(input)) {
      // For exact matches, only suggest if they're typing the prefix
      suggestions.push({
        text: prefix,
        description: "Exact match required",
        type: "exact",
      });
    }
  }

  // Remove duplicates while preserving order
  const seen = new Set<string>();
  return suggestions.filter((suggestion) => {
    if (seen.has(suggestion.text)) return false;
    seen.add(suggestion.text);
    return true;
  });
}
