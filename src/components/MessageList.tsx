import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { EventEnvelope, NatsMessage, JetStreamMessage } from '@/types/nats';
import { MessageItem } from './MessageItem';
import { Filter } from '@/types/filter';
import { isUnfiltered, matchesFilter } from '@/lib/filter';

export const ROW_HEIGHT = 48;

export interface MessageListProps {
  messages: EventEnvelope[];
  onMessageClick?: (message: NatsMessage | JetStreamMessage) => void;
  className?: string;
  filter: Filter;
}

export function MessageList({ messages, onMessageClick, className = '', filter }: MessageListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Filter and reverse messages for display
  const displayMessages = [...messages]
    .filter(msg => {
      if (msg.type !== 'message') return false;
      return matchesFilter(msg.payload, filter);
    })
    .reverse();

  const rowVirtualizer = useVirtualizer({
    count: displayMessages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  const renderMessage = (message: EventEnvelope) => {
    if (message.type !== 'message') return null;
    
    return (
      <MessageItem 
        msg={message.payload}
        height={ROW_HEIGHT}
        onClick={() => onMessageClick?.(message.payload)}
      />
    );
  };

  return (
    <div className="space-y-2">
      {isUnfiltered(filter) || (
        <div className="flex items-center justify-between px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm">
          <span>
            Showing {displayMessages.length} of {messages.length} messages
          </span>
          {displayMessages.length !== messages.length && (
            <span className="text-xs">
              {messages.length - displayMessages.length} hidden
            </span>
          )}
        </div>
      )}
      
      <div 
        ref={parentRef}
        className={`h-[600px] overflow-auto bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}
      >
        {displayMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            {isUnfiltered(filter)
              ? `No messages to display`
              : `No messages match the filter criteria`}
          </div>
        ) : (
          <div
            className="relative w-full"
            style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const message = displayMessages[virtualRow.index];
              return (
                <div
                  key={virtualRow.key}
                  ref={rowVirtualizer.measureElement}
                  className="absolute w-full border-b dark:border-gray-700 last:border-b-0"
                  style={{
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {renderMessage(message)}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
} 