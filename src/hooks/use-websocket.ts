"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseWebSocketReturn {
  prices: Map<string, number>;
  isConnected: boolean;
  error: string | null;
}

const RECONNECT_BASE_DELAY = 1000;
const RECONNECT_MAX_DELAY = 30_000;

export function useWebSocket(symbols: string[]): UseWebSocketReturn {
  const [prices, setPrices] = useState<Map<string, number>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const symbolsRef = useRef(symbols);
  symbolsRef.current = symbols;

  const subscribe = useCallback((ws: WebSocket, syms: string[]) => {
    if (ws.readyState === WebSocket.OPEN && syms.length > 0) {
      ws.send(JSON.stringify({ type: "subscribe", symbols: syms }));
    }
  }, []);

  const unsubscribe = useCallback((ws: WebSocket, syms: string[]) => {
    if (ws.readyState === WebSocket.OPEN && syms.length > 0) {
      ws.send(JSON.stringify({ type: "unsubscribe", symbols: syms }));
    }
  }, []);

  const connect = useCallback(
    (token: string) => {
      if (wsRef.current) {
        wsRef.current.close();
      }

      const ws = new WebSocket(`wss://ws.finnhub.io?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttemptRef.current = 0;
        subscribe(ws, symbolsRef.current);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "trade" && Array.isArray(data.data)) {
          setPrices((prev) => {
            const next = new Map(prev);
            for (const trade of data.data) {
              next.set(trade.s, trade.p);
            }
            return next;
          });
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Exponential backoff reconnect
        const delay = Math.min(
          RECONNECT_BASE_DELAY * 2 ** reconnectAttemptRef.current,
          RECONNECT_MAX_DELAY,
        );
        reconnectAttemptRef.current += 1;
        reconnectTimerRef.current = setTimeout(() => connect(token), delay);
      };

      ws.onerror = () => {
        setError("WebSocket connection error");
      };
    },
    [subscribe],
  );

  // Fetch token and establish connection
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const res = await fetch("/api/ws-token");
        if (!res.ok) throw new Error("Failed to get WebSocket token");
        const { token } = await res.json();
        if (!cancelled) {
          connect(token);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Connection failed");
        }
      }
    }

    if (symbols.length > 0) {
      init();
    }

    return () => {
      cancelled = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect, symbols.length]);

  // Handle symbol changes on an existing connection
  const prevSymbolsRef = useRef<string[]>([]);
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const prev = new Set(prevSymbolsRef.current);
    const curr = new Set(symbols);

    const toSubscribe = symbols.filter((s) => !prev.has(s));
    const toUnsubscribe = prevSymbolsRef.current.filter((s) => !curr.has(s));

    if (toUnsubscribe.length > 0) unsubscribe(ws, toUnsubscribe);
    if (toSubscribe.length > 0) subscribe(ws, toSubscribe);

    prevSymbolsRef.current = symbols;
  }, [symbols, subscribe, unsubscribe]);

  return { prices, isConnected, error };
}
