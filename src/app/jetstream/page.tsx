'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MessageDetail } from '@/components/MessageDetail';
import { MessageList } from '@/components/MessageList';
import { FilterBuilder } from '@/components/FilterBuilder';
import { Navigation } from '@/components/Navigation';
import { NatsMessage, JetStreamMessage, EventEnvelope, StreamMetadata } from '@/types/nats';
import { getStreams } from '@/app/actions';
import { Filter } from '@/types/filter';
import { FilterBar } from '@/components/FilterBar';
import { SubscriptionStatusBar } from '@/components/SubscriptionStatusBar';

function isValidSubject(subject: string, prefix: string): boolean {
  if (prefix.endsWith('*')) {
    const base = prefix.slice(0, -1);
    const remaining = subject.slice(base.length);
    // Must match exactly one token without dots after the prefix
    return subject.startsWith(base) && !remaining.includes('.') && remaining.length > 0;
  } else if (prefix.endsWith('>')) {
    const base = prefix.slice(0, -1);
    // Can match any number of tokens after the prefix
    return subject.startsWith(base);
  } else {
    // Must match exactly
    return subject === prefix;
  }
}

function getSubjectSuggestions(input: string, prefixes: string[]): Array<{
  text: string;
  description: string;
  type: 'exact' | 'single-token' | 'multi-token' | 'current';
}> {
  if (!input) {
    // When no input, show all available patterns with descriptions
    return prefixes.map(prefix => {
      if (prefix.endsWith('*')) {
        return {
          text: prefix,
          description: `Replace * with any single token (e.g., ${prefix.slice(0, -1)}value)`,
          type: 'single-token'
        };
      } else if (prefix.endsWith('>')) {
        return {
          text: prefix,
          description: `Replace > with any number of tokens (e.g., ${prefix.slice(0, -1)}foo.bar)`,
          type: 'multi-token'
        };
      } else {
        return {
          text: prefix,
          description: 'Exact match required',
          type: 'exact'
        };
      }
    });
  }
  
  const suggestions: Array<{
    text: string;
    description: string;
    type: 'exact' | 'single-token' | 'multi-token' | 'current';
  }> = [];

  for (const prefix of prefixes) {
    if (prefix.endsWith('*')) {
      const base = prefix.slice(0, -1);
      if (input.startsWith(base)) {
        // If they're typing after the prefix base, suggest their current input
        suggestions.push({
          text: input,
          description: 'Your current input',
          type: 'current'
        });
      } else if (base.startsWith(input)) {
        // If they're still typing the prefix, suggest the pattern
        suggestions.push({
          text: prefix,
          description: `Replace * with any single token (e.g., ${base}value)`,
          type: 'single-token'
        });
      }
    } else if (prefix.endsWith('>')) {
      const base = prefix.slice(0, -1);
      if (input.startsWith(base)) {
        // If they're typing after the prefix base, suggest their current input
        suggestions.push({
          text: input,
          description: 'Your current input',
          type: 'current'
        });
      } else if (base.startsWith(input)) {
        // If they're still typing the prefix, suggest the pattern
        suggestions.push({
          text: prefix,
          description: `Replace > with any number of tokens (e.g., ${base}foo.bar)`,
          type: 'multi-token'
        });
      }
    } else if (prefix.startsWith(input)) {
      // For exact matches, only suggest if they're typing the prefix
      suggestions.push({
        text: prefix,
        description: 'Exact match required',
        type: 'exact'
      });
    }
  }
  
  // Remove duplicates while preserving order
  const seen = new Set<string>();
  return suggestions.filter(suggestion => {
    if (seen.has(suggestion.text)) return false;
    seen.add(suggestion.text);
    return true;
  });
}

function isValidNatsSubject(subject: string): { isValid: boolean; error?: string } {
  if (!subject) {
    return { isValid: false, error: 'Subject cannot be empty' };
  }

  if (/\s/.test(subject)) {
    return { isValid: false, error: 'Subject cannot contain whitespace' };
  }

  // Check for invalid characters (anything that's not alphanumeric, dot, star, or greater than)
  const invalidCharMatch = subject.match(/[^a-zA-Z0-9.*>-]/);
  if (invalidCharMatch) {
    return { 
      isValid: false, 
      error: `Invalid character "${invalidCharMatch[0]}" in subject (only alphanumeric, dots, wildcards, and hyphens allowed)` 
    };
  }

  // Check for subject ending with a dot
  if (subject.endsWith('.')) {
    return { 
      isValid: false, 
      error: 'Subject cannot end with a dot - must end with a token or wildcard' 
    };
  }

  // Check for valid token structure
  const tokens = subject.split('.');
  if (tokens.some(token => token.length === 0)) {
    return { isValid: false, error: 'Empty tokens are not allowed (e.g., foo..bar)' };
  }

  // Check for valid wildcard usage
  if (subject.includes('*') && !subject.endsWith('*')) {
    return { isValid: false, error: 'Wildcard * can only appear at the end of a token' };
  }

  if (subject.includes('>') && !subject.endsWith('>')) {
    return { isValid: false, error: 'Wildcard > can only appear at the end of the subject' };
  }

  return { isValid: true };
}

