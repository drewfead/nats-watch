import { useState } from 'react';
import { ClipboardIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';

interface CopyButtonProps {
  value: string;
  className?: string;
  iconClassName?: string;
  showBackground?: boolean;
}

export function CopyButton({ 
  value, 
  className = '', 
  iconClassName = 'w-4 h-4',
  showBackground = true,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const [showCopied, setShowCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setShowCopied(true);
      // Keep the green success state a bit longer than the icon
      setTimeout(() => setCopied(false), 2000);
      // Fade out the success icon
      setTimeout(() => setShowCopied(false), 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={copyToClipboard}
      className={`
        p-1 rounded-full 
        ${showBackground ? (
          copied 
            ? 'bg-green-50 dark:bg-green-900/30' 
            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
        ) : ''}
        transition-all duration-300 ease-in-out
        ${className}
      `}
      title="Copy to clipboard"
    >
      <div className={`relative ${iconClassName}`}>
        <ClipboardIcon 
          className={`
            absolute inset-0
            ${showBackground 
              ? 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              : 'text-current'
            }
            transition-all duration-300
            ${showCopied ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}
          `}
        />
        <ClipboardDocumentCheckIcon 
          className={`
            absolute inset-0
            text-green-500
            transition-all duration-300
            ${showCopied ? 'opacity-100 scale-100' : 'opacity-0 scale-125'}
          `}
        />
      </div>
    </button>
  );
} 