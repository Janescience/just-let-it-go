import { NextRequest } from 'next/server';
import { verifyToken } from '@/utils/auth';
import { menuEmitter } from '@/utils/menuEmitter';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload || !payload.user) {
    return new Response('Invalid token', { status: 401 });
  }

  // For staff users, only allow access if they have a boothId
  if (payload.user.role === 'staff' && !payload.user.boothId) {
    return new Response('Forbidden', { status: 403 });
  }

  const clientId = `${payload.user.id}-${Date.now()}`;

  // Create a ReadableStream for Server-Sent Events
  let keepAliveInterval: NodeJS.Timeout;
  let isClosed = false;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Add client to event emitter
      const writerProxy = {
        write: async (data: string) => {
          if (isClosed) return;
          try {
            controller.enqueue(encoder.encode(data));
          } catch (error) {
            console.error('Error writing to stream:', error);
            isClosed = true;
            menuEmitter.removeClient(clientId);
          }
        }
      };

      menuEmitter.addClient(clientId, writerProxy as any);

      // Send initial connection message
      writerProxy.write(`data: ${JSON.stringify({
        type: 'connected',
        clientId,
        timestamp: new Date().toISOString()
      })}\n\n`);

      // Keep alive ping every 30 seconds
      keepAliveInterval = setInterval(() => {
        if (isClosed) {
          clearInterval(keepAliveInterval);
          return;
        }
        try {
          writerProxy.write(`: keepalive ${Date.now()}\n\n`);
        } catch (error) {
          clearInterval(keepAliveInterval);
          isClosed = true;
          menuEmitter.removeClient(clientId);
        }
      }, 30000);
    },
    cancel() {
      isClosed = true;
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
      }
      menuEmitter.removeClient(clientId);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
}