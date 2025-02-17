'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MessageDetail } from '@/components/MessageDetail';
import { MessageList } from '@/components/MessageList';
import { FilterBuilder } from '@/components/FilterBuilder';
import { Navigation } from '@/components/Navigation';
import { NatsMessage, EventEnvelope } from '@/types/nats';
import { Filter } from '@/types/filter';
import { FilterBar } from '@/components/FilterBar';
import { SubscriptionStatusBar } from '@/components/SubscriptionStatusBar';

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

export default function CorePage() {
  const [subject, setSubject] = useState('');
  const [messages, setMessages] = useState<EventEnvelope[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<NatsMessage | null>(null);
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
    if (!isSubscribed || !subject) return;

    const url = new URL('/api/subscribe', window.location.origin);
    url.searchParams.set('subject', subject);

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
  }, [isSubscribed, subject]);

  const handleSubscribe = () => {
    if (!subject) return;
    setMessages([]);
    setIsSubscribed(true);
  };

  const validation = useMemo(() => isValidNatsSubject(subject), [subject]);
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
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={subject}
                onChange={handleSubjectChange}
                placeholder="Enter subject (e.g., foo.*, foo.bar.>)"
                className={`w-full px-4 py-3 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 ${
                  isValidInput ? 'focus:ring-blue-500' : 'focus:ring-red-500'
                }`}
                required
                disabled={isConnecting}
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
              isDisabled={!isValidInput}
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