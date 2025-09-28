// Global event emitter for menu updates
class MenuEventEmitter {
  private clients = new Map<string, WritableStreamDefaultWriter>();

  addClient(clientId: string, writer: WritableStreamDefaultWriter) {
    this.clients.set(clientId, writer);
  }

  removeClient(clientId: string) {
    this.clients.delete(clientId);
  }

  async broadcastMenuUpdate(boothId: string, eventType: 'menu-updated' | 'menu-added' | 'menu-removed', data: any) {
    const message = JSON.stringify({
      type: eventType,
      boothId,
      data,
      timestamp: new Date().toISOString()
    });

    const clientsToRemove: string[] = [];

    for (const [clientId, writer] of this.clients) {
      try {
        await writer.write(`data: ${message}\n\n`);
      } catch (error) {
        console.error('Error sending SSE message to client:', clientId, error);
        clientsToRemove.push(clientId);
      }
    }

    // Remove failed clients
    for (const clientId of clientsToRemove) {
      this.clients.delete(clientId);
    }
  }
}

export const menuEmitter = new MenuEventEmitter();