'use server'

import { closeNatsConnection, getJetStreamMessage, listStreams } from '@/lib/nats';

export async function getStreamMessage(stream: string, seq: number) {
  try {
    const message = await getJetStreamMessage(stream, seq);
    return { success: true, message };
  } catch (error) {
    console.error('Error fetching stream message:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch message' 
    };
  }
} 

export async function getStreams() {
  try {
    const streams = await listStreams();
    return { success: true, streams };
  } catch (error) {
    console.error('Error fetching streams:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch streams' 
    };
  }
}

export async function cleanup() {
  try {
    await closeNatsConnection();
    return { success: true };
  } catch (error) {
    console.error('Error closing NATS connection:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}