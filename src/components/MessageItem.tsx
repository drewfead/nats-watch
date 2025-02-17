import { NatsMessage, JetStreamMessage } from '@/types/nats';
import { BoltIcon, InboxIcon } from '@heroicons/react/24/outline';

interface MessageItemProps {
  msg: NatsMessage | JetStreamMessage;
  height?: number;
  onClick?: () => void;
}

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
};

const formatSize = (data: string) => {
  const bytes = new TextEncoder().encode(data).length;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function MessageItem({ msg, height = 32, onClick }: MessageItemProps) {
  const isJetStreamMessage = 'stream' in msg;
  
  return (
    <div 
      className="px-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer flex items-center gap-3"
      style={{ height: `${height}px` }}
      onClick={onClick}
    >
      {/* Message Type Icon */}
      <div className="flex-none w-5">
        {isJetStreamMessage ? (
          <BoltIcon className="w-4 h-4 text-blue-500" title="JetStream Message" />
        ) : (
          <InboxIcon className="w-4 h-4 text-gray-400" title="Core NATS Message" />
        )}
      </div>

      {/* Subject (with sequence for JetStream) */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-gray-900 dark:text-white truncate">
            {msg.subject}
          </span>
          {isJetStreamMessage && (
            <span className="flex-none text-xs text-gray-500 dark:text-gray-400">
              #{msg.seq}
            </span>
          )}
        </div>
      </div>

      {/* Timestamp */}
      <div className="flex-none text-xs text-gray-500 dark:text-gray-400 w-20 text-right">
        {formatTimestamp(msg.timestamp)}
      </div>

      {/* Size */}
      <div className="flex-none text-xs text-gray-500 dark:text-gray-400 w-16 text-right">
        {formatSize(msg.payload)}
      </div>
    </div>
  );
} 
