import { NextRequest } from 'next/server';
import { coreSubscribe, jetStreamSubscribe } from '@/lib/nats';
import { EventEnvelope, ConnectionStatusEvent, HeartbeatEvent, CoreMessage, JetStreamMessage } from '@/types/nats';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SUBSCRIPTION_TIMEOUT = 5 * 60 * 1000;
const HEARTBEAT_INTERVAL = 15 * 1000;

function sendEvent(controller: ReadableStreamDefaultController, envelope: EventEnvelope) {
  const encoder = new TextEncoder();
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(envelope)}\n\n`));
}

// Helper function to create timeout that can be reset
function createTimeout(callback: () => void, delay: number): { 
  id: NodeJS.Timeout; 
  reset: () => void;
  clear: () => void;
} {
  let timeoutId: NodeJS.Timeout;
  
  const reset = () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(callback, delay);
  };

  const clear = () => {
    clearTimeout(timeoutId);
  };

  timeoutId = setTimeout(callback, delay);

  return { id: timeoutId, reset, clear };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const subject = searchParams.get('subject');
  const streamParam = searchParams.get('stream');

  if (!subject) {
    return new Response('Subject is required', { status: 400 });
  }

  const responseStream = new ReadableStream({
    async start(controller) {
      try {
        // Create either a JetStream or core NATS subscription
        const subscription = streamParam 
          ? await jetStreamSubscribe(streamParam, subject, (msg: JetStreamMessage) => {
              sendEvent(controller, {
                type: 'message',
                payload: msg
              });
            })
          : await coreSubscribe(subject, (msg: CoreMessage) => {
              sendEvent(controller, {
                type: 'message',
                payload: msg
              });
            });

        // Handle client disconnect
        request.signal.addEventListener('abort', () => {
          console.log(`Client disconnected from ${subject} subscription`);
          subscription.stop();
        });

        // Set up timeout to automatically unsubscribe
        const timeout = createTimeout(() => {
          console.log(`Subscription to ${subject} timed out after ${SUBSCRIPTION_TIMEOUT}ms`);
          subscription.stop();
          
          // Send disconnect event before closing
          const disconnectEvent: ConnectionStatusEvent = {
            type: 'connection_status',
            status: 'disconnected',
            subject,
            stream: streamParam || undefined,
            timestamp: new Date().toISOString(),
            message: 'Subscription timed out'
          };
          
          sendEvent(controller, {
            type: 'control',
            payload: disconnectEvent
          });
          
          controller.close();
        }, SUBSCRIPTION_TIMEOUT);

        // Clean up timeout if client disconnects
        request.signal.addEventListener('abort', () => {
          timeout.clear();
        });

        // Send initial connection status
        const connectEvent: ConnectionStatusEvent = {
          type: 'connection_status',
          status: 'connected',
          subject,
          stream: streamParam || undefined,
          timestamp: new Date().toISOString(),
          message: streamParam 
            ? `Connected to JetStream ${streamParam} on subject ${subject}`
            : `Connected to NATS on subject ${subject}`
        };

        sendEvent(controller, {
          type: 'control',
          payload: connectEvent
        });

        // Send periodic heartbeat
        const heartbeatId = setInterval(() => {
          try {
            const heartbeatEvent: HeartbeatEvent = {
              type: 'heartbeat',
              timestamp: new Date().toISOString()
            };

            sendEvent(controller, {
              type: 'control',
              payload: heartbeatEvent
            });
            
            // Reset the timeout on successful heartbeat
            timeout.reset();
          } catch (error) {
            // If we can't send a heartbeat, the connection is probably dead
            console.error('Failed to send heartbeat:', error);
            clearInterval(heartbeatId);
            timeout.clear();
            subscription.stop();
            controller.close();
          }
        }, HEARTBEAT_INTERVAL);

        // Clean up heartbeat interval on disconnect
        request.signal.addEventListener('abort', () => {
          clearInterval(heartbeatId);
        });

      } catch (error) {
        console.error('Subscription error:', error);
        
        // Send error status before failing
        const errorEvent: ConnectionStatusEvent = {
          type: 'connection_status',
          status: 'error',
          subject,
          stream: streamParam || undefined,
          timestamp: new Date().toISOString(),
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        };

        sendEvent(controller, {
          type: 'control',
          payload: errorEvent
        });

        controller.error(error);
      }
    },
  });

  return new Response(responseStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
} 
