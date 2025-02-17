import { CopyButton } from './CopyButton';

interface HeaderPillProps {
  value: string;
}

export function HeaderPill({ value }: HeaderPillProps) {
  return (
    <div className="group relative inline-flex items-center">
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
        {value}
      </span>
      <CopyButton 
        value={value}
        className="ml-1 opacity-0 group-hover:opacity-100"
      />
    </div>
  );
} 