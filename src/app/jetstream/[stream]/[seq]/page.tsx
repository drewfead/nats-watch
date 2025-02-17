import { getStreamMessage } from '@/app/actions';
import { MessageDetail } from '@/components/MessageDetail';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

type Params = Promise<{ stream: string; seq: string }>;

export default async function MessagePage({
  params,
}: {
  params: Params;
}) {
  const { stream, seq } = await params;

  const result = await getStreamMessage(
    stream,
    parseInt(seq, 10)
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-8">
          <Link 
            href="/jetstream" 
            className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            JetStream
          </Link>
        </div>

        {result.success ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              {result.message && (
                <MessageDetail 
                    message={result.message}
                    embedded={true}
                />
              )}
          </div>
        ) : (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <h2 className="text-lg font-medium text-red-800 dark:text-red-400">
              Error Loading Message
            </h2>
            <p className="mt-1 text-sm text-red-700 dark:text-red-300">
              {result.error}
            </p>
            <p className="mt-4">
              <Link 
                href="/subscribe"
                className="text-red-700 dark:text-red-300 hover:text-red-800 dark:hover:text-red-200 underline"
              >
                Return to Stream Viewer
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 