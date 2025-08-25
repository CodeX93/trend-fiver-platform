import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './use-auth';

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

interface UseWebSocketOptions {
  onSlotUpdate?: (update: SlotUpdate) => void;
  onSentimentUpdate?: (update: SentimentUpdate) => void;
  onPredictionUpdate?: (update: PredictionUpdate) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const isConnectingRef = useRef(false);

  const connect = useCallback(() => {
    if (!user || isConnectingRef.current) return;

    const token = localStorage.getItem('authToken');
    if (!token) return;

    isConnectingRef.current = true;

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      // Create WebSocket connection with proper URL construction
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}?token=${encodeURIComponent(token)}`;
      
      console.log('Attempting WebSocket connection to:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      // Set connection timeout
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          console.log('WebSocket connection timeout');
          ws.close();
          isConnectingRef.current = false;
        }
      }, 10000); // 10 second timeout

      ws.onopen = () => {
        console.log('WebSocket connected successfully');
        clearTimeout(connectionTimeout);
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
        isConnectingRef.current = false;
        options.onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case 'slot_update':
              options.onSlotUpdate?.(message);
              break;
            case 'sentiment_update':
              options.onSentimentUpdate?.(message);
              break;
            case 'prediction_update':
              options.onPredictionUpdate?.(message);
              break;
            default:
              console.log('Unknown WebSocket message type:', message.type);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        clearTimeout(connectionTimeout);
        setIsConnected(false);
        isConnectingRef.current = false;
        options.onDisconnect?.();

        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        clearTimeout(connectionTimeout);
        setError('WebSocket connection error');
        isConnectingRef.current = false;
        options.onError?.(event);
        
        // Don't treat WebSocket errors as fatal - they're often temporary
        // The onclose handler will handle reconnection
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      isConnectingRef.current = false;
      setError('Failed to create WebSocket connection');
    }
  }, [user, options, maxReconnectAttempts]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'User initiated disconnect');
      wsRef.current = null;
    }
    
    setIsConnected(false);
    isConnectingRef.current = false;
  }, []);

  const subscribeToSlotUpdates = useCallback((duration: '24h' | '7d' | '30d') => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe_slot_updates',
        duration,
      }));
    }
  }, []);

  const subscribeToSentimentUpdates = useCallback((assetSymbol: string, duration: '24h' | '7d' | '30d') => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe_sentiment',
        assetSymbol,
        duration,
      }));
    }
  }, []);

  const unsubscribe = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe',
      }));
    }
  }, []);

  // Connect when user is authenticated
  useEffect(() => {
    if (user) {
      // Small delay to ensure auth state is stable
      const timer = setTimeout(() => {
        connect();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [user, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    error,
    subscribeToSlotUpdates,
    subscribeToSentimentUpdates,
    unsubscribe,
    connect,
    disconnect,
  };
} 