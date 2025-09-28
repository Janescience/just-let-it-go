// Real-time data synchronization using Server-Sent Events (SSE)
import React from 'react';

export type RealtimeEventType =
  | 'stock_update'
  | 'new_sale'
  | 'order_status_change'
  | 'low_stock_alert'
  | 'booth_status_change';

export interface RealtimeEvent {
  id: string;
  type: RealtimeEventType;
  data: any;
  timestamp: number;
  brandId: string;
  boothId?: string;
}

// Client-side EventSource manager
export class RealtimeClient {
  private eventSource: EventSource | null = null;
  private listeners: Map<RealtimeEventType, Array<(data: any) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second

  constructor(private brandId: string, private boothId?: string) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.eventSource) {
        this.disconnect();
      }

      const params = new URLSearchParams({
        brandId: this.brandId,
        ...(this.boothId && { boothId: this.boothId })
      });

      this.eventSource = new EventSource(`/api/realtime/stream?${params}`);

      this.eventSource.onopen = () => {
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        resolve();
      };

      this.eventSource.onmessage = (event) => {
        try {
          const realtimeEvent: RealtimeEvent = JSON.parse(event.data);
          this.handleEvent(realtimeEvent);
        } catch (error) {
          console.error('Error parsing real-time event:', error, 'Raw data:', event.data);
        }
      };

      this.eventSource.onerror = (error) => {
        if (this.eventSource?.readyState === EventSource.CLOSED) {
          this.handleReconnect();
        }

        if (this.reconnectAttempts === 0) {
          reject(error);
        }
      };
    });
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    setTimeout(() => {
      this.connect().catch(() => {});
    }, delay);
  }

  private handleEvent(event: RealtimeEvent): void {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event.data);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  on(eventType: RealtimeEventType, listener: (data: any) => void): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(listener);
  }

  off(eventType: RealtimeEventType, listener: (data: any) => void): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }
}

// Use globalThis to persist across module reloads in dev mode
declare global {
  var realtimeBroadcaster: RealtimeBroadcaster | undefined;
}

// Server-side event broadcaster
export class RealtimeBroadcaster {
  private clients: Map<string, Set<WritableStreamDefaultWriter>> = new Map();

  static getInstance(): RealtimeBroadcaster {
    if (!globalThis.realtimeBroadcaster) {
      globalThis.realtimeBroadcaster = new RealtimeBroadcaster();
    }
    return globalThis.realtimeBroadcaster;
  }

  addClient(clientId: string, writer: WritableStreamDefaultWriter): void {
    if (!this.clients.has(clientId)) {
      this.clients.set(clientId, new Set());
    }
    this.clients.get(clientId)!.add(writer);
  }

  removeClient(clientId: string, writer: WritableStreamDefaultWriter): void {
    const clientWriters = this.clients.get(clientId);
    if (clientWriters) {
      clientWriters.delete(writer);
      if (clientWriters.size === 0) {
        this.clients.delete(clientId);
      }
    }
  }

  broadcast(event: RealtimeEvent): void {
    const message = `data: ${JSON.stringify(event)}\n\n`;
    const encoder = new TextEncoder();
    const data = encoder.encode(message);

    // Broadcast to all clients of the same brand
    // Try both boothId and brandId as client identifiers
    const targetClients = [
      event.boothId,
      event.brandId
    ].filter((id): id is string => Boolean(id));

    targetClients.forEach(clientId => {
      const writers = this.clients.get(clientId);
      if (writers) {
        const deadWriters: WritableStreamDefaultWriter[] = [];

        writers.forEach(async (writer) => {
          try {
            await writer.write(data);
          } catch (error) {
            deadWriters.push(writer);
          }
        });

        // Remove dead connections
        deadWriters.forEach(writer => {
          this.removeClient(clientId, writer);
        });
      }
    });
  }

  broadcastToAll(event: RealtimeEvent): void {
    this.clients.forEach((writers, clientId) => {
      if (clientId.includes(event.brandId)) {
        const message = `data: ${JSON.stringify(event)}\n\n`;
        const encoder = new TextEncoder();
        const data = encoder.encode(message);

        const deadWriters: WritableStreamDefaultWriter[] = [];

        writers.forEach(async (writer) => {
          try {
            await writer.write(data);
          } catch (error) {
            console.error('Error writing to client:', error);
            deadWriters.push(writer);
          }
        });

        deadWriters.forEach(writer => {
          this.removeClient(clientId, writer);
        });
      }
    });
  }

  private getTotalClients(): number {
    let total = 0;
    this.clients.forEach(writers => {
      total += writers.size;
    });
    return total;
  }
}

// Event creation helpers
export function createStockUpdateEvent(
  brandId: string,
  ingredientId: string,
  newStock: number,
  oldStock: number
): RealtimeEvent {
  return {
    id: `stock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'stock_update',
    data: {
      ingredientId,
      newStock,
      oldStock,
      change: newStock - oldStock
    },
    timestamp: Date.now(),
    brandId
  };
}

export function createNewSaleEvent(
  brandId: string,
  boothId: string,
  saleData: any
): RealtimeEvent {
  return {
    id: `sale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'new_sale',
    data: saleData,
    timestamp: Date.now(),
    brandId,
    boothId
  };
}

export function createLowStockAlert(
  brandId: string,
  ingredientName: string,
  currentStock: number,
  minimumStock: number
): RealtimeEvent {
  return {
    id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'low_stock_alert',
    data: {
      ingredientName,
      currentStock,
      minimumStock,
      severity: currentStock === 0 ? 'critical' : 'warning'
    },
    timestamp: Date.now(),
    brandId
  };
}

// React hook for real-time data
export function useRealtime(brandId: string, boothId?: string) {
  const [client, setClient] = React.useState<RealtimeClient | null>(null);
  const [connected, setConnected] = React.useState(false);
  const [events, setEvents] = React.useState<RealtimeEvent[]>([]);

  React.useEffect(() => {
    if (!brandId) return;

    const realtimeClient = new RealtimeClient(brandId, boothId);

    realtimeClient.connect()
      .then(() => {
        setConnected(true);
        setClient(realtimeClient);
      })
      .catch(error => {
        console.error('Failed to connect to real-time service:', error);
      });

    return () => {
      realtimeClient.disconnect();
      setConnected(false);
      setClient(null);
    };
  }, [brandId, boothId]);

  const subscribe = React.useCallback((
    eventType: RealtimeEventType,
    listener: (data: any) => void
  ) => {
    if (client) {
      client.on(eventType, listener);
    }
  }, [client]);

  const unsubscribe = React.useCallback((
    eventType: RealtimeEventType,
    listener: (data: any) => void
  ) => {
    if (client) {
      client.off(eventType, listener);
    }
  }, [client]);

  return {
    connected,
    subscribe,
    unsubscribe,
    events
  };
}