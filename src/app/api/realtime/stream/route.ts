import { NextRequest } from 'next/server';
import { verifyToken } from '@/utils/auth';
import { RealtimeBroadcaster } from '@/utils/realtime';

export const runtime = 'nodejs'; // Use Node.js runtime for streaming

export async function GET(request: NextRequest) {
  // Verify authentication
  const token = request.cookies.get('auth-token')?.value;
  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload || !payload.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const brandId = searchParams.get('brandId');
  const boothId = searchParams.get('boothId');

  // Verify user has access to the requested brand/booth
  if (brandId !== payload.user.brandId) {
    return new Response('Forbidden', { status: 403 });
  }

  if (payload.user.role === 'staff' && boothId !== payload.user.boothId) {
    return new Response('Forbidden', { status: 403 });
  }

  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial connection message
      const initMessage = encoder.encode('data: {"type":"connected","timestamp":' + Date.now() + '}\n\n');
      controller.enqueue(initMessage);

      // Create writer for this client
      const writer = controller;
      const clientId = boothId || brandId || payload.user.brandId;

      // Add client to broadcaster
      const broadcaster = RealtimeBroadcaster.getInstance();
      const writerProxy = {
        write: async (data: Uint8Array) => {
          try {
            controller.enqueue(data);
          } catch (error) {
            console.error('Error enqueuing data:', error);
            throw error;
          }
        }
      };

      broadcaster.addClient(clientId, writerProxy as any);

      // Keep connection alive with heartbeat
      const heartbeat = setInterval(() => {
        try {
          const heartbeatMessage = encoder.encode('data: {"type":"heartbeat","timestamp":' + Date.now() + '}\n\n');
          controller.enqueue(heartbeatMessage);
        } catch (error) {
          clearInterval(heartbeat);
          broadcaster.removeClient(clientId, writerProxy as any);
        }
      }, 30000); // Every 30 seconds

      // Handle client disconnect
      request.signal?.addEventListener('abort', () => {
        clearInterval(heartbeat);
        broadcaster.removeClient(clientId, writerProxy as any);
        try {
          controller.close();
        } catch (error) {
          // Ignore close errors
        }
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}