// Validate JetStream subject against both base rules and prefix patterns
function isValidJetStreamSubject(subject: string, prefixes: string[]): { isValid: boolean; error?: string } {
  // First check base NATS subject rules
  const baseValidation = isValidNatsSubject(subject);
  if (!baseValidation.isValid) {
    return baseValidation;
  }

  // Then check if it matches any of the stream's patterns
  const matchesPattern = prefixes.some(prefix => isValidSubject(subject, prefix));
  if (!matchesPattern) {
    return { isValid: false, error: 'Subject must match one of the stream\'s patterns' };
  }

  return { isValid: true };
}

export default function JetStreamPage() {
  const [subject, setSubject] = useState('');
  const [stream, setStream] = useState('');
  const [streams, setStreams] = useState<StreamMetadata[]>([]);
  const [messages, setMessages] = useState<EventEnvelope[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<NatsMessage | JetStreamMessage | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showErrorTooltip, setShowErrorTooltip] = useState(false);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const validationTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const [isTyping, setIsTyping] = useState(false);
  const [filter, setFilter] = useState<Filter>({type: 'unfiltered'});
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [showUnsubscribeWarning, setShowUnsubscribeWarning] = useState(false);
  const [pendingSubjectChange, setPendingSubjectChange] = useState<string | null>(null);
  const [showStreamDropdown, setShowStreamDropdown] = useState(false);
  const streamDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getStreams()
      .then(({ success, streams, error }) => {
        if (success) {
          setStreams(streams || []);
        } else {
          setError(error || 'Failed to fetch stream information');
        }
      })
      .catch(err => {
        console.error('Failed to fetch streams:', err);
        setError('Failed to fetch stream information');
      });
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (streamDropdownRef.current && !streamDropdownRef.current.contains(event.target as Node)) {
        setShowStreamDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleUnsubscribe = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsSubscribed(false);
    setMessages([]);
    setSelectedMessage(null);
  };

  const handleClearMessages = () => {
    setMessages([]);
    setSelectedMessage(null);
  };

  useEffect(() => {
    if (!isSubscribed || !subject || !stream) return;

    const url = new URL('/api/subscribe', window.location.origin);
    url.searchParams.set('subject', subject);
    url.searchParams.set('stream', stream);

    const eventSource = new EventSource(url.toString());
    eventSourceRef.current = eventSource;
    setIsConnecting(true);
    setError(null);

    eventSource.onmessage = (event) => {
      try {
        const envelope = JSON.parse(event.data) as EventEnvelope;
        
        switch (envelope.type) {
          case 'message':
            setMessages(prev => [...prev, envelope]);
            break;
          
          case 'control':
            if (envelope.payload.type === 'connection_status') {
              if (envelope.payload.status === 'connected') {
                setIsConnecting(false);
              } else if (envelope.payload.status === 'disconnected') {
                setIsConnecting(false);
                setIsSubscribed(false);
                eventSource.close();
              }
            } else if (envelope.payload.type === 'heartbeat') {
              setIsConnecting(false);
            }
            break;
        }
      } catch (err) {
        console.error('Error parsing message:', err);
      }
    };

    eventSource.onerror = (event) => {
      console.error('EventSource error:', event);
      setError('Connection error. Please try again.');
      setIsConnecting(false);
      eventSource.close();
      setIsSubscribed(false);
    };

    return () => {
      eventSource.close();
      setIsConnecting(false);
    };
  }, [isSubscribed, subject, stream]);

  const handleSubscribe = () => {
    if (!subject || !stream) return;
    setMessages([]);
    setIsSubscribed(true);
  };

  const selectedStream = streams.find(s => s.name === stream);
  const suggestions = selectedStream
    ? getSubjectSuggestions(subject, selectedStream.subjectPrefixes)
    : [];
  
  const validation = useMemo(() => selectedStream 
    ? isValidJetStreamSubject(subject, selectedStream.subjectPrefixes)
    : { isValid: true }, [subject, selectedStream]);
  
  const isValidInput = validation.isValid;

  const handleSubjectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    // If we're subscribed, show warning before changing
    if (isSubscribed) {
      setPendingSubjectChange(newValue);
      setShowUnsubscribeWarning(true);
      return;
    }

    setSubject(newValue);
    // Only show suggestions while typing if there are matches
    setShowSuggestions(getSubjectSuggestions(newValue, selectedStream?.subjectPrefixes || []).length > 0);
    
    // Set typing state and clear previous timeouts
    setIsTyping(true);
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }

    // Debounce the end of typing
    validationTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 500);
  };

  const handleConfirmSubjectChange = () => {
    if (pendingSubjectChange !== null) {
      handleUnsubscribe();
      setSubject(pendingSubjectChange);
      setShowSuggestions(getSubjectSuggestions(pendingSubjectChange, selectedStream?.subjectPrefixes || []).length > 0);
      setPendingSubjectChange(null);
    }
    setShowUnsubscribeWarning(false);
  };

  const handleCancelSubjectChange = () => {
    setPendingSubjectChange(null);
    setShowUnsubscribeWarning(false);
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

    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [subject, validation.isValid, isTyping]);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      <div className="flex-1">
        <div className="container mx-auto p-6 max-w-4xl">
          <div className="mb-8 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-1/3 relative" ref={streamDropdownRef}>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowStreamDropdown(!showStreamDropdown)}
                    disabled={isConnecting}
                    className="w-full px-4 py-3 pr-10 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-left"
                  >
                    {stream ? (streams.find(s => s.name === stream)?.name || 'Select a stream...') : 'Select a stream...'}
                  </button>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <svg
                      className="w-4 h-4 text-gray-600 dark:text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                {showStreamDropdown && (
                  <div 
                    className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto"
                    style={{
                      bottom: 'auto',
                      top: '100%'
                    }}
                  >
                    {streams.map(s => (
                      <button
                        key={s.name}
                        className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700"
                        onClick={() => {
                          setStream(s.name);
                          setSubject('');
                          if (isSubscribed) {
                            handleUnsubscribe();
                          }
                          setShowStreamDropdown(false);
                        }}
                      >
                        <div className="font-medium text-gray-900 dark:text-white">
                          {s.name}
                        </div>
                        {s.description && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {s.description}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="w-2/3 relative">
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
                    placeholder={stream 
                      ? "Click here to see available patterns"
                      : "Select a stream first"
                    }
                    className={`w-full px-4 py-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 ${
                      subject ? 'pr-10' : ''
                    } ${
                      isValidInput ? 'focus:ring-blue-500' : 'focus:ring-red-500'
                    } ${
                      !stream ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    required
                    disabled={isConnecting || !stream}
                  />
                  {subject && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                      {isValidInput ? (
                        <svg className="w-4 h-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <div className="group relative flex items-center">
                          <svg className="w-4 h-4 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          <div className={`absolute top-full left-0 mt-2 w-60 px-3 py-2 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm whitespace-normal transition-opacity duration-200 ${
                            showErrorTooltip ? 'visible opacity-100' : 'invisible opacity-0 group-hover:visible group-hover:opacity-100'
                          }`}>
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
                            {suggestion.type === 'single-token' && (
                              <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                                *
                              </span>
                            )}
                            {suggestion.type === 'multi-token' && (
                              <span className="text-xs px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded">
                                &gt;
                              </span>
                            )}
                            {suggestion.type === 'exact' && (
                              <span className="text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">
                                exact
                              </span>
                            )}
                            <span 
                              className={`text-gray-900 dark:text-white ${
                                suggestion.type === 'current' ? 'font-semibold' : ''
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
            </div>

            <FilterBar
              filter={filter}
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              isOpen={isFilterOpen}
              onChange={setFilter}
            />
            <FilterBuilder
              filter={filter}
              onChange={setFilter}
              isOpen={isFilterOpen}
              onClose={() => setIsFilterOpen(false)}
            />

            <SubscriptionStatusBar
              isSubscribed={isSubscribed}
              isConnecting={isConnecting}
              isDisabled={!stream || !isValidInput}
              onSubscribe={handleSubscribe}
              onUnsubscribe={handleUnsubscribe}
            />
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Messages</h2>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {messages.length} message{messages.length !== 1 ? 's' : ''}
                </span>
                {messages.length > 0 && (
                  <button
                    onClick={handleClearMessages}
                    className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  >
                    Clear Messages
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4">
              {messages.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">
                  {isConnecting
                    ? 'Connecting to NATS...'
                    : isSubscribed 
                      ? 'Waiting for messages...' 
                      : 'No messages received yet. Subscribe to a subject to see messages.'}
                </p>
              ) : (
                <MessageList
                  messages={messages}
                  onMessageClick={setSelectedMessage}
                  filter={filter}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedMessage && (
        <div className="fixed inset-0 bg-black/20 dark:bg-black/40">
          <div className="absolute inset-y-0 right-0 w-full max-w-2xl">
            <MessageDetail
              message={selectedMessage}
              onClose={() => setSelectedMessage(null)}
              embedded={false}
            />
          </div>
        </div>
      )}

      {showUnsubscribeWarning && (
        <div className="fixed inset-0 bg-black/20 dark:bg-black/40 z-50">
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Confirm Subject Change
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Changing the subject will unsubscribe you from the current stream. Do you want to proceed?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleCancelSubjectChange}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSubjectChange}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                >
                  Proceed
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 