import { useEffect, useRef } from "react";
import { wsUrl } from "../api";

const RECONNECT_DELAY_MS = 2000;

export function useWebSocket(onMessage) {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    let socket;
    let reconnectTimer;
    let closedByCleanup = false;

    function connect() {
      socket = new WebSocket(wsUrl());

      socket.onmessage = (event) => {
        try {
          onMessageRef.current(JSON.parse(event.data));
        } catch (err) {
          console.error("Invalid WS message", err);
        }
      };

      socket.onclose = () => {
        if (!closedByCleanup) {
          reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
        }
      };

      socket.onerror = () => socket.close();
    }

    connect();

    return () => {
      closedByCleanup = true;
      clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, []);
}
