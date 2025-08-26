import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import jwt from 'jsonwebtoken';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  username?: string;
  isAuthenticated?: boolean;
  isAlive?: boolean;
}

interface SlotUpdate {
  type: 'slot_update';
  duration: '24h' | '7d' | '30d';
  currentSlot: number;
  timeRemaining: number;
  nextSlotStart: number;
}

interface SentimentUpdate {
  type: 'sentiment_update';
  assetSymbol: string;
  duration: '24h' | '7d' | '30d';
  data: any;
}

interface PredictionUpdate {
  type: 'prediction_update';
  assetSymbol: string;
  duration: '24h' | '7d' | '30d';
  slotNumber: number;
  upCount: number;
  downCount: number;
}

type WebSocketMessage = SlotUpdate | SentimentUpdate | PredictionUpdate;

class WebSocketService {
  private wss: WebSocketServer;
  private clients: Map<string, AuthenticatedWebSocket> = new Map();
  private slotTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server });
    this.setupWebSocketServer();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: AuthenticatedWebSocket, req) => {
      console.log('WebSocket client connected');

      // Set up ping/pong to keep connection alive
      ws.isAlive = true;
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Authenticate the connection
      this.authenticateConnection(ws, req);

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message);
          this.handleMessage(ws, data);
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      });

      ws.on('close', (code, reason) => {
        console.log(`WebSocket client disconnected: ${code} - ${reason}`);
        this.removeClient(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.removeClient(ws);
      });
    });

    // Set up heartbeat to detect stale connections
    const heartbeat = setInterval(() => {
      this.wss.clients.forEach((ws: any) => {
        if (ws.isAlive === false) {
          console.log('Terminating stale WebSocket connection');
          return ws.terminate();
        }
        
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // Check every 30 seconds

    this.wss.on('close', () => {
      clearInterval(heartbeat);
    });
  }

  private authenticateConnection(ws: AuthenticatedWebSocket, req: any) {
    const token = req.url?.split('token=')[1];
    
    if (!token) {
      ws.close(1008, 'Authentication required');
      return;
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      ws.userId = decoded.userId;
      ws.username = decoded.email;
      ws.isAuthenticated = true;
      
      // Store client
      this.clients.set(ws.userId, ws);
      
      console.log(`WebSocket authenticated for user: ${ws.username}`);
    } catch (error) {
      console.error('WebSocket authentication failed:', error);
      ws.close(1008, 'Authentication failed');
    }
  }

  private handleMessage(ws: AuthenticatedWebSocket, message: any) {
    if (!ws.isAuthenticated) {
      return;
    }

    switch (message.type) {
      case 'subscribe_slot_updates':
        this.subscribeToSlotUpdates(ws, message.duration);
        break;
      case 'subscribe_sentiment':
        this.subscribeToSentimentUpdates(ws, message.assetSymbol, message.duration);
        break;
      case 'unsubscribe':
        this.unsubscribeFromUpdates(ws);
        break;
      default:
        console.log('Unknown WebSocket message type:', message.type);
    }
  }

  private subscribeToSlotUpdates(ws: AuthenticatedWebSocket, duration: '24h' | '7d' | '30d') {
    const timerKey = `${ws.userId}_${duration}`;
    
    // Clear existing timer
    if (this.slotTimers.has(timerKey)) {
      clearInterval(this.slotTimers.get(timerKey)!);
    }

    // Send initial slot info
    this.sendSlotUpdate(ws, duration);

    // Set up periodic updates
    const timer = setInterval(() => {
      this.sendSlotUpdate(ws, duration);
    }, 1000); // Update every second

    this.slotTimers.set(timerKey, timer);
  }

  private sendSlotUpdate(ws: AuthenticatedWebSocket, duration: '24h' | '7d' | '30d') {
    const now = new Date();
    const currentSlot = this.getCurrentSlot(duration);
    const slotTimes = this.getSlotTimes(duration, currentSlot);
    const timeRemaining = slotTimes.end.getTime() - now.getTime();
    const nextSlotStart = slotTimes.end.getTime();

    const update: SlotUpdate = {
      type: 'slot_update',
      duration,
      currentSlot,
      timeRemaining: Math.max(0, timeRemaining),
      nextSlotStart,
    };

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(update));
    }
  }

  private getCurrentSlot(duration: '24h' | '7d' | '30d'): number {
    // For development, always return slot 1
    if (process.env.NODE_ENV === 'development' || process.env.ALLOW_ALL_PREDICTIONS === 'true') {
      return 1;
    }
    
    const now = new Date();
    
    if (duration === '24h') {
      const hour = now.getHours();
      const minute = now.getMinutes();
      const totalMinutes = hour * 60 + minute;
      return Math.floor(totalMinutes / 180) + 1;
    } else if (duration === '7d') {
      return now.getDay() + 1;
    } else if (duration === '30d') {
      const dayOfMonth = now.getDate();
      return Math.ceil(dayOfMonth / 7);
    }
    
    return 1;
  }

  private getSlotTimes(duration: '24h' | '7d' | '30d', slotNumber: number): { start: Date; end: Date } {
    const now = new Date();
    
    if (duration === '24h') {
      const startHour = (slotNumber - 1) * 3;
      const endHour = startHour + 3;
      
      const start = new Date(now);
      start.setHours(startHour, 0, 0, 0);
      
      const end = new Date(now);
      end.setHours(endHour, 0, 0, 0);
      
      return { start, end };
    }
    
    // Default fallback
    return { start: now, end: new Date(now.getTime() + 3 * 60 * 60 * 1000) };
  }

  private subscribeToSentimentUpdates(ws: AuthenticatedWebSocket, assetSymbol: string, duration: '24h' | '7d' | '30d') {
    // This would be implemented to send real-time sentiment updates
    // For now, we'll just acknowledge the subscription
    console.log(`User ${ws.username} subscribed to sentiment updates for ${assetSymbol} (${duration})`);
  }

  private unsubscribeFromUpdates(ws: AuthenticatedWebSocket) {
    // Clear all timers for this user
    for (const [key, timer] of this.slotTimers.entries()) {
      if (key.startsWith(ws.userId!)) {
        clearInterval(timer);
        this.slotTimers.delete(key);
      }
    }
  }

  private removeClient(ws: AuthenticatedWebSocket) {
    if (ws.userId) {
      this.clients.delete(ws.userId);
      this.unsubscribeFromUpdates(ws);
    }
  }

  // Broadcast sentiment update to all connected clients
  public broadcastSentimentUpdate(assetSymbol: string, duration: string, data: any): void {
    const message: SentimentUpdate = {
      type: 'sentiment_update',
      assetSymbol,
      duration: duration as any,
      data
    };

    this.broadcastMessage(message);
    console.log(`Broadcasting sentiment update for ${assetSymbol} (${duration})`);
  }

  // Broadcast prediction update to all connected clients
  public broadcastPredictionUpdate(assetSymbol: string, duration: string, slotNumber: number, upCount: number, downCount: number): void {
    const message: PredictionUpdate = {
      type: 'prediction_update',
      assetSymbol,
      duration: duration as any,
      slotNumber,
      upCount,
      downCount
    };

    this.broadcastMessage(message);
    console.log(`Broadcasting prediction update for ${assetSymbol} (${duration}) slot ${slotNumber}`);
  }

  // Broadcast slot update to all connected clients
  public broadcastSlotUpdate(duration: string, currentSlot: number, timeRemaining: number, nextSlotStart: number): void {
    const message: SlotUpdate = {
      type: 'slot_update',
      duration: duration as any,
      currentSlot,
      timeRemaining,
      nextSlotStart
    };

    this.broadcastMessage(message);
    console.log(`Broadcasting slot update for ${duration}`);
  }

  // Generic message broadcasting
  private broadcastMessage(message: WebSocketMessage): void {
    const messageStr = JSON.stringify(message);
    
    this.wss.clients.forEach((client: any) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(messageStr);
        } catch (error) {
          console.error('Error sending WebSocket message:', error);
        }
      }
    });
  }

  // Get connected clients count
  public getConnectedClientsCount(): number {
    return this.wss.clients.size;
  }

  // Get client info for debugging
  public getClientInfo(): Array<{ userId?: string; username?: string; isAuthenticated: boolean }> {
    return Array.from(this.clients.values()).map(client => ({
      userId: client.userId,
      username: client.username,
      isAuthenticated: client.isAuthenticated || false
    }));
  }
}

export default WebSocketService; 